"use client";

import * as React from "react";
import { useLocale } from "@/lib/i18n/locale-context";

interface PageTitleContextValue {
  title: string;
  setTitle: (title: string) => void;
}

const PageTitleContext = React.createContext<PageTitleContextValue | undefined>(
  undefined
);

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const [title, setTitle] = React.useState(t.dashboard.title);
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitleContext() {
  const ctx = React.useContext(PageTitleContext);
  if (!ctx) throw new Error("usePageTitleContext must be used within PageTitleProvider");
  return ctx;
}

/** Call from any page to set the Topbar title for as long as it's mounted. */
export function usePageTitle(title: string) {
  const { setTitle } = usePageTitleContext();
  React.useEffect(() => {
    setTitle(title);
  }, [title, setTitle]);
}
