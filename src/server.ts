import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { withAuditLogging } from "./services/audit-logger.js";
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

export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Wrap registerTool to add audit logging
  const origRegisterTool = server.registerTool.bind(server);
  server.registerTool = ((name: string, toolConfig: any, handler: any) => {
    return origRegisterTool(name, toolConfig, withAuditLogging(name, handler));
  }) as typeof server.registerTool;

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
