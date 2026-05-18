import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { t } from "../i18n.js";
import { executeSage } from "../services/sage-executor.js";
import { SimplifySchema, FactorSchema } from "../schemas/common.js";

const SIMPLIFY_CALLS: Record<string, string> = {
  default: "simplify(f)",
  full: "f.full_simplify()",
  trig: "f.trig_simplify()",
  rational: "f.simplify_rational()",
};

export function registerSimplifyTool(server: McpServer): void {
  server.registerTool(
    "sage_simplify",
    {
      title: "Simplify Expression",
      description: t("tool.simplify.description") || "Simplify a mathematical expression using SageMath",
      inputSchema: SimplifySchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args: any) => {
      try {
        const simplifyCall = SIMPLIFY_CALLS[args.simplification_type || "default"] || SIMPLIFY_CALLS.default;
        const varDeclare = args.variables ? `var('${args.variables}')` : "";
        const code = `
${varDeclare}
f = ${args.expression}
result = ${simplifyCall}
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

export function registerFactorTool(server: McpServer): void {
  server.registerTool(
    "sage_factor",
    {
      title: "Factor Expression",
      description: t("tool.factor.description") || "Factor a polynomial or integer using SageMath",
      inputSchema: FactorSchema,
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
result = factor(f)
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
