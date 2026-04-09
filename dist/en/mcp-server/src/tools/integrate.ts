import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const integrateSchema = z.object({
  expression: z.string(),
  variable: z.string(),
  lower_limit: z.string().optional(),
  upper_limit: z.string().optional(),
  variables: z.string().optional(),
});

export const integrateDefinition = { name: "integrate", description: "Compute indefinite and definite integrals of mathematical expressions",
  inputSchema: { type: "object" as const, properties: {
      expression: { type: "string", description: "Compute indefinite and definite integrals of mathematical expressions" },
      variable: { type: "string", description: "Compute indefinite and definite integrals of mathematical expressions" },
      lower_limit: { type: "string", description: "Compute indefinite and definite integrals of mathematical expressions" },
      upper_limit: { type: "string", description: "Compute indefinite and definite integrals of mathematical expressions" },
      variables: { type: "string", description: "Compute indefinite and definite integrals of mathematical expressions" },
    }, required: ["expression", "variable"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = integrateSchema.parse(input);
  const skillContent = await loadSkillContent("integrate");
  return JSON.stringify({ status: "success", command: "integrate", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}