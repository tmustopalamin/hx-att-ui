export const LOCALE_COOKIE_NAME = "ui_locale";
export const DEFAULT_LOCALE = "en" as const;

export const SUPPORTED_LOCALES = ["en", "id", "zh-CN"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type MessageValues = Record<string, string>;

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" &&
  (SUPPORTED_LOCALES as readonly string[]).includes(value);

export const normalizeLocale = (value: unknown): Locale =>
  isLocale(value) ? value : DEFAULT_LOCALE;

export const getLocaleFromCookieValue = (value: unknown): Locale =>
  normalizeLocale(value);

export const localeLabel = (locale: Locale): string => {
  switch (locale) {
    case "id":
      return "Bahasa Indonesia";
    case "zh-CN":
      return "简体中文";
    default:
      return "English";
  }
};

export const localeShortLabel = (locale: Locale): string => {
  switch (locale) {
    case "id":
      return "ID";
    case "zh-CN":
      return "中文";
    default:
      return "EN";
  }
};

export const localeLoaders: Record<Locale, () => Promise<MessageValues>> = {
  en: async () => (await import("./messages/en")).default,
  id: async () => (await import("./messages/id")).default,
  "zh-CN": async () => (await import("./messages/zh-CN")).default,
};

export const loadMessages = async (locale: Locale): Promise<MessageValues> =>
  localeLoaders[locale]();
