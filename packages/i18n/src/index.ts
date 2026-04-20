import ar from "./locales/ar";
import en from "./locales/en";

export type Locale = "en" | "ar";
export type { TranslationKeys } from "./locales/en";

const translations = { en, ar } as const;

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object ? `${K}.${NestedKeyOf<T[K]>}` : K;
    }[keyof T & string]
  : never;

type TranslationKey = NestedKeyOf<typeof en>;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

export function t(key: TranslationKey, locale: Locale = "en"): string {
  return getNestedValue(translations[locale] as unknown as Record<string, unknown>, key);
}

export function isRTL(locale: Locale): boolean {
  return locale === "ar";
}

export { en, ar };
