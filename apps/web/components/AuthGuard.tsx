"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

import GlobalLoader from "@/components/GlobalLoader";

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
    return <GlobalLoader fullScreen label="CellsInVitro" sublabel="Loading dashboard..." />;
  }

  return children;
}
