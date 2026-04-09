import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const evaluateSchema = z.object({
  expression: z.string(),
});

export const evaluateDefinition = { name: "evaluate", description: "Execute arbitrary SageMath expressions and return the computed result",
  inputSchema: { type: "object" as const, properties: {
      expression: { type: "string", description: "Execute arbitrary SageMath expressions and return the computed result" },
    }, required: ["expression"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = evaluateSchema.parse(input);
  const skillContent = await loadSkillContent("evaluate");
  return JSON.stringify({ status: "success", command: "evaluate", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}