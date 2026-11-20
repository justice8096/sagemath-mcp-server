import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { statSync } from "fs";
import { delimiter, join } from "path";
import { t } from "../i18n.js";
import {
  DEFAULT_SAGE_TIMEOUT,
  DEFAULT_SAGE_DOCKER_IMAGE,
  DEFAULT_SAGE_DOCKER_NETWORK,
  DEFAULT_SAGE_DOCKER_MEMORY,
  DEFAULT_SAGE_DOCKER_PIDS_LIMIT,
  MAX_CODE_LENGTH,
  MAX_OUTPUT_BYTES,
} from "../constants.js";

/*
 * SageMath execution.
 *
 * Security notes (see SECURITY.md and THREAT_MODEL.md):
 *  - No shell is ever involved. The program text is handed to the child
 *    process as a single argv element, so shell metacharacters in tool
 *    arguments have no meaning. There is deliberately no "sanitizer": the
 *    earlier escaping helpers were the vulnerability (GHSA-2q55-r7q3-v3g3).
 *  - In Docker mode the image entrypoint is replaced with `sage` itself. The
 *    stock sagemath/sagemath entrypoint re-joins its arguments and runs them
 *    through `sh -c`, which both broke ordinary expressions and re-opened
 *    shell injection inside the container.
 *  - SageMath code is Python. Whoever can call a tool can run Python with
 *    the privileges of the SageMath process. Docker mode confines that to a
 *    throwaway container with no network; local mode does not confine it.
 */

export type ExecutionMode = "local" | "docker";

export interface ExecutorConfig {
  mode: ExecutionMode;
  /** Absolute path to the local sage binary (local mode). */
  sagePath?: string;
  /** Absolute path to the docker CLI (docker mode). */
  dockerPath?: string;
  dockerImage: string;
  dockerNetwork: string;
  dockerMemory: string;
  dockerPidsLimit: number;
  timeoutMs: number;
}

export interface SageInvocation {
  command: string;
  args: string[];
  /** Set in docker mode so a timed-out container can be removed. */
  containerName?: string;
}

let config: ExecutorConfig | null = null;

// Computations still running. They are stopped if the server exits first.
const activeStops = new Set<() => void>();
process.on("exit", () => {
  for (const stop of [...activeStops]) stop();
});

// Docker reference: registry/repo:tag or repo@sha256:digest. Must not be able
// to look like a command-line option.
const DOCKER_IMAGE_RE = /^[A-Za-z0-9][A-Za-z0-9._\/:@-]{0,254}$/;
const DOCKER_NETWORK_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,62}$/;
const DOCKER_MEMORY_RE = /^[1-9][0-9]{0,8}[bkmgBKMG]?$/;

/**
 * Locate an executable on PATH without running anything.
 * Works on Windows, macOS and Linux. On Windows only real executables are
 * accepted, because batch shims cannot be started without a shell.
 */
export function findOnPath(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): string | null {
  const pathVar = env.PATH ?? env.Path ?? "";
  const extensions = platform === "win32" ? [".exe", ".com"] : [""];
  for (const dir of pathVar.split(delimiter)) {
    if (!dir) continue;
    for (const ext of extensions) {
      const candidate = join(dir, name + ext);
      try {
        const st = statSync(candidate);
        if (!st.isFile()) continue;
        if (platform !== "win32" && (st.mode & 0o111) === 0) continue;
        return candidate;
      } catch {
        // not here, keep looking
      }
    }
  }
  return null;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/** Build the executor configuration from the environment. Throws on bad values. */
export function resolveExecutorConfig(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): ExecutorConfig {
  const requested = (env.SAGE_EXECUTION_MODE || "auto").toLowerCase();
  if (!["auto", "local", "docker"].includes(requested)) {
    throw new Error(
      `Invalid SAGE_EXECUTION_MODE '${requested}'. Use auto, local or docker.`
    );
  }

  const dockerImage = env.SAGE_DOCKER_IMAGE || DEFAULT_SAGE_DOCKER_IMAGE;
  if (!DOCKER_IMAGE_RE.test(dockerImage)) {
    throw new Error("Invalid SAGE_DOCKER_IMAGE: not a valid image reference.");
  }
  const dockerNetwork = env.SAGE_DOCKER_NETWORK || DEFAULT_SAGE_DOCKER_NETWORK;
  if (!DOCKER_NETWORK_RE.test(dockerNetwork)) {
    throw new Error("Invalid SAGE_DOCKER_NETWORK: not a valid network name.");
  }
  const dockerMemory = env.SAGE_DOCKER_MEMORY || DEFAULT_SAGE_DOCKER_MEMORY;
  if (!DOCKER_MEMORY_RE.test(dockerMemory)) {
    throw new Error("Invalid SAGE_DOCKER_MEMORY: use a value such as 512m or 2g.");
  }

  const base = {
    dockerImage,
    dockerNetwork,
    dockerMemory,
    dockerPidsLimit: parsePositiveInt(
      env.SAGE_DOCKER_PIDS_LIMIT,
      DEFAULT_SAGE_DOCKER_PIDS_LIMIT
    ),
    timeoutMs: parsePositiveInt(env.SAGE_TIMEOUT, DEFAULT_SAGE_TIMEOUT),
  };

  if (requested !== "docker") {
    const sagePath = findOnPath("sage", env, platform);
    if (sagePath) return { ...base, mode: "local", sagePath };
    if (requested === "local") throw new Error(t("errors.sage_not_found"));
  }

  const dockerPath = findOnPath("docker", env, platform);
  if (dockerPath) return { ...base, mode: "docker", dockerPath };
  throw new Error(t("errors.sage_not_found"));
}

export async function initSageExecutor(
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  config = resolveExecutorConfig(env);
  if (config.mode === "local") {
    console.error(t("status.using_local"));
  } else {
    console.error(t("status.using_docker", { image: config.dockerImage }));
  }
}

export function getSageStatus(): { mode: string; docker_image?: string } {
  if (!config) return { mode: "uninitialized" };
  if (config.mode === "local") return { mode: "local" };
  return { mode: "docker", docker_image: config.dockerImage };
}

/**
 * Build the exact argv used to run a SageMath program.
 * The program is always the final element and is never modified.
 */
export function buildSageInvocation(
  cfg: ExecutorConfig,
  code: string
): SageInvocation {
  if (cfg.mode === "local") {
    return { command: cfg.sagePath ?? "sage", args: ["-c", code] };
  }

  const containerName = `sagemath-mcp-${randomUUID()}`;
  return {
    command: cfg.dockerPath ?? "docker",
    containerName,
    args: [
      "run",
      "--rm",
      "--name",
      containerName,
      "--network",
      cfg.dockerNetwork,
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--pids-limit",
      String(cfg.dockerPidsLimit),
      "--memory",
      cfg.dockerMemory,
      // Bypass the image entrypoint, which would re-parse the program
      // through a shell.
      "--entrypoint",
      "sage",
      cfg.dockerImage,
      "-c",
      code,
    ],
  };
}

function validateCode(code: string): void {
  if (typeof code !== "string" || code.trim() === "") {
    throw new Error(t("errors.invalid_expression", { detail: "empty input" }));
  }
  if (code.includes("\0")) {
    throw new Error(
      t("errors.invalid_expression", { detail: "input contains a NUL byte" })
    );
  }
  if (code.length > MAX_CODE_LENGTH) {
    throw new Error(
      t("errors.invalid_expression", {
        detail: `input is longer than ${MAX_CODE_LENGTH} characters`,
      })
    );
  }
}

export async function executeSage(code: string): Promise<string> {
  if (!config) {
    throw new Error(
      t("errors.execution_failed", { detail: "executor not initialized" })
    );
  }
  const cfg = config;
  validateCode(code);
  const invocation = buildSageInvocation(cfg, code);

  return new Promise((resolve, reject) => {
    let settled = false;
    let stdout = "";
    let stderr = "";
    let captured = 0;

    const isWindows = process.platform === "win32";
    const child = spawn(invocation.command, invocation.args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      // Own process group on POSIX so a timeout can stop the whole tree
      // (sage starts helper processes).
      detached: !isWindows,
    });

    const stop = () => {
      activeStops.delete(stop);
      const quiet = { shell: false, windowsHide: true, stdio: "ignore" } as const;
      try {
        if (child.pid === undefined) {
          // spawn failed; nothing to stop
        } else if (isWindows) {
          spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], quiet).on(
            "error",
            () => child.kill()
          );
        } else {
          process.kill(-child.pid, "SIGKILL");
        }
      } catch {
        child.kill("SIGKILL");
      }
      if (invocation.containerName) {
        // Stopping the docker CLI does not stop the container it started.
        spawn(invocation.command, ["kill", invocation.containerName], quiet).on(
          "error",
          () => undefined
        );
      }
      child.stdout?.destroy();
      child.stderr?.destroy();
    };
    activeStops.add(stop);

    const finish = (error: Error | null, output = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      activeStops.delete(stop);
      if (error) reject(error);
      else resolve(output);
    };

    const timer = setTimeout(() => {
      stop();
      finish(new Error(t("errors.timeout", { seconds: cfg.timeoutMs / 1000 })));
    }, cfg.timeoutMs);

    const collect = (target: "stdout" | "stderr") => (data: Buffer) => {
      captured += data.length;
      if (captured > MAX_OUTPUT_BYTES) {
        stop();
        finish(
          new Error(
            t("errors.execution_failed", { detail: "output limit exceeded" })
          )
        );
        return;
      }
      if (target === "stdout") stdout += data.toString();
      else stderr += data.toString();
    };

    child.stdout.on("data", collect("stdout"));
    child.stderr.on("data", collect("stderr"));

    child.on("error", (error) => {
      finish(new Error(t("errors.execution_failed", { detail: error.message })));
    });

    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        finish(null, stdout);
      } else {
        finish(
          new Error(
            t("errors.execution_failed", {
              detail: stderr.trim() || `Process exited with code ${exitCode}`,
            })
          )
        );
      }
    });
  });
}
