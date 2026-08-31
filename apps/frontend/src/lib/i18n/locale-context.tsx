"use client";

import * as React from "react";
import { Dictionary, Locale, dictionaries, localeIntlTag } from "@/lib/i18n/translations";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
  intlTag: string;
}

const LocaleContext = React.createContext<LocaleContextValue | undefined>(undefined);

const COOKIE_NAME = "pyao_locale";
const DEFAULT_LOCALE: Locale = "en";

function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  const value = match?.split("=")[1];
  return value === "en" || value === "th" ? value : null;
}

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Lazy-init from the cookie so there's no flash of the wrong language on
  // the client; SSR always renders the default until hydration reconciles.
  const [locale, setLocaleState] = React.useState<Locale>(DEFAULT_LOCALE);

  React.useEffect(() => {
    const saved = readLocaleCookie();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from a cookie (external system) on mount, not derived from props/state
    if (saved && saved !== locale) setLocaleState(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to sync from the cookie
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    writeLocaleCookie(next);
  }, []);

  const value = React.useMemo(
    () => ({
      locale,
      setLocale,
      t: dictionaries[locale],
      intlTag: localeIntlTag[locale],
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
