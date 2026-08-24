"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type AuthGuardProps = {
  children: ReactNode;
  redirectTo?: string;
};

export default function AuthGuard({ children, redirectTo }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const loginRedirect = redirectTo || pathname || "/dashboard";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(
        `/login?redirect=${encodeURIComponent(loginRedirect)}`
      );
    }
  }, [user, loading, router, loginRedirect]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return children;
}
