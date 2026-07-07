"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { en, rw, type TranslationKey } from "@/lib/translations";

export type Locale = "en" | "rw";
const DICTS: Record<Locale, Partial<Record<TranslationKey, string>>> = { en, rw };
const STORAGE_KEY = "bizintel_locale";
export const LOCALE_CHANGED_EVENT = "bizintel-locale-changed";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "rw") setLocaleState(stored);
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(LOCALE_CHANGED_EVENT));
  }

  function t(key: TranslationKey): string {
    return DICTS[locale][key] ?? en[key] ?? key;
  }

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
