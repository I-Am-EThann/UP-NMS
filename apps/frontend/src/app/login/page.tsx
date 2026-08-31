"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Radio, Lock, User, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errorCode, setErrorCode] = React.useState<
    "missingFields" | "invalidCredentials" | "generic" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorCode(null);
    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrorCode(result.errorCode ?? "generic");
      return;
    }
    const next = searchParams.get("next") ?? "/dashboard";
    router.push(next);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-8">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <span className="signal-dot text-brand-600">
            <Radio className="size-5 text-brand-700" />
          </span>
          <span className="font-display text-base font-semibold text-ink-900">
            UP NMS
          </span>
        </div>

        <h1 className="font-display text-2xl font-semibold text-ink-900">
          {t.auth.loginTitle}
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">{t.auth.usernameLabel}</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <Input
                id="username"
                autoComplete="username"
                placeholder="admin"
                className="pl-9"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{t.auth.passwordLabel}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {errorCode && (
            <p className="rounded-md bg-sev-critical-bg px-3 py-2 text-sm text-sev-critical">
              {t.auth.errors[errorCode]}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {t.auth.loginButton}
          </Button>
        </form>
      </div>
    </div>
  );
}
