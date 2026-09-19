"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LabWorkspaceProvider, useLabWorkspace } from "@/context/LabWorkspaceContext";

const stockNavItems = [
  { label: "Dashboard", href: "/dashboard/stock/dashboard" },
  { label: "Inventory", href: "/dashboard/stock/inventory" },
  { label: "Issue Stock", href: "/dashboard/stock/issue" },
  { label: "Activity Log", href: "/dashboard/stock/activity" },
  { label: "Settings", href: "/dashboard/stock/settings" },
];

function StockHeader() {
  const { activeLab } = useLabWorkspace();
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white px-6 pt-6 pb-0">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="h-5 w-5" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Stock Management</h1>
          {activeLab && (
            <p className="text-xs text-slate-500">{activeLab.name}</p>
          )}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto" aria-label="Stock navigation">
        {stockNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-slate-900 text-slate-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function StockLayout({ children }: { children: React.ReactNode }) {
  return (
    <LabWorkspaceProvider>
      <div className="min-h-dvh bg-slate-50">
        <StockHeader />
        <div className="p-6">{children}</div>
      </div>
    </LabWorkspaceProvider>
  );
}
