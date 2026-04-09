import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const factorSchema = z.object({
  expression: z.string(),
  variables: z.string().optional(),
});

export const factorDefinition = { name: "factor", description: "Factor polynomials and integer expressions",
  inputSchema: { type: "object" as const, properties: {
      expression: { type: "string", description: "Factor polynomials and integer expressions" },
      variables: { type: "string", description: "Factor polynomials and integer expressions" },
    }, required: ["expression"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = factorSchema.parse(input);
  const skillContent = await loadSkillContent("factor");
  return JSON.stringify({ status: "success", command: "factor", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}