import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { t } from "../i18n.js";
import { executeSage } from "../services/sage-executor.js";
import { DifferentiateSchema, IntegrateSchema } from "../schemas/common.js";

export function registerDifferentiateTool(server: McpServer): void {
  server.registerTool(
    "sage_differentiate",
    {
      title: "Differentiate Expression",
      description: t("tool.differentiate.description") || "Compute derivatives of mathematical expressions",
      inputSchema: DifferentiateSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args: any) => {
      try {
        const varDeclare = args.variables ? `var('"'"'${args.variables}, ${args.variable}'"'"')` : `var('"'"'${args.variable}'"'"')`;
        const code = `
${varDeclare}
f = ${args.expression}
result = diff(f, ${args.variable}, ${args.order || 1})
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

export function registerIntegrateTool(server: McpServer): void {
  server.registerTool(
    "sage_integrate",
    {
      title: "Integrate Expression",
      description: t("tool.integrate.description") || "Compute indefinite and definite integrals",
      inputSchema: IntegrateSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args: any) => {
      try {
        const varDeclare = args.variables ? `var('"'"'${args.variables}, ${args.variable}'"'"')` : `var('"'"'${args.variable}'"'"')`;
        let integralCall: string;

        if (args.lower_limit && args.upper_limit) {
          integralCall = `integrate(f, (${args.variable}, ${args.lower_limit}, ${args.upper_limit}))`;
        } else {
          integralCall = `integrate(f, ${args.variable})`;
        }

        const code = `
${varDeclare}
f = ${args.expression}
result = ${integralCall}
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