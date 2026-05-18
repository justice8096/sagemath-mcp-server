import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { t } from "../i18n.js";
import { executeSage } from "../services/sage-executor.js";
import { SolveEquationSchema } from "../schemas/common.js";

export function registerSolveEquationTool(server: McpServer): void {
  server.registerTool(
    "sage_solve_equation",
    {
      title: "Solve Equation",
      description: t("tool.solve.description") || "Solve algebraic and transcendental equations symbolically",
      inputSchema: SolveEquationSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args: any) => {
      try {
        const varDeclare = args.variables ? `var('${args.variables}, ${args.variable}')` : `var('${args.variable}')`;
        const code = `
${varDeclare}
result = solve(${args.equation}, ${args.variable})
print(result)
`;
        const output = await executeSage(code);
        return {
          content: [
            {
              type: "text",
              text: output.trim(),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: t("errors.execution_failed", {
                detail: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}