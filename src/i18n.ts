import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { LocaleData } from "./types.js";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let currentLocale = DEFAULT_LOCALE;
let localeData: LocaleData = {};

export async function initI18n(locale: string): Promise<void> {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    console.warn(
      `[i18n] Unsupported locale '"'"'${locale}'"'"', falling back to '"'"'${DEFAULT_LOCALE}'"'"'`
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
      `[i18n] Failed to load locale file for '"'"'${locale}'"'"':`,
      error instanceof Error ? error.message : String(error)
    );
    localeData = {};
  }
}

export function t(
  key: string,
  params?: Record<string, string | number>
): string {
  const keys = key.split(".");
  let value: any = localeData;

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      console.warn(`[i18n] Missing translation key: ${key}`);
      return key;
    }
  }

  if (typeof value !== "string") {
    return key;
  }

  // Replace parameters
  if (params) {
    let result = value;
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result.replace(`{${paramKey}}`, String(paramValue));
    }
    return result;
  }

  return value;
}

export function getCurrentLocale(): string {
  return currentLocale;
}