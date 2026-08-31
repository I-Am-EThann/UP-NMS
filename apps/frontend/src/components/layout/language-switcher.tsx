"use client";

import { Globe } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const options = [
  { value: "en" as const, label: "English" },
  { value: "th" as const, label: "ไทย" },
];

export function LanguageSwitcher({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex size-9 items-center justify-center rounded-md transition-colors outline-none",
          variant === "light"
            ? "text-ink-600 hover:bg-brand-50"
            : "text-brand-200/80 hover:bg-white/5 hover:text-white"
        )}
        aria-label={t.topbar.languageAria}
      >
        <Globe className="size-4.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setLocale(option.value)}
            className={cn(locale === option.value && "bg-brand-50 text-brand-900")}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
