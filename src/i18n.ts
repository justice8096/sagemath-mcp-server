import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { LocaleData } from "./types.js";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let currentLocale = DEFAULT_LOCALE;
let localeData: LocaleData = {};

// Built-in English messages. Used when a locale file is missing or lacks a
// key, so errors always carry their detail even if locale files are absent.
const BUILTIN_EN: Record<string, string> = {
  "errors.sage_not_found":
    "SageMath not found. Install SageMath locally or install Docker (see SAGE_EXECUTION_MODE and SAGE_DOCKER_IMAGE).",
  "errors.timeout":
    "Computation timed out after {seconds} seconds. Try a simpler expression or increase SAGE_TIMEOUT.",
  "errors.invalid_expression": "Invalid mathematical expression: {detail}",
  "errors.execution_failed": "SageMath execution failed: {detail}",
  "errors.invalid_matrix": "Invalid matrix definition: {detail}",
  "errors.invalid_operation": "Unknown operation: {operation}",
  "status.using_local": "Using local SageMath installation",
  "status.using_docker": "Using Docker SageMath ({image})",
  "status.initialized": "SageMath MCP server initialized",
};

export async function initI18n(locale: string): Promise<void> {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    console.warn(
      `[i18n] Unsupported locale '${locale}', falling back to '${DEFAULT_LOCALE}'`
    );
    locale = DEFAULT_LOCALE;
  }

  currentLocale = locale;

  try {
    if (locale === DEFAULT_LOCALE) {
      // Load base English locale
      const data = readFileSync(
        resolve(__dirname, "../source/locales/en.json"),
        "utf-8"
      );
      localeData = JSON.parse(data);
    } else {
      // Load locale override file
      const data = readFileSync(
        resolve(__dirname, `../source/locales/${locale}.json`),
        "utf-8"
      );
      localeData = JSON.parse(data);
    }

    console.error(`[i18n] Loaded locale: ${locale}`);
  } catch (error) {
    console.warn(
      `[i18n] Failed to load locale file for '${locale}':`,
      error instanceof Error ? error.message : String(error)
    );
    localeData = {};
  }
}

export function t(
  key: string,
  params?: Record<string, string | number>
): string {
  let value: any = localeData;
  for (const k of key.split(".")) {
    value = value?.[k];
    if (value === undefined) break;
  }

  // Fall back to built-in English, then to an empty string so that callers
  // can write t(key) || "default text".
  let result: string =
    typeof value === "string" ? value : BUILTIN_EN[key] ?? "";

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result.split(`{${paramKey}}`).join(String(paramValue));
    }
  }

  return result;
}

export function getCurrentLocale(): string {
  return currentLocale;
}