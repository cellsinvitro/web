"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/admin";
import AdminLoader from "@/components/AdminLoader";

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
    return <AdminLoader fullScreen />;
  }

  return children;
}
