import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { t } from "../i18n.js";
import { executeSage } from "../services/sage-executor.js";
import { ExpressionSchema } from "../schemas/common.js";

export function registerEvaluateTool(server: McpServer): void {
  server.registerTool(
    "sage_evaluate",
    {
      title: "Evaluate SageMath Expression",
      description: t("tool.evaluate.description") || "Execute arbitrary SageMath expressions and return the result",
      inputSchema: ExpressionSchema,
      // SageMath expressions are Python: this tool can run arbitrary code
      // with the privileges of the SageMath process. Advertise that honestly
      // so clients do not auto-approve it as a read-only call.
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args: any) => {
      try {
        const result = await executeSage(`print(${args.expression})`);
        return {
          content: [
            {
              type: "text",
              text: result.trim(),
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