import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ParameterProperty {
  type: string;
  description: string;
  default?: string | boolean | number;
  items?: { type: string };
}

interface CommandParameters {
  type: string;
  properties: Record<string, ParameterProperty>;
  required: string[];
}

interface Command {
  name: string;
  displayName: string;
  description: string;
  path: string;
  parameters: CommandParameters;
  keywords: string[];
}

interface Skill {
  name: string;
  displayName: string;
  description: string;
  path: string;
  keywords: string[];
}

interface Template {
  name: string;
  displayName: string;
  description: string;
  path: string;
}

interface Metadata {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  repository?: string;
  keywords: string[];
  defaultLocale?: string;
  locales?: string[];
}

interface Manifest {
  metadata: Metadata;
  skills: Skill[];
  commands: Command[];
  templates: Template[];
}

interface LocaleOverrides {
  metadata?: Partial<Pick<Metadata, "name" | "description">>;
  skills?: Record<string, { displayName?: string; description?: string }>;
  commands?: Record<string, {
    displayName?: string;
    description?: string;
    parameters?: Record<string, { description?: string }>;
  }>;
  templates?: Record<string, { displayName?: string; description?: string }>;
}

type FormatName = "claude-plugin" | "openai" | "n8n" | "prompts" | "mcp" | "cli";

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CLIArgs {
  format: FormatName | "all";
  locale: string;
  watch: boolean;
  clean: boolean;
  validateOnly: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = { format: "all", locale: "all", watch: false, clean: false, validateOnly: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--format" && args[i + 1]) { result.format = args[++i] as FormatName | "all"; }
    else if (arg.startsWith("--format=")) { result.format = arg.split("=")[1] as FormatName | "all"; }
    else if (arg === "--locale" && args[i + 1]) { result.locale = args[++i]; }
    else if (arg.startsWith("--locale=")) { result.locale = arg.split("=")[1]; }
    else if (arg === "--watch") { result.watch = true; }
    else if (arg === "--clean") { result.clean = true; }
    else if (arg === "--validate-only") { result.validateOnly = true; }
  }
  return result;
}

// ============================================================================
// SIMPLE YAML STRINGIFIER (zero dependencies)
// ============================================================================

function stringifyYaml(obj: unknown, indent: number = 2): string {
  function stringify(val: unknown, depth: number = 0): string {
    const spaces = " ".repeat(depth * indent);
    if (val === null || val === undefined) return "null";
    if (typeof val === "string") {
      if (val.includes("\n") || val.includes(":") || val.includes("#")) {
        return "'" + val.replace(/'/g, "''") + "'";
      }
      return val;
    }
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val)) {
      if (val.length === 0) return "[]";
      const items: string[] = [];
      for (const item of val) { items.push("- " + stringify(item, depth + 1)); }
      return items.join("\n" + spaces);
    }
    if (typeof val === "object") {
      const entries = Object.entries(val);
      if (entries.length === 0) return "{}";
      const items: string[] = [];
      for (const [key, value] of entries) {
        if (typeof value === "object" && value !== null) {
          items.push(key + ":");
          const nested = stringify(value, depth + 1);
          for (const line of nested.split("\n")) { items.push("  " + line); }
        } else { items.push(key + ": " + stringify(value, depth + 1)); }
      }
      return items.join("\n" + spaces);
    }
    return String(val);
  }
  return stringify(obj);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function ensureDir(dirPath: string): void { mkdirSync(dirPath, { recursive: true }); }

function readMarkdown(filePath: string): string {
  try {
    let content = readFileSync(filePath, "utf-8");
    if (content.charCodeAt(0) === 0xfeff) { content = content.slice(1); }
    return content;
  } catch { console.warn("Warning: Could not read " + filePath); return ""; }
}

function log(message: string): void { console.log("[build] " + message); }
function logSuccess(message: string): void { console.log("\u2713 " + message); }
function logError(message: string): void { console.error("\u2717 " + message); }

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function toPascalCase(name: string): string {
  return name.split(/[-_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}
function toSnakeCase(name: string): string { return name.replace(/-/g, "_"); }

// ============================================================================
// LOCALE RESOLUTION
// ============================================================================

function isMultiLocale(manifest: Manifest): boolean {
  return Array.isArray(manifest.metadata.locales) && manifest.metadata.locales.length > 0;
}

function getDefaultLocale(manifest: Manifest): string {
  return manifest.metadata.defaultLocale || "en";
}

function getActiveLocales(manifest: Manifest, cliLocale: string): string[] {
  if (!isMultiLocale(manifest)) return [getDefaultLocale(manifest)];
  if (cliLocale === "all") return manifest.metadata.locales!;
  if (manifest.metadata.locales!.includes(cliLocale)) return [cliLocale];
  logError("Locale '" + cliLocale + "' not in manifest.metadata.locales: " + manifest.metadata.locales!.join(", "));
  process.exit(1);
}

function loadLocaleOverrides(locale: string, defaultLocale: string): LocaleOverrides | null {
  if (locale === defaultLocale) return null;
  const overridePath = resolve(__dirname, "source/locales/" + locale + ".json");
  if (!existsSync(overridePath)) {
    console.warn("Warning: No locale override file for '" + locale + "' at " + overridePath);
    return null;
  }
  try {
    return JSON.parse(readFileSync(overridePath, "utf-8")) as LocaleOverrides;
  } catch (err) {
    logError("Failed to parse locale file for '" + locale + "': " + (err instanceof Error ? err.message : String(err)));
    return null;
  }
}

function resolveLocalizedManifest(manifest: Manifest, locale: string): Manifest {
  const defaultLocale = getDefaultLocale(manifest);
  const overrides = loadLocaleOverrides(locale, defaultLocale);
  if (!overrides) return manifest;

  // Deep clone to avoid mutating the original
  const localized: Manifest = JSON.parse(JSON.stringify(manifest));

  // Override metadata display strings
  if (overrides.metadata) {
    if (overrides.metadata.name) localized.metadata.name = overrides.metadata.name;
    if (overrides.metadata.description) localized.metadata.description = overrides.metadata.description;
  }

  // Override skill display strings
  if (overrides.skills) {
    for (const skill of localized.skills) {
      const so = overrides.skills[skill.name];
      if (so) {
        if (so.displayName) skill.displayName = so.displayName;
        if (so.description) skill.description = so.description;
      }
    }
  }

  // Override command display strings and parameter descriptions
  if (overrides.commands) {
    for (const cmd of localized.commands) {
      const co = overrides.commands[cmd.name];
      if (co) {
        if (co.displayName) cmd.displayName = co.displayName;
        if (co.description) cmd.description = co.description;
        if (co.parameters) {
          for (const [pName, pOverride] of Object.entries(co.parameters)) {
            if (cmd.parameters.properties[pName] && pOverride.description) {
              cmd.parameters.properties[pName].description = pOverride.description;
            }
          }
        }
      }
    }
  }

  // Override template display strings
  if (overrides.templates) {
    for (const tmpl of localized.templates) {
      const to = overrides.templates[tmpl.name];
      if (to) {
        if (to.displayName) tmpl.displayName = to.displayName;
        if (to.description) tmpl.description = to.description;
      }
    }
  }

  return localized;
}

// ============================================================================
// LOAD AND VALIDATE
// ============================================================================

function loadManifest(): Manifest {
  log("Loading manifest.json...");
  const manifestPath = resolve(__dirname, "source/manifest.json");
  const raw = JSON.parse(readFileSync(manifestPath, "utf-8"));
  if (!raw.metadata || !raw.metadata.name || !raw.metadata.version) {
    throw new Error("Manifest missing required metadata fields (name, version)");
  }
  if (!Array.isArray(raw.commands) || raw.commands.length === 0) {
    throw new Error("Manifest must have at least one command");
  }
  if (!Array.isArray(raw.skills)) { throw new Error("Manifest must have a skills array"); }
  if (!Array.isArray(raw.templates)) { raw.templates = []; }
  for (const cmd of raw.commands) {
    if (!cmd.parameters || !cmd.parameters.properties) {
      throw new Error(`Command "${cmd.name}" missing JSON Schema parameters`);
    }
  }

  // Validate locale configuration
  if (raw.metadata.locales && Array.isArray(raw.metadata.locales)) {
    const defaultLocale = raw.metadata.defaultLocale || "en";
    if (!raw.metadata.locales.includes(defaultLocale)) {
      throw new Error("metadata.locales must include defaultLocale ('" + defaultLocale + "')");
    }
    for (const locale of raw.metadata.locales) {
      if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
        throw new Error("Invalid locale code '" + locale + "' — expected BCP 47 format (e.g., 'en', 'es', 'pt-BR')");
      }
    }
    log("Multi-locale mode: " + raw.metadata.locales.join(", ") + " (default: " + defaultLocale + ")");
  }

  logSuccess("Manifest loaded (" + raw.commands.length + " commands, " + raw.skills.length + " skills)");
  return raw as Manifest;
}

// Locale-aware content loaders with fallback chain:
//   source/skills/<locale>/<name>.md  →  source/skills/<name>.md

function loadSkillMarkdown(skillName: string, locale?: string): string {
  if (locale) {
    const localizedPath = resolve(__dirname, "source/skills/" + locale + "/" + skillName + ".md");
    if (existsSync(localizedPath)) return readMarkdown(localizedPath);
  }
  return readMarkdown(resolve(__dirname, "source/skills/" + skillName + ".md"));
}

function loadCommandMarkdown(commandName: string, locale?: string): string {
  if (locale) {
    const localizedPath = resolve(__dirname, "source/commands/" + locale + "/" + commandName + ".md");
    if (existsSync(localizedPath)) return readMarkdown(localizedPath);
  }
  return readMarkdown(resolve(__dirname, "source/commands/" + commandName + ".md"));
}

function loadTemplateMarkdown(templateName: string, locale?: string): string {
  if (locale) {
    const localizedPath = resolve(__dirname, "source/templates/" + locale + "/" + templateName + ".md");
    if (existsSync(localizedPath)) return readMarkdown(localizedPath);
  }
  return readMarkdown(resolve(__dirname, "source/templates/" + templateName + ".md"));
}

// ============================================================================
// OUTPUT PATH HELPER
// ============================================================================

// In multi-locale mode: dist/<locale>/<format>/
// In single-locale mode: dist/<format>/  (backward compatible)
function distPath(format: string, multiLocale: boolean, locale?: string): string {
  if (multiLocale && locale) {
    return resolve(__dirname, "dist/" + locale + "/" + format);
  }
  return resolve(__dirname, "dist/" + format);
}

// ============================================================================
// FORMAT 1: CLAUDE PLUGIN
// ============================================================================

function generateClaudePlugin(manifest: Manifest, multiLocale: boolean, locale?: string): void {
  log("Generating Claude Code plugin" + (locale ? " [" + locale + "]" : "") + "...");
  const base = distPath("claude-plugin", multiLocale, locale);
  ensureDir(base); ensureDir(resolve(base, "skills")); ensureDir(resolve(base, "commands"));
  const slug = toSlug(manifest.metadata.name);
  const plugin = {
    name: slug, version: manifest.metadata.version, description: manifest.metadata.description,
    author: manifest.metadata.author, license: manifest.metadata.license,
    keywords: manifest.metadata.keywords,
    ...(locale ? { locale } : {}),
    skills: manifest.skills.map((s) => ({ name: s.name, description: s.description, path: "skills/" + s.name })),
    commands: manifest.commands.map((c) => ({ name: c.name, description: c.description, path: "commands/" + c.name + ".md" })),
  };
  writeFileSync(resolve(base, "plugin.json"), JSON.stringify(plugin, null, 2));
  for (const skill of manifest.skills) {
    ensureDir(resolve(base, "skills/" + skill.name));
    writeFileSync(resolve(base, "skills/" + skill.name + "/SKILL.md"), loadSkillMarkdown(skill.name, locale));
  }
  for (const cmd of manifest.commands) {
    writeFileSync(resolve(base, "commands/" + cmd.name + ".md"), loadCommandMarkdown(cmd.name, locale));
  }
  logSuccess("Claude plugin generated" + (locale ? " [" + locale + "]" : ""));
}

// ============================================================================
// FORMAT 2: OPENAI FUNCTIONS
// ============================================================================

function generateOpenAIFunctions(manifest: Manifest, multiLocale: boolean, locale?: string): void {
  log("Generating OpenAI function schemas" + (locale ? " [" + locale + "]" : "") + "...");
  const base = distPath("openai", multiLocale, locale);
  ensureDir(base);
  const functions = manifest.commands.map((cmd) => {
    const properties: Record<string, unknown> = {};
    const required: string[] = cmd.parameters.required || [];
    for (const [paramName, paramDef] of Object.entries(cmd.parameters.properties)) {
      const prop: Record<string, unknown> = { type: paramDef.type === "array" ? "array" : paramDef.type, description: paramDef.description };
      if (paramDef.items) prop.items = paramDef.items;
      if (paramDef.default !== undefined) prop.default = paramDef.default;
      properties[paramName] = prop;
    }
    return { type: "function", function: { name: toSnakeCase(cmd.name), description: cmd.description, parameters: { type: "object", properties, required } } };
  });
  writeFileSync(resolve(base, "functions.json"), JSON.stringify(functions, null, 2));
  logSuccess("OpenAI functions generated" + (locale ? " [" + locale + "]" : ""));
}

// ============================================================================
// FORMAT 3: N8N NODE
// ============================================================================

function generateN8nNode(manifest: Manifest, multiLocale: boolean, locale?: string): void {
  log("Generating n8n node definition" + (locale ? " [" + locale + "]" : "") + "...");
  const base = distPath("n8n", multiLocale, locale);
  ensureDir(base);
  const pascalName = toPascalCase(manifest.metadata.name);
  const slug = toSlug(manifest.metadata.name);
  const operations = manifest.commands.map((cmd) => ({ name: cmd.displayName, value: toSnakeCase(cmd.name), description: cmd.description }));
  const paramFields = manifest.commands.flatMap((cmd) =>
    Object.entries(cmd.parameters.properties).map(([paramName, paramDef]) => ({
      displayName: paramName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      name: paramName,
      type: paramDef.type === "array" ? "string" : paramDef.type === "boolean" ? "boolean" : "string",
      required: (cmd.parameters.required || []).includes(paramName),
      default: paramDef.default ?? "", description: paramDef.description,
      displayOptions: { show: { operation: [toSnakeCase(cmd.name)] } },
    }))
  );
  const node = {
    displayName: manifest.metadata.name, name: slug.replace(/-/g, ""), icon: "file:icon.svg",
    group: ["transform"], version: 1, description: manifest.metadata.description,
    defaults: { name: manifest.metadata.name }, inputs: ["main"], outputs: ["main"],
    properties: [{ displayName: "Operation", name: "operation", type: "options", options: operations, default: operations[0]?.value || "" }, ...paramFields],
  };
  writeFileSync(resolve(base, pascalName + ".node.json"), JSON.stringify(node, null, 2));
  logSuccess("n8n node definition generated" + (locale ? " [" + locale + "]" : ""));
}

// ============================================================================
// FORMAT 4: PROMPT LIBRARY
// ============================================================================

function generatePromptLibrary(manifest: Manifest, multiLocale: boolean, locale?: string): void {
  log("Generating prompt library" + (locale ? " [" + locale + "]" : "") + "...");
  const base = distPath("prompts", multiLocale, locale);
  ensureDir(base);
  const promptIndex = {
    name: manifest.metadata.name + " Prompts", version: manifest.metadata.version,
    description: manifest.metadata.description, author: manifest.metadata.author,
    ...(locale ? { locale } : {}),
    prompts: manifest.commands.map((cmd) => ({ id: cmd.name, name: cmd.displayName, description: cmd.description, file: cmd.name + ".yaml" })),
  };
  writeFileSync(resolve(base, "index.yaml"), stringifyYaml(promptIndex, 2));
  const expertise = manifest.skills.map((s) => s.description);
  for (const cmd of manifest.commands) {
    const prompt = {
      name: cmd.displayName, id: cmd.name, description: cmd.description,
      ...(locale ? { locale } : {}),
      models: ["gpt-4", "gpt-4-turbo", "claude-3-opus", "claude-3-sonnet", "claude-3.5-sonnet"],
      context: { role: "You are an expert assistant for " + manifest.metadata.name + ". " + manifest.metadata.description, expertise },
      parameters: Object.entries(cmd.parameters.properties).map(([name, def]) => ({
        name, type: def.type, required: (cmd.parameters.required || []).includes(name), description: def.description, default: def.default,
      })),
      output: { format: "markdown", description: "Comprehensive " + cmd.displayName.toLowerCase() + " document" },
    };
    writeFileSync(resolve(base, cmd.name + ".yaml"), stringifyYaml(prompt, 2));
  }
  logSuccess("Prompt library generated" + (locale ? " [" + locale + "]" : ""));
}

// ============================================================================
// FORMAT 5: MCP SERVER
// ============================================================================

function generateMcpServer(manifest: Manifest, multiLocale: boolean, locale?: string): void {
  log("Generating MCP server" + (locale ? " [" + locale + "]" : "") + "...");
  const base = distPath("mcp-server", multiLocale, locale);
  ensureDir(resolve(base, "src/tools")); ensureDir(resolve(base, "src/knowledge"));
  ensureDir(resolve(base, "knowledge/skills")); ensureDir(resolve(base, "knowledge/commands"));
  const slug = toSlug(manifest.metadata.name);

  for (const cmd of manifest.commands) {
    const toolName = toSnakeCase(cmd.name);
    const requiredParams = cmd.parameters.required || [];
    const zodFields: string[] = []; const jsonSchemaProps: string[] = [];
    for (const [paramName, paramDef] of Object.entries(cmd.parameters.properties)) {
      let zField = "  " + paramName + ": z.";
      if (paramDef.type === "array") zField += "array(z.string())";
      else if (paramDef.type === "boolean") zField += "boolean()";
      else if (paramDef.type === "number") zField += "number()";
      else zField += "string()";
      if (!requiredParams.includes(paramName)) zField += ".optional()";
      zField += ","; zodFields.push(zField);
      let jsProp = "      " + paramName + ': { type: "' + paramDef.type + '", description: "' + cmd.description.replace(/"/g, '\\"') + '" }';
      jsonSchemaProps.push(jsProp);
    }
    const toolCode = ['import { z } from "zod";', 'import { loadSkillContent } from "../knowledge/loader.js";', "",
      "const " + toolName + "Schema = z.object({", ...zodFields, "});", "",
      "export const " + toolName + 'Definition = { name: "' + toolName + '", description: "' + cmd.description.replace(/"/g, '\\"') + '",',
      "  inputSchema: { type: \"object\" as const, properties: {", ...jsonSchemaProps.map((p) => p + ","),
      "    }, required: [" + requiredParams.map((p) => '"' + p + '"').join(", ") + "] } };", "",
      "export async function handle(input: Record<string, unknown>): Promise<string> {",
      "  const validated = " + toolName + "Schema.parse(input);",
      '  const skillContent = await loadSkillContent("' + cmd.name + '");',
      '  return JSON.stringify({ status: "success", command: "' + cmd.name + '", message: "Tool executed.", skillPreview: skillContent.slice(0, 200), input: validated }, null, 2);',
      "}"].join("\n");
    writeFileSync(resolve(base, "src/tools/" + toolName + ".ts"), toolCode);
  }

  const loaderCode = ['import { readFileSync } from "fs";', 'import { resolve, dirname } from "path";', 'import { fileURLToPath } from "url";', "",
    "const __filename = fileURLToPath(import.meta.url);", "const __dirname = dirname(__filename);", "",
    "const CACHE = new Map<string, string>();", "",
    "export async function loadSkillContent(skillId: string): Promise<string> {",
    '  if (CACHE.has(skillId)) return CACHE.get(skillId)!;', "  try {",
    '    const p = resolve(__dirname, "../../knowledge/skills/" + skillId + ".md");',
    '    const content = readFileSync(p, "utf-8");', "    CACHE.set(skillId, content); return content;",
    '  } catch { return ""; }', "}", "",
    "export async function loadCommandContent(commandId: string): Promise<string> {",
    '  try { return readFileSync(resolve(__dirname, "../../knowledge/commands/" + commandId + ".md"), "utf-8"); }',
    '  catch { return ""; }', "}"].join("\n");
  writeFileSync(resolve(base, "src/knowledge/loader.ts"), loaderCode);

  const toolImports: string[] = []; const toolDefs: string[] = []; const toolHandlerCases: string[] = [];
  for (const cmd of manifest.commands) {
    const toolName = toSnakeCase(cmd.name);
    toolImports.push("import { " + toolName + "Definition, handle as handle_" + toolName + ' } from "./tools/' + toolName + '.js";');
    toolDefs.push("  " + toolName + "Definition,");
    toolHandlerCases.push('      case "' + toolName + '": return { content: [{ type: "text", text: await handle_' + toolName + "(args) }] };");
  }
  const indexCode = ['import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";',
    'import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";', "",
    ...toolImports, "", "const tools = [", ...toolDefs, "];", "",
    "async function main(): Promise<void> {",
    '  const server = new McpServer({ name: "' + slug + '-mcp", version: "' + manifest.metadata.version + '" });',
    "  const transport = new StdioServerTransport();",
    '  server.server.setRequestHandler("tools/list", async () => ({ tools }));',
    '  server.server.setRequestHandler("tools/call", async (request: { params: { name: string; arguments?: Record<string, unknown> } }) => {',
    "    const { name, arguments: args = {} } = request.params;", "    switch (name) {",
    ...toolHandlerCases, '      default: throw new Error("Unknown tool: " + name);', "    }", "  });",
    "  await server.connect(transport);",
    '  console.error("' + manifest.metadata.name + ' MCP Server running on stdio");', "}", "",
    'main().catch((error) => { console.error("Fatal error:", error); process.exit(1); });'].join("\n");
  writeFileSync(resolve(base, "src/index.ts"), indexCode);

  const mcpPkg = { name: "@" + slug + "/mcp-server", version: manifest.metadata.version,
    description: manifest.metadata.description, author: manifest.metadata.author,
    license: manifest.metadata.license, type: "module", main: "src/index.ts",
    scripts: { start: "tsx src/index.ts", build: "tsc", "type-check": "tsc --noEmit" },
    dependencies: { "@modelcontextprotocol/sdk": "^0.6.0", zod: "^3.22.4" },
    devDependencies: { "@types/node": "^20.10.0", typescript: "^5.3.3", tsx: "^4.7.0" } };
  writeFileSync(resolve(base, "package.json"), JSON.stringify(mcpPkg, null, 2));

  const mcpTsconfig = { compilerOptions: { target: "ES2020", module: "ESNext", lib: ["ES2020"],
    moduleResolution: "bundler", strict: true, esModuleInterop: true, skipLibCheck: true,
    forceConsistentCasingInFileNames: true, resolveJsonModule: true, declaration: true,
    outDir: "./dist", rootDir: "./src" }, include: ["src/**/*"], exclude: ["node_modules"] };
  writeFileSync(resolve(base, "tsconfig.json"), JSON.stringify(mcpTsconfig, null, 2));

  for (const skill of manifest.skills) {
    writeFileSync(resolve(base, "knowledge/skills/" + skill.name + ".md"), loadSkillMarkdown(skill.name, locale));
  }
  for (const cmd of manifest.commands) {
    writeFileSync(resolve(base, "knowledge/commands/" + cmd.name + ".md"), loadCommandMarkdown(cmd.name, locale));
  }
  logSuccess("MCP server generated" + (locale ? " [" + locale + "]" : ""));
}

// ============================================================================
// FORMAT 6: STANDALONE CLI
// ============================================================================

function generateCli(manifest: Manifest, multiLocale: boolean, locale?: string): void {
  log("Generating standalone CLI" + (locale ? " [" + locale + "]" : "") + "...");
  const base = distPath("cli", multiLocale, locale);
  ensureDir(base);
  const commandHelp = manifest.commands.map((cmd) => '  "  ' + cmd.name + ' -- ' + cmd.description + '\\n" +').join("\n");
  const commandCases: string[] = [];
  for (const cmd of manifest.commands) {
    const paramLines: string[] = [];
    for (const [paramName, paramDef] of Object.entries(cmd.parameters.properties)) {
      const isRequired = (cmd.parameters.required || []).includes(paramName);
      paramLines.push("        " + paramName + ': args["--' + paramName.replace(/_/g, "-") + '"] || ' +
        (paramDef.default !== undefined ? JSON.stringify(paramDef.default) :
          isRequired ? '(() => { console.error("Missing required: --' + paramName.replace(/_/g, "-") + '"); process.exit(1); })()' : "undefined") + ",");
    }
    commandCases.push(['    case "' + cmd.name + '":', "      return {", '        command: "' + cmd.name + '",',
      '        displayName: "' + cmd.displayName + '",', "        params: {", ...paramLines, "        },", "      };"].join("\n"));
  }
  const cliCode = ["#!/usr/bin/env tsx",
    "// Auto-generated CLI — project name is read from manifest at build time",
    "// Run: tsx cli.ts <command> [--param value ...]", "",
    'const VERSION = "' + manifest.metadata.version + '";',
    'const NAME = "' + manifest.metadata.name + '";', "",
    "function showHelp(): void {",
    '  console.log(NAME + " CLI v" + VERSION);', '  console.log("");',
    '  console.log("Usage: tsx cli.ts <command> [options]");', '  console.log("");',
    '  console.log("Commands:");', "  console.log(", commandHelp, '  ""', "  );",
    '  console.log("Options:");', '  console.log("  --help     Show this help message");',
    '  console.log("  --version  Show version");', "}", "",
    "function parseCliArgs(): Record<string, string> {",
    "  const args: Record<string, string> = {};", "  const raw = process.argv.slice(3);",
    "  for (let i = 0; i < raw.length; i++) {",
    '    if (raw[i].startsWith("--") && raw[i + 1] && !raw[i + 1].startsWith("--")) { args[raw[i]] = raw[++i]; }',
    '    else if (raw[i].includes("=")) { const [key, ...val] = raw[i].split("="); args[key] = val.join("="); }',
    "  }", "  return args;", "}", "",
    "function routeCommand(command: string, args: Record<string, string>): unknown {",
    "  switch (command) {", ...commandCases, "    default:",
    '      console.error("Unknown command: " + command);', "      showHelp();", "      process.exit(1);",
    "  }", "}", "", "const command = process.argv[2];", "",
    'if (!command || command === "--help") { showHelp(); process.exit(0); }',
    'if (command === "--version") { console.log(VERSION); process.exit(0); }', "",
    "const args = parseCliArgs();", "const result = routeCommand(command, args);",
    "console.log(JSON.stringify(result, null, 2));"].join("\n");
  writeFileSync(resolve(base, "cli.ts"), cliCode);
  logSuccess("Standalone CLI generated" + (locale ? " [" + locale + "]" : ""));
}

// ============================================================================
// FORMAT REGISTRY
// ============================================================================

const FORMAT_GENERATORS: Record<FormatName, (manifest: Manifest, multiLocale: boolean, locale?: string) => void> = {
  "claude-plugin": generateClaudePlugin, openai: generateOpenAIFunctions,
  n8n: generateN8nNode, prompts: generatePromptLibrary, mcp: generateMcpServer, cli: generateCli,
};

// ============================================================================
// MAIN BUILD
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs();
  try {
    if (args.clean) {
      log("Cleaning dist/...");
      if (existsSync(resolve(__dirname, "dist"))) { rmSync(resolve(__dirname, "dist"), { recursive: true }); }
      logSuccess("Cleaned");
      if (args.format === "all" && !args.validateOnly) { /* continue */ }
      else if (args.validateOnly) { /* continue */ }
      else { return; }
    }
    log("Starting build..."); log("Output directory: " + resolve(__dirname, "dist"));
    const manifest = loadManifest();
    if (args.validateOnly) { logSuccess("Manifest is valid!"); return; }

    const multiLocale = isMultiLocale(manifest);
    const activeLocales = getActiveLocales(manifest, args.locale);

    if (multiLocale) {
      log("Building for " + activeLocales.length + " locale(s): " + activeLocales.join(", "));
    }

    for (const locale of activeLocales) {
      const localizedManifest = resolveLocalizedManifest(manifest, locale);

      if (multiLocale) {
        log(""); log("=== Locale: " + locale + " ===");
      }

      if (args.format === "all") {
        for (const [, generator] of Object.entries(FORMAT_GENERATORS)) {
          generator(localizedManifest, multiLocale, locale);
        }
      } else {
        const generator = FORMAT_GENERATORS[args.format];
        if (!generator) throw new Error("Unknown format: " + args.format);
        generator(localizedManifest, multiLocale, locale);
      }
    }

    log(""); logSuccess("Build completed successfully!"); log("Generated artifacts:");
    for (const locale of activeLocales) {
      const prefix = multiLocale ? "dist/" + locale + "/" : "dist/";
      if (multiLocale) log("  [" + locale + "]");
      if (args.format === "all" || args.format === "claude-plugin") log("  - " + prefix + "claude-plugin/ (plugin.json + skills/ + commands/)");
      if (args.format === "all" || args.format === "openai") log("  - " + prefix + "openai/functions.json");
      if (args.format === "all" || args.format === "n8n") log("  - " + prefix + "n8n/*.node.json");
      if (args.format === "all" || args.format === "prompts") log("  - " + prefix + "prompts/*.yaml");
      if (args.format === "all" || args.format === "mcp") log("  - " + prefix + "mcp-server/ (full TypeScript MCP server)");
      if (args.format === "all" || args.format === "cli") log("  - " + prefix + "cli/cli.ts (standalone CLI)");
    }
  } catch (error) {
    logError("Build failed!");
    if (error instanceof Error) console.error(error.message); else console.error(error);
    process.exit(1);
  }
}

main().catch((err) => { console.error("Build failed:", err); process.exit(1); });