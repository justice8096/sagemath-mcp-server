import { execSync, spawn } from "child_process";
import { t } from "../i18n.js";
import {
  DEFAULT_SAGE_TIMEOUT,
  DEFAULT_SAGE_DOCKER_IMAGE,
} from "../constants.js";

type ExecutionMode = "local" | "docker";

let executionMode: ExecutionMode = "docker";
let dockerImage = process.env.SAGE_DOCKER_IMAGE || DEFAULT_SAGE_DOCKER_IMAGE;
let sageTimeout = parseInt(process.env.SAGE_TIMEOUT || String(DEFAULT_SAGE_TIMEOUT), 10);

export async function initSageExecutor(): Promise<void> {
  // Try to detect if sage is available locally
  try {
    execSync("which sage", { stdio: "ignore" });
    executionMode = "local";
    console.error(t("status.using_local"));
  } catch {
    // Fall back to Docker
    try {
      execSync("which docker", { stdio: "ignore" });
      executionMode = "docker";
      console.error(t("status.using_docker", { image: dockerImage }));
    } catch {
      throw new Error(t("errors.sage_not_found"));
    }
  }
}

export function getSageStatus(): { mode: string; docker_image?: string } {
  if (executionMode === "local") {
    return { mode: "local" };
  } else {
    return { mode: "docker", docker_image: dockerImage };
  }
}

export async function executeSage(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const sanitizedCode = sanitizeCode(code);

    const timeoutHandle = setTimeout(() => {
      reject(
        new Error(
          t("errors.timeout", { seconds: sageTimeout / 1000 })
        )
      );
    }, sageTimeout);

    try {
      if (executionMode === "local") {
        executeLocal(sanitizedCode, (error, output) => {
          clearTimeout(timeoutHandle);
          if (error) {
            reject(error);
          } else {
            resolve(output);
          }
        });
      } else {
        executeDocker(sanitizedCode, (error, output) => {
          clearTimeout(timeoutHandle);
          if (error) {
            reject(error);
          } else {
            resolve(output);
          }
        });
      }
    } catch (error) {
      clearTimeout(timeoutHandle);
      reject(error);
    }
  });
}

function executeLocal(
  code: string,
  callback: (error: Error | null, output: string) => void
): void {
  try {
    const result = execSync(`sage -c "${escapeShellString(code)}"`, {
      encoding: "utf-8",
      timeout: sageTimeout,
      stdio: ["pipe", "pipe", "pipe"],
    });
    callback(null, result);
  } catch (error) {
    if (error instanceof Error) {
      callback(new Error(t("errors.execution_failed", { detail: error.message })), "");
    } else {
      callback(new Error(t("errors.execution_failed", { detail: String(error) })), "");
    }
  }
}

function executeDocker(
  code: string,
  callback: (error: Error | null, output: string) => void
): void {
  const process = spawn("docker", [
    "run",
    "--rm",
    dockerImage,
    "sage",
    "-c",
    code,
  ]);

  let stdout = "";
  let stderr = "";

  process.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  process.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  process.on("close", (code) => {
    if (code === 0) {
      callback(null, stdout);
    } else {
      callback(
        new Error(
          t("errors.execution_failed", {
            detail: stderr || `Process exited with code ${code}`,
          })
        ),
        ""
      );
    }
  });

  process.on("error", (error) => {
    callback(
      new Error(
        t("errors.execution_failed", {
          detail: error.message,
        })
      ),
      ""
    );
  });
}

function sanitizeCode(code: string): string {
  // Remove dangerous shell characters that could escape the string
  return code
    .replace(/`/g, "'") // Replace backticks with quotes
    .replace(/\$/g, "\\$") // Escape dollar signs
    .trim();
}

function escapeShellString(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "'");
}