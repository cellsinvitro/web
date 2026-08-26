"use client";

import { useEffect, useState } from "react";
import { fetchAdminStats } from "@/lib/api";
import type { AdminStats } from "@/lib/api";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
          Overview
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Monitor signups and account activity across CellsInVitro.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : !stats ? (
        <div className="max-w-xs">
          <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      ) : (
        <div className="max-w-xs">
          <StatCard
            label="Total users"
            value={stats.totalUsers}
            hint="All registered accounts"
          />
        </div>
      )}

    </div>
  );
}
