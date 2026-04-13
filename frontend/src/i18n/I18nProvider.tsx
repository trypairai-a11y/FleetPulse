"use client";
import { createContext, useContext, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Locale, Messages, MESSAGES, DEFAULT_LOCALE, LOCALES } from "./messages";

interface I18nContextValue {
  locale: Locale;
  t: (path: string) => string;
  setLocale: (next: Locale) => void;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue | null>(null);

function lookup(messages: Messages, path: string): string {
  const segments = path.split(".");
  let node: any = messages;
  for (const segment of segments) {
    if (node && typeof node === "object" && segment in node) {
      node = node[segment];
    } else {
      return path;
    }
  }
  return typeof node === "string" ? node : path;
}

export function I18nProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const locale: Locale = LOCALES.includes(initialLocale) ? initialLocale : DEFAULT_LOCALE;
  const messages = MESSAGES[locale];

  const t = useCallback((path: string) => lookup(messages, path), [messages]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (!LOCALES.includes(next) || next === locale) return;
      document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
      router.refresh();
    },
    [locale, router],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, t, setLocale, dir: locale === "ar" ? "rtl" : "ltr" }),
    [locale, t, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      t: (path: string) => lookup(MESSAGES[DEFAULT_LOCALE], path),
      setLocale: () => {},
      dir: "ltr",
    };
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}
