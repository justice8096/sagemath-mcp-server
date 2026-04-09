#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { initI18n, t } from "./i18n.js";
import {
  initSageExecutor,
  getSageStatus
} from "./services/sage-executor.js";
import {
  registerEvaluateTool,
  registerSolveEquationTool,
  registerDifferentiateTool,
  registerIntegrateTool,
  registerSimplifyTool,
  registerFactorTool,
  registerMatrixOpsTool,
  registerPlotTool,
  registerLatexConvertTool,
  registerNumberTheoryTool,
} from "./tools/index.js";

const transportMode = process.env.TRANSPORT || "stdio";
const locale = process.env.SAGE_LOCALE || "en";
const apiKey = process.env.API_KEY;

function createServer(): McpServer {
  const server = new McpServer({
    name: "sagemath-mcp-server",
    version: "1.0.0",
  });

  // Register all tools
  registerEvaluateTool(server);
  registerSolveEquationTool(server);
  registerDifferentiateTool(server);
  registerIntegrateTool(server);
  registerSimplifyTool(server);
  registerFactorTool(server);
  registerMatrixOpsTool(server);
  registerPlotTool(server);
  registerLatexConvertTool(server);
  registerNumberTheoryTool(server);

  return server;
}

async function runStdioTransport(): Promise<void> {
  console.error("[SageMath MCP] Starting in stdio mode...");
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[SageMath MCP] Stdio transport connected");
}

async function runHttpTransport(): Promise<void> {
  const port = parseInt(process.env.PORT || "3000", 10);
  const app = express();

  app.use(express.json({ limit: "50mb" }));

  // API Key authentication middleware (skip health check)
  if (apiKey) {
    app.use((req, res, next) => {
      if (req.path === "/health") return next();
      const key = req.headers["x-api-key"] || req.headers["authorization"]?.replace("Bearer ", "");
      if (key !== apiKey) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      next();
    });
  }

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      sage: getSageStatus(),
      locale,
    });
  });

  // MCP endpoint — stateless: new transport + server per request
  app.post("/mcp", async (req, res) => {
    try {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on("close", () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.listen(port, () => {
    console.error(`[SageMath MCP] HTTP transport listening on port ${port}`);
  });
}

async function main(): Promise<void> {
  try {
    // Initialize i18n and SageMath executor
    await initI18n(locale);
    await initSageExecutor();
    console.error(`[SageMath MCP] ${t("status.initialized")}`);

    if (transportMode === "http") {
      await runHttpTransport();
    } else {
      await runStdioTransport();
    }
  } catch (error) {
    console.error("[SageMath MCP] Fatal error:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", () => { console.error("[SageMath MCP] Shutting down..."); process.exit(0); });
process.on("SIGTERM", () => { console.error("[SageMath MCP] Shutting down..."); process.exit(0); });

main().catch((error) => {
  console.error("[SageMath MCP] Uncaught error:", error);
  process.exit(1);
});