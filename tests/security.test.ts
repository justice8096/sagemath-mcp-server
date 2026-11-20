import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import {
  buildSageInvocation,
  executeSage,
  getSageStatus,
  initSageExecutor,
  resolveExecutorConfig,
  type ExecutorConfig,
} from "../src/services/sage-executor.ts";
import {
  createHttpApp,
  extractApiKey,
  isAuthorized,
  resolveHttpConfig,
} from "../src/http.ts";
import { MAX_CODE_BYTES } from "../src/constants.ts";
import {
  DifferentiateSchema,
  PlotSchema,
  SolveEquationSchema,
} from "../src/schemas/common.ts";

const KEY = "test-key-0123456789abcdef";
const posixOnly = { skip: process.platform === "win32" };

// Inputs taken from the vulnerability reports. Each one executed a shell
// command on 1.0.1.
function shellPayloads(marker: string): string[] {
  return [
    `$(touch ${marker}_a)`,
    `\\"; touch ${marker}_b; #`,
    "`touch " + marker + "_c`",
    `"; touch ${marker}_d; echo "`,
    `1\ntouch ${marker}_e`,
    `1; touch ${marker}_f`,
    `$HOME && touch ${marker}_g | cat`,
  ];
}

const localConfig: ExecutorConfig = {
  mode: "local",
  sagePath: "/usr/bin/sage",
  dockerImage: "sagemath/sagemath:latest",
  dockerNetwork: "none",
  dockerMemory: "2g",
  dockerPidsLimit: 256,
  timeoutMs: 30000,
};
const dockerConfig: ExecutorConfig = {
  ...localConfig,
  mode: "docker",
  sagePath: undefined,
  dockerPath: "/usr/bin/docker",
};

describe("sage invocation (GHSA-2q55-r7q3-v3g3)", () => {
  it("passes the program as one unmodified argv element in local mode", () => {
    for (const payload of shellPayloads("/tmp/x")) {
      const code = `print(${payload})`;
      const inv = buildSageInvocation(localConfig, code);
      assert.equal(inv.command, "/usr/bin/sage");
      assert.deepEqual(inv.args, ["-c", code]);
    }
  });

  it("passes the program as the final argv element in docker mode", () => {
    for (const payload of shellPayloads("/tmp/x")) {
      const code = `print(${payload})`;
      const { args } = buildSageInvocation(dockerConfig, code);
      assert.equal(args[args.length - 1], code);
      assert.equal(args[args.length - 2], "-c");
      assert.equal(args[args.length - 3], "sagemath/sagemath:latest");
    }
  });

  it("bypasses the image entrypoint and confines the container", () => {
    const { args, containerName } = buildSageInvocation(dockerConfig, "print(1)");
    const flag = (name: string) => args[args.indexOf(name) + 1];
    assert.equal(flag("--entrypoint"), "sage");
    assert.equal(flag("--network"), "none");
    assert.equal(flag("--cap-drop"), "ALL");
    assert.equal(flag("--security-opt"), "no-new-privileges");
    assert.equal(flag("--memory"), "2g");
    assert.equal(flag("--pids-limit"), "256");
    assert.equal(flag("--name"), containerName);
    assert.ok(args.includes("--rm"));
  });

  it("rejects environment values that could become docker options", () => {
    const env = { PATH: "", SAGE_EXECUTION_MODE: "docker" };
    for (const bad of ["--privileged", "-v/:/host", "img;id", "a b"]) {
      assert.throws(() => resolveExecutorConfig({ ...env, SAGE_DOCKER_IMAGE: bad }), /SAGE_DOCKER_IMAGE/);
    }
    assert.throws(() => resolveExecutorConfig({ ...env, SAGE_DOCKER_NETWORK: "--net=host" }), /SAGE_DOCKER_NETWORK/);
    assert.throws(() => resolveExecutorConfig({ ...env, SAGE_DOCKER_MEMORY: "2g --privileged" }), /SAGE_DOCKER_MEMORY/);
    assert.throws(() => resolveExecutorConfig({ ...env, SAGE_EXECUTION_MODE: "shell" }), /SAGE_EXECUTION_MODE/);
  });
});

describe("execution mode selection", posixOnly, () => {
  let dir: string;
  const make = (name: string, body: string) =>
    fs.writeFileSync(path.join(dir, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sagemath-mcp-mode-"));
    fs.mkdirSync(path.join(dir, "both"));
    fs.mkdirSync(path.join(dir, "sage-only"));
    fs.mkdirSync(path.join(dir, "docker-down"));
    make("both/sage", "exit 0");
    make("both/docker", "exit 0");
    make("sage-only/sage", "exit 0");
    make("docker-down/sage", "exit 0");
    make("docker-down/docker", "exit 1");
  });

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("prefers Docker when both are installed", () => {
    const cfg = resolveExecutorConfig({ PATH: path.join(dir, "both") });
    assert.equal(cfg.mode, "docker");
  });

  it("uses local SageMath when Docker is absent", () => {
    const cfg = resolveExecutorConfig({ PATH: path.join(dir, "sage-only") });
    assert.equal(cfg.mode, "local");
  });

  it("honours an explicit mode and fails if it is unavailable", () => {
    const both = path.join(dir, "both");
    assert.equal(resolveExecutorConfig({ PATH: both, SAGE_EXECUTION_MODE: "local" }).mode, "local");
    assert.throws(() =>
      resolveExecutorConfig({ PATH: path.join(dir, "sage-only"), SAGE_EXECUTION_MODE: "docker" })
    );
  });

  it("falls back to local only when the Docker daemon does not answer", async () => {
    await initSageExecutor({ PATH: path.join(dir, "both") });
    assert.equal(getSageStatus().mode, "docker");
    await initSageExecutor({ PATH: path.join(dir, "docker-down") });
    assert.equal(getSageStatus().mode, "local");
    // An explicit docker setting never falls back.
    await initSageExecutor({ PATH: path.join(dir, "docker-down"), SAGE_EXECUTION_MODE: "docker" });
    assert.equal(getSageStatus().mode, "docker");
  });
});

describe("end to end with a stand-in sage binary", posixOnly, () => {
  let dir: string;
  let marker: string;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sagemath-mcp-test-"));
    marker = path.join(dir, "MARKER");
    // Prints each argument it receives; sleeps when asked, to test timeouts.
    fs.writeFileSync(
      path.join(dir, "sage"),
      '#!/bin/sh\ncase "$2" in *SLEEP_FOREVER*) sleep 30;; esac\nfor a in "$@"; do printf \'ARG<%s>\\n\' "$a"; done\n',
      { mode: 0o755 }
    );
    await initSageExecutor({
      PATH: `${dir}${path.delimiter}${process.env.PATH ?? ""}`,
      SAGE_EXECUTION_MODE: "local",
      SAGE_TIMEOUT: "1500",
    });
  });

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("delivers hostile input verbatim and runs nothing else", async () => {
    for (const payload of shellPayloads(marker)) {
      const code = `print(${payload})`;
      const output = await executeSage(code);
      assert.equal(output, `ARG<-c>\nARG<${code}>\n`);
    }
    const created = fs.readdirSync(dir).filter((f) => f.startsWith("MARKER"));
    assert.deepEqual(created, []);
  });

  it("rejects NUL bytes, empty input and oversized input", async () => {
    await assert.rejects(executeSage("print(1)\0"), /NUL/);
    await assert.rejects(executeSage("   "), /empty/);
    await assert.rejects(executeSage("1".repeat(MAX_CODE_BYTES + 1)), /longer than/);
    // The limit counts UTF-8 bytes: 40,000 three-byte characters is 120,000 bytes.
    await assert.rejects(executeSage("\u4e2d".repeat(40_000)), /longer than/);
    assert.match(await executeSage("\u4e2d".repeat(30_000)), /^ARG<-c>/);
  });

  it("kills the process on timeout", async () => {
    const started = Date.now();
    await assert.rejects(executeSage("SLEEP_FOREVER"), /timed out/);
    assert.ok(Date.now() - started < 10000);
  });
});

describe("HTTP transport fails closed (GHSA-rg88-jr3x-6547)", () => {
  it("refuses to start without an API key", () => {
    assert.throws(() => resolveHttpConfig({}), /requires API_KEY/);
    assert.throws(() => resolveHttpConfig({ API_KEY: "" }), /requires API_KEY/);
    assert.throws(() => resolveHttpConfig({ API_KEY: "   " }), /requires API_KEY/);
    assert.throws(() => resolveHttpConfig({ API_KEY: "short" }), /too short/);
    assert.throws(() => createHttpApp({ host: "127.0.0.1", port: 0, apiKey: "" }), /API key/);
  });

  it("binds to loopback unless HOST is set", () => {
    assert.equal(resolveHttpConfig({ API_KEY: KEY }).host, "127.0.0.1");
    assert.equal(resolveHttpConfig({ API_KEY: KEY, HOST: "0.0.0.0" }).host, "0.0.0.0");
    assert.equal(resolveHttpConfig({ API_KEY: KEY }).port, 3000);
  });

  it("compares keys exactly", () => {
    assert.equal(isAuthorized(KEY, KEY), true);
    assert.equal(isAuthorized(KEY + "x", KEY), false);
    assert.equal(isAuthorized(KEY.slice(0, -1), KEY), false);
    assert.equal(isAuthorized("", KEY), false);
    assert.equal(isAuthorized(null, KEY), false);
    assert.equal(extractApiKey({ headers: { authorization: `Bearer ${KEY}` } }), KEY);
    assert.equal(extractApiKey({ headers: { "x-api-key": KEY } }), KEY);
    assert.equal(extractApiKey({ headers: { authorization: "Basic abc" } }), null);
    assert.equal(extractApiKey({ headers: {} }), null);
  });

  describe("over a real socket", () => {
    let server: Server;
    let url: string;
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };

    before(async () => {
      const app = createHttpApp({ host: "127.0.0.1", port: 0, apiKey: KEY });
      await new Promise<void>((resolve) => {
        server = app.listen(0, "127.0.0.1", () => resolve());
      });
      url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    after(() => {
      server.closeAllConnections?.();
      server.close();
    });

    it("rejects calls with no key or a wrong key", async () => {
      const none = await fetch(`${url}/mcp`, { method: "POST", headers, body });
      assert.equal(none.status, 401);
      const wrong = await fetch(`${url}/mcp`, {
        method: "POST",
        headers: { ...headers, "X-API-Key": "wrong-key-0123456789abcdef" },
        body,
      });
      assert.equal(wrong.status, 401);
      assert.equal((await fetch(`${url}/status`)).status, 401);
    });

    it("serves the tool list to a caller with the key", async () => {
      for (const auth of [{ "X-API-Key": KEY }, { Authorization: `Bearer ${KEY}` }]) {
        const res = await fetch(`${url}/mcp`, { method: "POST", headers: { ...headers, ...auth }, body });
        assert.equal(res.status, 200);
        const json: any = await res.json();
        const tools = json.result.tools;
        assert.equal(tools.length, 10);
        const evaluate = tools.find((tool: any) => tool.name === "sage_evaluate");
        assert.equal(evaluate.annotations.readOnlyHint, false);
        for (const tool of tools) assert.ok(tool.description.length > 20, tool.name);
      }
    });

    it("keeps the health probe open but free of detail", async () => {
      const res = await fetch(`${url}/health`);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { status: "ok" });
    });
  });
});

describe("structured arguments", () => {
  it("accepts ordinary variable names", () => {
    assert.ok(SolveEquationSchema.safeParse({ equation: "x^2 == 4", variable: "x" }).success);
    assert.ok(SolveEquationSchema.safeParse({ equation: "x + y == 1", variable: "x, y", variables: "a b" }).success);
    assert.ok(DifferentiateSchema.safeParse({ expression: "x^2", variable: "x", order: 2 }).success);
    assert.equal(PlotSchema.parse({ expression: "sin(x)" }).variable, "x");
  });

  it("rejects code in fields that only ever hold variable names", () => {
    const hostile = ["x'); __import__('os').system('id'); ('", "x)\nimport os", "x; y", "1x", ""];
    for (const variable of hostile) {
      assert.equal(SolveEquationSchema.safeParse({ equation: "x == 1", variable }).success, false, variable);
    }
    assert.equal(SolveEquationSchema.safeParse({ equation: "x", variable: "x", variables: "y'); import os" }).success, false);
    assert.equal(PlotSchema.safeParse({ expression: "x", variable: "x, y" }).success, false);
    assert.equal(DifferentiateSchema.safeParse({ expression: "x", variable: "x", order: 1.5 }).success, false);
  });
});
