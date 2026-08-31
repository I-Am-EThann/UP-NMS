"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthUser } from "@/lib/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { BackendUser, mapUser } from "@/lib/api-mappers";

type LoginErrorCode = "missingFields" | "invalidCredentials" | "generic";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ ok: boolean; errorCode?: LoginErrorCode }>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;

    // The auth cookie is httpOnly, so the only way to know if the user is
    // already signed in in this session is to ask the backend directly.
    apiFetch<BackendUser>("/auth/me")
      .then((data) => {
        if (!cancelled) setUser(mapUser(data));
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(async (username: string, password: string) => {
    try {
      const data = await apiFetch<{ user: BackendUser }>("/auth/login", {
        method: "POST",
        body: { username, password },
      });
      setUser(mapUser(data.user));
      return { ok: true as const };
    } catch (error) {
      if (error instanceof ApiError) {
        const errorCode: LoginErrorCode =
          error.status === 401
            ? "invalidCredentials"
            : error.status === 400
              ? "missingFields"
              : "generic";
        return { ok: false as const, errorCode };
      }
      return { ok: false as const, errorCode: "generic" as const };
    }
  }, []);

  const logout = React.useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
