import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const integrateSchema = z.object({
  expression: z.string(),
  variable: z.string(),
  lower_limit: z.string().optional(),
  upper_limit: z.string().optional(),
  variables: z.string().optional(),
});

export const integrateDefinition = { name: "integrate", description: "Calcular integrales indefinidas y definidas de expresiones matemáticas",
  inputSchema: { type: "object" as const, properties: {
      expression: { type: "string", description: "Calcular integrales indefinidas y definidas de expresiones matemáticas" },
      variable: { type: "string", description: "Calcular integrales indefinidas y definidas de expresiones matemáticas" },
      lower_limit: { type: "string", description: "Calcular integrales indefinidas y definidas de expresiones matemáticas" },
      upper_limit: { type: "string", description: "Calcular integrales indefinidas y definidas de expresiones matemáticas" },
      variables: { type: "string", description: "Calcular integrales indefinidas y definidas de expresiones matemáticas" },
    }, required: ["expression", "variable"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = integrateSchema.parse(input);
  const skillContent = await loadSkillContent("integrate");
  return JSON.stringify({ status: "success", command: "integrate", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}