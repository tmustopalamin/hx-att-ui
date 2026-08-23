import { cookies } from "next/headers";
import {
  LOCALE_COOKIE_NAME,
  getLocaleFromCookieValue,
  loadMessages,
  type Locale,
} from "./config";

export const getInitialLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  return getLocaleFromCookieValue(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
};

export const loadInitialMessages = async (locale: Locale) =>
  loadMessages(locale);
