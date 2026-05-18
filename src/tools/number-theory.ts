import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { t } from "../i18n.js";
import { executeSage } from "../services/sage-executor.js";
import { NumberTheorySchema } from "../schemas/common.js";

type Op = (value: string, second?: string) => string;

const OPERATIONS: Record<string, Op> = {
  is_prime: (v) => `is_prime(${v})`,
  next_prime: (v) => `next_prime(${v})`,
  factor: (v) => `factor(${v})`,
  euler_phi: (v) => `euler_phi(${v})`,
  gcd: (v, s) => `gcd(${v}, ${s})`,
  lcm: (v, s) => `lcm(${v}, ${s})`,
  prime_range: (v, s) => `prime_range(${v}, ${s})`,
  sigma: (v) => `sigma(${v})`,
  moebius: (v) => `moebius(${v})`,
};

const PAIR_OPS = new Set(["gcd", "lcm", "prime_range"]);

export function registerNumberTheoryTool(server: McpServer): void {
  server.registerTool(
    "sage_number_theory",
    {
      title: "Number Theory Operations",
      description:
        t("tool.number_theory.description") ||
        "Perform number theory operations: primality, factorization, divisor functions, gcd/lcm, and more",
      inputSchema: NumberTheorySchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args: any) => {
      try {
        const operation = args.operation as string;
        const builder = OPERATIONS[operation];

        if (!builder) {
          return {
            content: [
              {
                type: "text",
                text:
                  t("errors.invalid_operation", {
                    operation,
                    allowed: Object.keys(OPERATIONS).join(", "),
                  }) ||
                  `Unsupported operation '${operation}'. Allowed: ${Object.keys(OPERATIONS).join(", ")}`,
              },
            ],
            isError: true,
          };
        }

        if (PAIR_OPS.has(operation) && !args.second_value) {
          return {
            content: [
              {
                type: "text",
                text:
                  t("errors.missing_second_value", { operation }) ||
                  `Operation '${operation}' requires second_value`,
              },
            ],
            isError: true,
          };
        }

        const call = builder(args.value, args.second_value);
        const code = `result = ${call}\nprint(result)`;
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
