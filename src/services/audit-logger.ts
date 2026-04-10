/**
 * Structured audit logger for MCP tool invocations.
 * Logs JSONL to stderr so it doesn't interfere with stdio MCP transport.
 *
 * Each log entry includes: timestamp, tool name, arguments (sanitized),
 * duration, success/failure, and error details if applicable.
 */

export interface AuditEntry {
  timestamp: string;
  tool: string;
  args: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  error?: string;
}

const LOG_PREFIX = "[AUDIT]";

function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === "string" && value.length > 500) {
      sanitized[key] = value.substring(0, 500) + "...[truncated]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function logAudit(entry: AuditEntry): void {
  const line = JSON.stringify(entry);
  console.error(`${LOG_PREFIX} ${line}`);
}

/**
 * Wraps an MCP tool handler with audit logging.
 * Captures timing, success/failure, and logs to stderr.
 */
export function withAuditLogging<T extends (...args: any[]) => Promise<any>>(
  toolName: string,
  handler: T
): T {
  return (async (...args: any[]) => {
    const start = Date.now();
    const inputArgs = args[0] && typeof args[0] === "object" ? sanitizeArgs(args[0] as Record<string, unknown>) : {};
    try {
      const result = await handler(...args);
      logAudit({
        timestamp: new Date().toISOString(),
        tool: toolName,
        args: inputArgs,
        durationMs: Date.now() - start,
        success: !result?.isError,
        ...(result?.isError ? { error: result?.content?.[0]?.text?.substring(0, 200) } : {}),
      });
      return result;
    } catch (error) {
      logAudit({
        timestamp: new Date().toISOString(),
        tool: toolName,
        args: inputArgs,
        durationMs: Date.now() - start,
        success: false,
        error: error instanceof Error ? error.message.substring(0, 200) : String(error).substring(0, 200),
      });
      throw error;
    }
  }) as T;
}
