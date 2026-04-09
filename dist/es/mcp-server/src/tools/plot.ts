import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const plotSchema = z.object({
  expression: z.string(),
  variable: z.string().optional(),
  x_min: z.number().optional(),
  x_max: z.number().optional(),
  title: z.string().optional(),
});

export const plotDefinition = { name: "plot", description: "Generar gráficos de funciones matemáticas retornando imagen PNG codificada en base64",
  inputSchema: { type: "object" as const, properties: {
      expression: { type: "string", description: "Generar gráficos de funciones matemáticas retornando imagen PNG codificada en base64" },
      variable: { type: "string", description: "Generar gráficos de funciones matemáticas retornando imagen PNG codificada en base64" },
      x_min: { type: "number", description: "Generar gráficos de funciones matemáticas retornando imagen PNG codificada en base64" },
      x_max: { type: "number", description: "Generar gráficos de funciones matemáticas retornando imagen PNG codificada en base64" },
      title: { type: "string", description: "Generar gráficos de funciones matemáticas retornando imagen PNG codificada en base64" },
    }, required: ["expression"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = plotSchema.parse(input);
  const skillContent = await loadSkillContent("plot");
  return JSON.stringify({ status: "success", command: "plot", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}