"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/admin";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?redirect=/admin");
      return;
    }
    if (!isAdmin(user.role)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user || !isAdmin(user.role)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          Loading admin...
        </div>
      </div>
    );
  }

  return children;
}
