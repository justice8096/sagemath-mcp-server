import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { t } from "../i18n.js";
import { executeSage } from "../services/sage-executor.js";
import { MatrixOpsSchema } from "../schemas/common.js";

const ALLOWED_RINGS = new Set(["QQ", "RR", "ZZ", "CC"]);
const OPERATION_CALLS: Record<string, string> = {
  determinant: "M.determinant()",
  inverse: "M.inverse()",
  eigenvalues: "M.eigenvalues()",
  rank: "M.rank()",
  rref: "M.rref()",
  transpose: "M.transpose()",
};

export function registerMatrixOpsTool(server: McpServer): void {
  server.registerTool(
    "sage_matrix_ops",
    {
      title: "Matrix Operations",
      description:
        t("tool.matrix_ops.description") ||
        "Perform matrix operations (determinant, inverse, eigenvalues, rank, rref, transpose) using SageMath",
      inputSchema: MatrixOpsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args: any) => {
      try {
        const ring = ALLOWED_RINGS.has(args.ring) ? args.ring : "QQ";
        const operation = args.operation as string;
        const call = OPERATION_CALLS[operation];

        if (!call) {
          return {
            content: [
              {
                type: "text",
                text: t("errors.invalid_operation", {
                  operation,
                  allowed: Object.keys(OPERATION_CALLS).join(", "),
                }) || `Unsupported operation '${operation}'. Allowed: ${Object.keys(OPERATION_CALLS).join(", ")}`,
              },
            ],
            isError: true,
          };
        }

        const code = `
M = matrix(${ring}, ${args.matrix})
result = ${call}
print(result)
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
