import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const differentiateSchema = z.object({
  expression: z.string(),
  variable: z.string(),
  order: z.number().optional(),
  variables: z.string().optional(),
});

export const differentiateDefinition = { name: "differentiate", description: "Calculer les dérivées d'expressions mathématiques (partielles, d'ordre supérieur)",
  inputSchema: { type: "object" as const, properties: {
      expression: { type: "string", description: "Calculer les dérivées d'expressions mathématiques (partielles, d'ordre supérieur)" },
      variable: { type: "string", description: "Calculer les dérivées d'expressions mathématiques (partielles, d'ordre supérieur)" },
      order: { type: "number", description: "Calculer les dérivées d'expressions mathématiques (partielles, d'ordre supérieur)" },
      variables: { type: "string", description: "Calculer les dérivées d'expressions mathématiques (partielles, d'ordre supérieur)" },
    }, required: ["expression", "variable"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = differentiateSchema.parse(input);
  const skillContent = await loadSkillContent("differentiate");
  return JSON.stringify({ status: "success", command: "differentiate", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}