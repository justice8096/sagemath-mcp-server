import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const integrateSchema = z.object({
  expression: z.string(),
  variable: z.string(),
  lower_limit: z.string().optional(),
  upper_limit: z.string().optional(),
  variables: z.string().optional(),
});

export const integrateDefinition = { name: "integrate", description: "Calculer les intégrales indéfinies et définies d'expressions mathématiques",
  inputSchema: { type: "object" as const, properties: {
      expression: { type: "string", description: "Calculer les intégrales indéfinies et définies d'expressions mathématiques" },
      variable: { type: "string", description: "Calculer les intégrales indéfinies et définies d'expressions mathématiques" },
      lower_limit: { type: "string", description: "Calculer les intégrales indéfinies et définies d'expressions mathématiques" },
      upper_limit: { type: "string", description: "Calculer les intégrales indéfinies et définies d'expressions mathématiques" },
      variables: { type: "string", description: "Calculer les intégrales indéfinies et définies d'expressions mathématiques" },
    }, required: ["expression", "variable"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = integrateSchema.parse(input);
  const skillContent = await loadSkillContent("integrate");
  return JSON.stringify({ status: "success", command: "integrate", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}