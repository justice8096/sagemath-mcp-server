import { createHash, timingSafeEqual, webcrypto } from "crypto";
import type { Server } from "http";
import express, { type Express, type Request } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  DEFAULT_HTTP_HOST,
  DEFAULT_HTTP_PORT,
  HTTP_BODY_LIMIT,
  MIN_API_KEY_LENGTH,
} from "./constants.js";
import { createServer } from "./server.js";
import { getSageStatus } from "./services/sage-executor.js";

/*
 * HTTP transport.
 *
 * Every tool on this server runs SageMath (Python) code, so the HTTP
 * transport fails closed: it refuses to start without an API key
 * (GHSA-rg88-jr3x-6547) and listens on the loopback interface unless the
 * operator sets HOST explicitly.
 */

// Node 18 has no global Web Crypto object, which the MCP SDK's HTTP transport
// expects. Node 20 and later already provide it.
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = webcrypto;
}

export interface HttpConfig {
  host: string;
  port: number;
  apiKey: string;
}

export function resolveHttpConfig(
  env: NodeJS.ProcessEnv = process.env
): HttpConfig {
  const apiKey = (env.API_KEY ?? "").trim();
  if (apiKey.length === 0) {
    throw new Error(
      "TRANSPORT=http requires API_KEY. Every tool executes SageMath code, " +
        "so the HTTP transport will not start without authentication. " +
        `Set API_KEY to a random secret of at least ${MIN_API_KEY_LENGTH} characters.`
    );
  }
  if (apiKey.length < MIN_API_KEY_LENGTH) {
    throw new Error(
      `API_KEY is too short. Use a random secret of at least ${MIN_API_KEY_LENGTH} characters.`
    );
  }

  const port = Number(env.PORT ?? DEFAULT_HTTP_PORT);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid PORT '${env.PORT}'.`);
  }

  const host = (env.HOST ?? "").trim() || DEFAULT_HTTP_HOST;
  return { host, port, apiKey };
}

export function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "::1" || /^127\./.test(host);
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Read the presented key from X-API-Key or Authorization: Bearer. */
export function extractApiKey(req: Pick<Request, "headers">): string | null {
  const header = req.headers["x-api-key"];
  if (typeof header === "string" && header.length > 0) return header;

  const authorization = req.headers["authorization"];
  if (typeof authorization === "string") {
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    if (match) return match[1].trim();
  }
  return null;
}

/** Constant-time comparison of the presented key with the configured key. */
export function isAuthorized(presented: string | null, apiKey: string): boolean {
  if (!presented) return false;
  return timingSafeEqual(digest(presented), digest(apiKey));
}

export function createHttpApp(config: HttpConfig, locale = "en"): Express {
  if (!config.apiKey || config.apiKey.length < MIN_API_KEY_LENGTH) {
    throw new Error("createHttpApp requires an API key.");
  }

  const app = express();
  app.disable("x-powered-by");

  // Liveness probe. Deliberately unauthenticated and free of detail.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Everything below this line requires the API key.
  app.use((req, res, next) => {
    if (!isAuthorized(extractApiKey(req), config.apiKey)) {
      res.set("WWW-Authenticate", "Bearer");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });

  app.use(express.json({ limit: HTTP_BODY_LIMIT }));

  app.get("/status", (_req, res) => {
    res.json({ status: "ok", sage: getSageStatus(), locale });
  });

  // MCP endpoint - stateless: new transport + server per request
  app.post("/mcp", async (req, res) => {
    try {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on("close", () => {
        void transport.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("[SageMath MCP] HTTP request failed:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  return app;
}

export function startHttpServer(config: HttpConfig, locale = "en"): Promise<Server> {
  const app = createHttpApp(config, locale);
  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host, () => {
      console.error(
        `[SageMath MCP] HTTP transport listening on ${config.host}:${config.port} (API key required)`
      );
      if (!isLoopbackHost(config.host)) {
        console.error(
          "[SageMath MCP] WARNING: listening on a non-loopback address. " +
            "Anyone holding the API key can run code on this host. Use TLS in front of this port."
        );
      }
      resolve(server);
    });
    server.on("error", reject);
  });
}
