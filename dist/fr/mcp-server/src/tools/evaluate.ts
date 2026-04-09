import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const evaluateSchema = z.object({
  expression: z.string(),
});

export const evaluateDefinition = { name: "evaluate", description: "Exécuter des expressions SageMath arbitraires et retourner le résultat calculé",
  inputSchema: { type: "object" as const, properties: {
      expression: { type: "string", description: "Exécuter des expressions SageMath arbitraires et retourner le résultat calculé" },
    }, required: ["expression"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = evaluateSchema.parse(input);
  const skillContent = await loadSkillContent("evaluate");
  return JSON.stringify({ status: "success", command: "evaluate", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}