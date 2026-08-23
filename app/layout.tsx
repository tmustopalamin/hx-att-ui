import type { Metadata } from "next";
import { getInitialLocale, loadInitialMessages } from "@/app/i18n/server";
import { I18nProvider } from "@/app/i18n";
import PrimeReactLocaleProvider from "@/app/_components/PrimeReactLocaleProvider";
import DocumentTitleSync from "@/app/_components/DocumentTitleSync";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "PT. Hexing Technology HRIS",
  description: "HRIS system",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getInitialLocale();
  const messages = await loadInitialMessages(locale);

  return (
    <html lang={locale} className="bg-slate-100">
      <body>
        <I18nProvider initialLocale={locale} initialMessages={messages}>
          <PrimeReactLocaleProvider>
            <DocumentTitleSync />
            {children}
          </PrimeReactLocaleProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
