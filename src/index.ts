#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initI18n, t } from "./i18n.js";
import { initSageExecutor } from "./services/sage-executor.js";
import { createServer } from "./server.js";
import { resolveHttpConfig, startHttpServer } from "./http.js";

const transportMode = (process.env.TRANSPORT || "stdio").toLowerCase();
const locale = process.env.SAGE_LOCALE || "en";

async function runStdioTransport(): Promise<void> {
  console.error("[SageMath MCP] Starting in stdio mode...");
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[SageMath MCP] Stdio transport connected");
}

async function main(): Promise<void> {
  if (transportMode !== "stdio" && transportMode !== "http") {
    throw new Error(`Invalid TRANSPORT '${transportMode}'. Use stdio or http.`);
  }

  // Validate HTTP settings before anything else so a missing API key stops
  // the process immediately.
  const httpConfig = transportMode === "http" ? resolveHttpConfig() : null;

  await initI18n(locale);
  await initSageExecutor();
  console.error("[SageMath MCP] Audit logging enabled - tool invocations logged to stderr");
  console.error(`[SageMath MCP] ${t("status.initialized")}`);

  if (httpConfig) {
    await startHttpServer(httpConfig, locale);
  } else {
    await runStdioTransport();
  }
}

// Graceful shutdown
process.on("SIGINT", () => { console.error("[SageMath MCP] Shutting down..."); process.exit(0); });
process.on("SIGTERM", () => { console.error("[SageMath MCP] Shutting down..."); process.exit(0); });

main().catch((error) => {
  console.error(
    "[SageMath MCP] Fatal error:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
