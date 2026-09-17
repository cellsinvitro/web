"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LogbookHeader({
  title = "Lab Log-Book",
  subtitle = "Manage laboratory instruments, equipment logs, bookings & notebooks",
  canManageInstruments = false,
  canGenerateReports = false,
  isAdmin = false,
  onAddInstrument,
}: {
  title?: string;
  subtitle?: string;
  canManageInstruments?: boolean;
  canGenerateReports?: boolean;
  isAdmin?: boolean;
  onAddInstrument?: () => void;
}) {
  const pathname = usePathname();

  const tabs = [
    { label: "Instruments", href: "/dashboard/logbook" },
    { label: "Lab Notebook", href: "/dashboard/logbook/notebook" },
    ...(canGenerateReports || isAdmin
      ? [{ label: "Reports", href: "/dashboard/logbook/reports" }]
      : []),
    { label: "Activity Log", href: "/dashboard/logbook/activity" },
    ...(isAdmin
      ? [{ label: "Team & Permissions", href: "/dashboard/logbook/team" }]
      : []),
  ];

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                {title}
              </h1>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
        </div>

        {onAddInstrument && canManageInstruments && (
          <button
            type="button"
            onClick={onAddInstrument}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add Instrument
          </button>
        )}
      </div>

      <div className="flex overflow-x-auto border-b border-slate-200 no-scrollbar">
        <div className="flex gap-2 pb-px">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/dashboard/logbook"
                ? pathname === "/dashboard/logbook"
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-teal-600 text-teal-700 font-semibold"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
