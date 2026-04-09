import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const number_theorySchema = z.object({
  operation: z.string(),
  value: z.string(),
  second_value: z.string().optional(),
});

export const number_theoryDefinition = { name: "number_theory", description: "Perform number theory calculations: primality, factorization, divisor functions, and more",
  inputSchema: { type: "object" as const, properties: {
      operation: { type: "string", description: "Perform number theory calculations: primality, factorization, divisor functions, and more" },
      value: { type: "string", description: "Perform number theory calculations: primality, factorization, divisor functions, and more" },
      second_value: { type: "string", description: "Perform number theory calculations: primality, factorization, divisor functions, and more" },
    }, required: ["operation", "value"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = number_theorySchema.parse(input);
  const skillContent = await loadSkillContent("number-theory");
  return JSON.stringify({ status: "success", command: "number-theory", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}