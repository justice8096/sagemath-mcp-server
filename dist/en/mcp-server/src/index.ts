import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { evaluateDefinition, handle as handle_evaluate } from "./tools/evaluate.js";
import { solve_equationDefinition, handle as handle_solve_equation } from "./tools/solve_equation.js";
import { differentiateDefinition, handle as handle_differentiate } from "./tools/differentiate.js";
import { integrateDefinition, handle as handle_integrate } from "./tools/integrate.js";
import { simplifyDefinition, handle as handle_simplify } from "./tools/simplify.js";
import { factorDefinition, handle as handle_factor } from "./tools/factor.js";
import { matrix_opsDefinition, handle as handle_matrix_ops } from "./tools/matrix_ops.js";
import { plotDefinition, handle as handle_plot } from "./tools/plot.js";
import { latex_convertDefinition, handle as handle_latex_convert } from "./tools/latex_convert.js";
import { number_theoryDefinition, handle as handle_number_theory } from "./tools/number_theory.js";

const tools = [
  evaluateDefinition,
  solve_equationDefinition,
  differentiateDefinition,
  integrateDefinition,
  simplifyDefinition,
  factorDefinition,
  matrix_opsDefinition,
  plotDefinition,
  latex_convertDefinition,
  number_theoryDefinition,
];

async function main(): Promise<void> {
  const server = new McpServer({ name: "sagemath-mcp-server-mcp", version: "1.0.0" });
  const transport = new StdioServerTransport();
  server.server.setRequestHandler("tools/list", async () => ({ tools }));
  server.server.setRequestHandler("tools/call", async (request: { params: { name: string; arguments?: Record<string, unknown> } }) => {
    const { name, arguments: args = {} } = request.params;
    switch (name) {
      case "evaluate": return { content: [{ type: "text", text: await handle_evaluate(args) }] };
      case "solve_equation": return { content: [{ type: "text", text: await handle_solve_equation(args) }] };
      case "differentiate": return { content: [{ type: "text", text: await handle_differentiate(args) }] };
      case "integrate": return { content: [{ type: "text", text: await handle_integrate(args) }] };
      case "simplify": return { content: [{ type: "text", text: await handle_simplify(args) }] };
      case "factor": return { content: [{ type: "text", text: await handle_factor(args) }] };
      case "matrix_ops": return { content: [{ type: "text", text: await handle_matrix_ops(args) }] };
      case "plot": return { content: [{ type: "text", text: await handle_plot(args) }] };
      case "latex_convert": return { content: [{ type: "text", text: await handle_latex_convert(args) }] };
      case "number_theory": return { content: [{ type: "text", text: await handle_number_theory(args) }] };
      default: throw new Error("Unknown tool: " + name);
    }
  });
  await server.connect(transport);
  console.error("SageMath MCP Server MCP Server running on stdio");
}

main().catch((error) => { console.error("Fatal error:", error); process.exit(1); });