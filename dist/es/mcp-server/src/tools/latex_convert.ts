import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const latex_convertSchema = z.object({
  expression: z.string(),
  variables: z.string().optional(),
});

export const latex_convertDefinition = { name: "latex_convert", description: "Convertir expresiones matemáticas a notación LaTeX para preparación de documentos",
  inputSchema: { type: "object" as const, properties: {
      expression: { type: "string", description: "Convertir expresiones matemáticas a notación LaTeX para preparación de documentos" },
      variables: { type: "string", description: "Convertir expresiones matemáticas a notación LaTeX para preparación de documentos" },
    }, required: ["expression"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = latex_convertSchema.parse(input);
  const skillContent = await loadSkillContent("latex-convert");
  return JSON.stringify({ status: "success", command: "latex-convert", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}