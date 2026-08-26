"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type IconProps = { className?: string };

function OverviewIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  );
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function ResourcesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function DashboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875A1.125 1.125 0 0 1 10.875 9.75h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function LogoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  );
}

const navItems = [
  { label: "Overview", href: "/admin", icon: OverviewIcon },
  { label: "Users", href: "/admin/users", icon: UsersIcon },
  { label: "Resources", href: "/admin/resources", icon: ResourcesIcon },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<IconProps>;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={`flex items-center justify-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors group-hover:justify-start ${
        active
          ? "bg-slate-950 text-white"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="hidden whitespace-nowrap group-hover:inline">{label}</span>
    </Link>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside
      className="group sticky top-0 z-20 flex h-dvh w-16 flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200 ease-in-out hover:w-60"
    >
      <div className="border-b border-slate-100 px-3 py-5 group-hover:px-5">
        <Link
          href="/"
          title="CellsInVitro"
          className="flex items-center justify-center gap-2.5 group-hover:justify-start"
        >
          <Image
            src="/images/logo.png"
            alt="CellsInVitro"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 object-contain"
          />
          <div className="hidden min-w-0 group-hover:block">
            <p className="text-sm font-bold text-slate-950">CellsInVitro</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Admin
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={active}
            />
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3 group-hover:p-4">
        <div className="hidden group-hover:block">
          <p className="truncate text-sm font-medium text-slate-900">
            {user?.name || "Admin"}
          </p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
        <div className="flex flex-col items-center gap-2 group-hover:mt-3 group-hover:flex-row group-hover:justify-start">
          <Link
            href="/dashboard"
            title="User dashboard"
            className="flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 group-hover:justify-start"
          >
            <DashboardIcon className="h-4 w-4 shrink-0" />
            <span className="hidden whitespace-nowrap group-hover:inline group-hover:ml-1.5">
              User dashboard
            </span>
          </Link>
          <button
            type="button"
            title="Logout"
            onClick={() => logout()}
            className="flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 group-hover:justify-start"
          >
            <LogoutIcon className="h-4 w-4 shrink-0" />
            <span className="hidden whitespace-nowrap group-hover:inline group-hover:ml-1.5">
              Logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
