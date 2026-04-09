import { z } from "zod";
import { loadSkillContent } from "../knowledge/loader.js";

const solve_equationSchema = z.object({
  equation: z.string(),
  variable: z.string(),
  variables: z.string().optional(),
});

export const solve_equationDefinition = { name: "solve_equation", description: "Resolver ecuaciones algebraicas y trascendentales simbólicamente",
  inputSchema: { type: "object" as const, properties: {
      equation: { type: "string", description: "Resolver ecuaciones algebraicas y trascendentales simbólicamente" },
      variable: { type: "string", description: "Resolver ecuaciones algebraicas y trascendentales simbólicamente" },
      variables: { type: "string", description: "Resolver ecuaciones algebraicas y trascendentales simbólicamente" },
    }, required: ["equation", "variable"] } };

export async function handle(input: Record<string, unknown>): Promise<string> {
  const validated = solve_equationSchema.parse(input);
  const skillContent = await loadSkillContent("solve-equation");
  return JSON.stringify({ status: "success", command: "solve-equation", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);
}