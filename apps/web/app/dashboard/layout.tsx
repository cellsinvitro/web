import type { Metadata } from "next";
import AuthGuard from "@/components/AuthGuard";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardMobileNav from "@/components/DashboardMobileNav";

export const metadata: Metadata = {
  title: "Dashboard | CellsInVitro",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-dvh bg-slate-50">
        <div className="flex min-h-dvh">
          <div className="hidden shrink-0 md:block">
            <DashboardSidebar />
          </div>
          <main className="min-w-0 flex-1">
            <DashboardMobileNav />
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
