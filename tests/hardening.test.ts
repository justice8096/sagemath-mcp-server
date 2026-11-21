import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import {
  executeSage,
  initSageExecutor,
  resolveExecutorConfig,
} from "../src/services/sage-executor.ts";
import { createServer } from "../src/server.ts";
import { DEFAULT_SAGE_TIMEOUT, MAX_CODE_BYTES } from "../src/constants.ts";

/*
 * Gaps left by security.test.ts:
 *  - the tool layer: hostile input must be refused before any process starts
 *  - the Docker path end to end, including removal of a timed-out container
 *  - the output limit, a missing binary, and killing the whole process tree
 *  - more shell metacharacters and exact UTF-8 byte boundaries
 */

const posixOnly = { skip: process.platform === "win32" };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function writeScript(file: string, body: string): void {
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
}

// More inputs that mean something to sh, cmd.exe or an argument parser.
const EXTRA_PAYLOADS = [
  "x'; touch MARK_q; '",
  "1\rtouch MARK_r",
  "1\ttouch MARK_t",
  "* > MARK_glob",
  "1 & touch MARK_amp",
  "%PATH% & touch MARK_win",
  "--version",
  "-c",
  "-",
  "‮)1(tnirp",
  "${IFS}touch${IFS}MARK_ifs",
  "1 || touch MARK_or",
  "<(touch MARK_proc)",
];

describe("tool calls refuse hostile input before running anything", posixOnly, () => {
  let dir: string;
  let log: string;
  let client: Client;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sagemath-mcp-tools-"));
    log = path.join(dir, "invocations.log");
    // Records every program it is asked to run, then prints a fixed result.
    writeScript(
      path.join(dir, "sage"),
      `printf '%s\\n----\\n' "$2" >> '${log}'\necho RESULT`
    );
    await initSageExecutor({ PATH: dir, SAGE_EXECUTION_MODE: "local", SAGE_TIMEOUT: "5000" });

    const server = createServer();
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    client = new Client({ name: "test", version: "0.0.0" });
    await client.connect(clientSide);
  });

  after(async () => {
    await client.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const invocations = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "");

  async function callRefused(name: string, args: Record<string, unknown>): Promise<boolean> {
    try {
      const result: any = await client.callTool({ name, arguments: args });
      return result.isError === true;
    } catch {
      return true; // a protocol-level validation error is also a refusal
    }
  }

  it("refuses code in every structured tool and never starts sage", async () => {
    fs.rmSync(log, { force: true });
    const code = "__import__('os').system('touch MARK')";
    const cases: Array<[string, Record<string, unknown>]> = [
      ["sage_solve_equation", { equation: code, variable: "x" }],
      ["sage_solve_equation", { equation: "x == 1", variable: "x'); import os; ('" }],
      ["sage_differentiate", { expression: code, variable: "x" }],
      ["sage_integrate", { expression: "x", variable: "x", lower_limit: "0", upper_limit: code }],
      ["sage_simplify", { expression: code }],
      ["sage_factor", { expression: code }],
      ["sage_matrix_ops", { matrix: code, operation: "rank" }],
      ["sage_plot", { expression: code }],
      ["sage_latex_convert", { expression: code }],
      ["sage_number_theory", { operation: "gcd", value: "12", second_value: code }],
    ];
    const tools = (await client.listTools()).tools.map((t) => t.name);
    for (const [name, args] of cases) {
      assert.ok(tools.includes(name), `tool ${name} is registered`);
      assert.equal(await callRefused(name, args), true, `${name} ${JSON.stringify(args)}`);
    }
    assert.equal(invocations(), "", "sage was started for refused input");
  });

  it("runs valid mathematics and builds the expected program", async () => {
    fs.rmSync(log, { force: true });
    const result: any = await client.callTool({
      name: "sage_solve_equation",
      arguments: { equation: "x^2 == 4", variable: "x" },
    });
    assert.notEqual(result.isError, true);
    assert.equal(result.content[0].text, "RESULT");
    assert.match(invocations(), /solve\(x\^2 == 4, x\)/);
  });

  it("passes sage_evaluate code through verbatim", async () => {
    fs.rmSync(log, { force: true });
    const code = '"$(touch MARK)" + `x` + "\\\\"';
    await client.callTool({ name: "sage_evaluate", arguments: { expression: code } });
    // The tool wraps the expression in print(); nothing else may change.
    assert.equal(invocations(), `print(${code})\n----\n`);
    assert.deepEqual(fs.readdirSync(dir).filter((f) => f.startsWith("MARK")), []);
  });
});

describe("docker mode end to end with a stand-in docker CLI", posixOnly, () => {
  let dir: string;
  let killLog: string;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sagemath-mcp-docker-"));
    killLog = path.join(dir, "kills.log");
    writeScript(
      path.join(dir, "docker"),
      [
        `if [ "$1" = kill ]; then echo "$2" >> '${killLog}'; exit 0; fi`,
        `for a in "$@"; do last="$a"; done`,
        `case "$last" in *SLEEP_FOREVER*) sleep 30;; esac`,
        `printf 'LAST<%s>\\n' "$last"`,
      ].join("\n")
    );
    await initSageExecutor({ PATH: dir, SAGE_EXECUTION_MODE: "docker", SAGE_TIMEOUT: "1500" });
  });

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("delivers hostile input to the container verbatim", async () => {
    for (const payload of EXTRA_PAYLOADS) {
      const code = `print(${payload})`;
      assert.equal(await executeSage(code), `LAST<${code}>\n`);
    }
    assert.deepEqual(fs.readdirSync(dir).filter((f) => f.startsWith("MARK")), []);
  });

  it("removes the container when a computation times out", async () => {
    fs.rmSync(killLog, { force: true });
    await assert.rejects(executeSage("SLEEP_FOREVER"), /timed out/);
    await sleep(500);
    const killed = fs.readFileSync(killLog, "utf8").trim().split("\n");
    assert.equal(killed.length, 1);
    assert.match(killed[0], /^sagemath-mcp-[0-9a-f-]{36}$/);
  });
});

describe("local mode limits and failures", posixOnly, () => {
  let dir: string;
  let grandchildMarker: string;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sagemath-mcp-limits-"));
    grandchildMarker = path.join(dir, "GRANDCHILD_SURVIVED");
    writeScript(
      path.join(dir, "sage"),
      [
        `case "$2" in`,
        `  *FLOOD*) head -c 17000000 /dev/zero | tr '\\000' x; exit 0;;`,
        `  *TREE*) (sleep 2; touch '${grandchildMarker}') & sleep 30;;`,
        `esac`,
        `printf 'ARG<%s>\\n' "$2"`,
      ].join("\n")
    );
    await initSageExecutor({ PATH: dir, SAGE_EXECUTION_MODE: "local", SAGE_TIMEOUT: "1000" });
  });

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("delivers more shell metacharacters verbatim", async () => {
    for (const payload of EXTRA_PAYLOADS) {
      const code = `print(${payload})`;
      assert.equal(await executeSage(code), `ARG<${code}>\n`);
    }
    // A program made only of an option-looking word stays data.
    assert.equal(await executeSage("--help"), "ARG<--help>\n");
    assert.deepEqual(fs.readdirSync(dir).filter((f) => f.startsWith("MARK")), []);
  });

  it("stops at the output limit", async () => {
    await assert.rejects(executeSage("FLOOD"), /output limit/);
  });

  it("kills helper processes on timeout, not only the direct child", async () => {
    await assert.rejects(executeSage("TREE"), /timed out/);
    await sleep(2500);
    assert.equal(fs.existsSync(grandchildMarker), false, "a grandchild outlived the timeout");
  });

  it("enforces the code limit at the exact UTF-8 byte boundary", async () => {
    assert.match(await executeSage("1".repeat(MAX_CODE_BYTES)), /^ARG</);
    const cjk = "中"; // 3 bytes
    const emoji = "\u{1F600}"; // 4 bytes, String.length 2
    const fits = Math.floor(MAX_CODE_BYTES / 3);
    assert.match(await executeSage(cjk.repeat(fits)), /^ARG</);
    await assert.rejects(executeSage(cjk.repeat(fits + 1)), /longer than/);
    assert.match(await executeSage(emoji.repeat(MAX_CODE_BYTES / 4)), /^ARG</);
    await assert.rejects(executeSage(emoji.repeat(MAX_CODE_BYTES / 4 + 1)), /longer than/);
  });

  it("reports a missing binary as an error instead of crashing", async () => {
    const gone = fs.mkdtempSync(path.join(os.tmpdir(), "sagemath-mcp-gone-"));
    writeScript(path.join(gone, "sage"), "exit 0");
    await initSageExecutor({ PATH: gone, SAGE_EXECUTION_MODE: "local" });
    fs.rmSync(gone, { recursive: true, force: true });
    await assert.rejects(executeSage("print(1)"), /ENOENT/);
  });
});

describe("timeout configuration", () => {
  it("falls back to the default for values that are not positive integers", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sagemath-mcp-cfg-"));
    try {
      if (process.platform !== "win32") writeScript(path.join(dir, "sage"), "exit 0");
      else fs.writeFileSync(path.join(dir, "sage.exe"), "");
      for (const raw of ["abc", "-5", "0", "1.5", "", "   "]) {
        const cfg = resolveExecutorConfig({ PATH: dir, SAGE_EXECUTION_MODE: "local", SAGE_TIMEOUT: raw });
        assert.equal(cfg.timeoutMs, DEFAULT_SAGE_TIMEOUT, JSON.stringify(raw));
      }
      const cfg = resolveExecutorConfig({ PATH: dir, SAGE_EXECUTION_MODE: "local", SAGE_TIMEOUT: "45000" });
      assert.equal(cfg.timeoutMs, 45000);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
