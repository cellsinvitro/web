"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ToolsStatusResponse } from "@/lib/api";

export default function ToolUsageBar({
  status,
  loading,
  authenticated,
}: {
  status: ToolsStatusResponse | null;
  loading: boolean;
  authenticated: boolean;
}) {
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
    );
  }

  if (!authenticated) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 text-slate-700">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
            </svg>
          </span>
          <span>
            Explore and enter data freely. <strong className="font-semibold text-slate-900">Login required to calculate results.</strong>
          </span>
        </div>
        <Link
          href={`/login?redirect=${encodeURIComponent(pathname)}`}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          Login
        </Link>
      </div>
    );
  }

  if (status?.isSubscriber) {
    const formattedDate = status.subscription?.expiresAt
      ? new Date(status.subscription.expiresAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Active";

    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs sm:text-sm text-emerald-950">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="font-medium">
            <strong className="font-semibold text-emerald-900">Tools Unlimited Active:</strong> Unlimited calculations unlocked across all tools.
          </span>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-emerald-700">
          Expires: {formattedDate}
        </span>
      </div>
    );
  }

  // Free logged-in user
  const limit = status?.dailyLimit ?? 1;
  const remaining = status?.remainingToday ?? 0;
  const isExhausted = remaining <= 0;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-xs sm:text-sm transition-colors ${
        isExhausted
          ? "border-amber-200 bg-amber-50/90 text-amber-950"
          : "border-slate-200 bg-slate-50/90 text-slate-800"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              isExhausted ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            {isExhausted ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 4.75a.75.75 0 0 0-1.5 0v4.25c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5H10.75V6.75Z" />
              </svg>
            )}
          </span>
          <div>
            {isExhausted ? (
              <div>
                <p className="font-semibold text-amber-950">You've reached your daily calculation limit.</p>
                <p className="mt-0.5 text-xs text-amber-800">
                  Upgrade to a Tools subscription for unlimited calculations.
                </p>
              </div>
            ) : (
              <p>
                Calculations remaining today:{" "}
                <strong className="font-semibold text-slate-950">
                  {remaining} of {limit}
                </strong>
              </p>
            )}
          </div>
        </div>
        <Link
          href="/tools#subscription-plans"
          className={`inline-flex shrink-0 items-center justify-center rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
            isExhausted
              ? "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
              : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
          }`}
        >
          View Plans
        </Link>
      </div>
    </div>
  );
}
