import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const matrix_opsSchema = z.object({
  matrix: z.string(),
  operation: z.string(),
  ring: z.string().optional(),
});

export const matrix_opsDefinition = { name: "matrix_ops", description: "Effectuer des opérations matricielles: déterminant, inverse, valeurs propres, rang, RREF",
  inputSchema: { type: "object" as const, properties: {
      matrix: { type: "string", description: "Effectuer des opérations matricielles: déterminant, inverse, valeurs propres, rang, RREF" },
      operation: { type: "string", description: "Effectuer des opérations matricielles: déterminant, inverse, valeurs propres, rang, RREF" },
      ring: { type: "string", description: "Effectuer des opérations matricielles: déterminant, inverse, valeurs propres, rang, RREF" },
    }, required: ["matrix", "operation"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = matrix_opsSchema.parse(input);
  const skillContent = await loadSkillContent("matrix-ops");
  return JSON.stringify({ status: "success", command: "matrix-ops", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}