"use client";

import { Menu, Search, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePageTitleContext } from "@/lib/page-title-context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const { title } = usePageTitleContext();
  const { t } = useLocale();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-white px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-600 transition-colors hover:bg-brand-50 lg:hidden"
          aria-label={t.topbar.menuAria}
        >
          <Menu className="size-5" />
        </button>
        <h1 className="truncate font-display text-base font-semibold text-ink-900">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <Input
            placeholder={t.topbar.searchPlaceholder}
            className="h-9 w-64 pl-9"
          />
        </div>

        <LanguageSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 outline-none transition-colors hover:bg-brand-50">
            <Avatar className="size-8">
              <AvatarFallback>
                {user ? initials(user.displayName) : <UserIcon className="size-4" />}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium text-ink-900 sm:inline">
              {user?.displayName ?? t.topbar.fallbackName}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.username}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => logout()}>
              <LogOut className="size-4" />
              {t.topbar.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
