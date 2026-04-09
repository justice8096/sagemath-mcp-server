import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const simplifySchema = z.object({
  expression: z.string(),
  simplification_type: z.string().optional(),
  variables: z.string().optional(),
});

export const simplifyDefinition = { name: "simplify", description: "Simplificar expresiones matemáticas usando reglas algebraicas e identidades trigonométricas",
  inputSchema: { type: "object" as const, properties: {
      expression: { type: "string", description: "Simplificar expresiones matemáticas usando reglas algebraicas e identidades trigonométricas" },
      simplification_type: { type: "string", description: "Simplificar expresiones matemáticas usando reglas algebraicas e identidades trigonométricas" },
      variables: { type: "string", description: "Simplificar expresiones matemáticas usando reglas algebraicas e identidades trigonométricas" },
    }, required: ["expression"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = simplifySchema.parse(input);
  const skillContent = await loadSkillContent("simplify");
  return JSON.stringify({ status: "success", command: "simplify", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}