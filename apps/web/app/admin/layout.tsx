import type { Metadata } from "next";
import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin | CellsInVitro",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-dvh bg-slate-50">
        <div className="mx-auto flex min-h-dvh max-w-7xl">
          <div className="hidden w-60 shrink-0 md:block">
            <AdminSidebar />
          </div>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
