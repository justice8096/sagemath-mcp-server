import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const matrix_opsSchema = z.object({
  matrix: z.string(),
  operation: z.string(),
  ring: z.string().optional(),
});

export const matrix_opsDefinition = { name: "matrix_ops", description: "Perform matrix operations: determinant, inverse, eigenvalues, rank, RREF",
  inputSchema: { type: "object" as const, properties: {
      matrix: { type: "string", description: "Perform matrix operations: determinant, inverse, eigenvalues, rank, RREF" },
      operation: { type: "string", description: "Perform matrix operations: determinant, inverse, eigenvalues, rank, RREF" },
      ring: { type: "string", description: "Perform matrix operations: determinant, inverse, eigenvalues, rank, RREF" },
    }, required: ["matrix", "operation"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = matrix_opsSchema.parse(input);
  const skillContent = await loadSkillContent("matrix-ops");
  return JSON.stringify({ status: "success", command: "matrix-ops", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}