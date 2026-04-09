import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CACHE = new Map<string, string>();

export async function loadSkillContent(skillId: string): Promise<string> {
  if (CACHE.has(skillId)) return CACHE.get(skillId)!;
  try {
    const p = resolve(__dirname, "../../knowledge/skills/" + skillId + ".md");
    const content = readFileSync(p, "utf-8");
    CACHE.set(skillId, content); return content;
  } catch { return ""; }
}

export async function loadCommandContent(commandId: string): Promise<string> {
  try { return readFileSync(resolve(__dirname, "../../knowledge/commands/" + commandId + ".md"), "utf-8"); }
  catch { return ""; }
}