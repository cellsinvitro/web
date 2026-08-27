"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mobileNavItems = [
  { label: "Overview", href: "/dashboard" },
  { label: "Courses", href: "/dashboard/courses" },
  { label: "Resources", href: "/dashboard/resources" },
  { label: "Kits", href: "/dashboard/kits" },
  { label: "Profile", href: "/dashboard/account" },
];

export default function DashboardMobileNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {mobileNavItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
