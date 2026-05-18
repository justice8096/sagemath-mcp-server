import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { t } from "../i18n.js";
import { executeSage } from "../services/sage-executor.js";
import { LatexConvertSchema } from "../schemas/common.js";

export function registerLatexConvertTool(server: McpServer): void {
  server.registerTool(
    "sage_latex_convert",
    {
      title: "Convert Expression to LaTeX",
      description:
        t("tool.latex_convert.description") ||
        "Convert a SageMath expression into its LaTeX representation",
      inputSchema: LatexConvertSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args: any) => {
      try {
        const varDeclare = args.variables ? `var('${args.variables}')` : "";
        const code = `
${varDeclare}
f = ${args.expression}
print(latex(f))
`;
        const output = await executeSage(code);
        return {
          content: [{ type: "text", text: output.trim() }],
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
