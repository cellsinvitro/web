"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";
import {
  fetchStockInit,
  fetchStockDashboard,
  type StockPermissions,
  type StockDashboardData,
} from "@/lib/api";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    IN_STOCK:      { label: "In Stock",       cls: "bg-slate-50 text-slate-700 border-slate-200" },
    LOW_STOCK:     { label: "Low Stock",      cls: "bg-amber-50  text-amber-700  border-amber-200"  },
    OUT_OF_STOCK:  { label: "Out of Stock",   cls: "bg-red-50    text-red-700    border-red-200"    },
    EXPIRED:       { label: "Expired",        cls: "bg-red-100   text-red-800    border-red-300"    },
    EXPIRING_SOON: { label: "Expiring Soon",  cls: "bg-orange-50 text-orange-700 border-orange-200" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-50 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

type KpiCardProps = { label: string; value: string | number; sub?: string; color?: string; icon: React.ReactNode };
function KpiCard({ label, value, sub, color = "bg-slate-50", icon }: KpiCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

const STORAGE_LABELS: Record<string, string> = {
  AMBIENT: "Ambient",
  FRIDGE_2_8: "2–8°C",
  FREEZER_MINUS_20: "−20°C",
  DEEP_FREEZER_MINUS_80: "−80°C",
};

const CATEGORY_COLORS = [
  "#059669", "#0284c7", "#7c3aed", "#db2777", "#d97706", "#16a34a",
  "#6366f1", "#dc2626", "#0891b2", "#78716c",
];

export default function StockDashboardPage() {
  const { activeLab } = useLabWorkspace();
  const [permissions, setPermissions] = useState<StockPermissions | null>(null);
  const [data, setData] = useState<StockDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!activeLab) return;
    const labId = activeLab.id;
    initialized.current = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (!initialized.current) {
          const init = await fetchStockInit(labId);
          setPermissions(init.permissions);
          initialized.current = true;
        }
        const dash = await fetchStockDashboard(labId);
        setData(dash);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeLab?.id]);

  if (!activeLab) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-slate-500">No lab workspace selected. Please open the Lab Log-Book to set one up.</p>
        <Link href="/dashboard/logbook" className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Go to Lab Log-Book
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >Retry</button>
      </div>
    );
  }

  if (!permissions?.canViewStock) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-800">You do not have permission to view stock management.</p>
      </div>
    );
  }

  const kpis = data?.kpis;
  const charts = data?.charts;

  const categoryChartData = {
    labels: charts?.byCategory.map((c) => c.name) ?? [],
    datasets: [{
      data: charts?.byCategory.map((c) => c.count) ?? [],
      backgroundColor: CATEGORY_COLORS,
      borderWidth: 0,
    }],
  };

  const storageChartData = {
    labels: charts?.byStorage.map((s) => STORAGE_LABELS[s.storage] ?? s.storage) ?? [],
    datasets: [{
      data: charts?.byStorage.map((s) => s.count) ?? [],
      backgroundColor: ["#94a3b8", "#0284c7", "#7c3aed", "#1e3a8a"],
      borderWidth: 0,
    }],
  };

  const expiry = charts?.expiryOverview;
  const expiryBarData = {
    labels: ["Expired", "0–30 days", "31–90 days", "90+ days"],
    datasets: [{
      label: "Items",
      data: [expiry?.expired ?? 0, expiry?.days0to30 ?? 0, expiry?.days31to90 ?? 0, expiry?.days90plus ?? 0],
      backgroundColor: ["#ef4444", "#f97316", "#f59e0b", "#10b981"],
      borderRadius: 6,
    }],
  };

  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" as const } } };

  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Items"
            value={kpis?.totalItems ?? 0}
            color="bg-slate-50"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>}
          />
          <KpiCard
            label="Total Stock Value"
            value={formatPaise(kpis?.totalStockValuePaise ?? 0)}
            color="bg-blue-50"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
          />
          <KpiCard
            label="Low Stock"
            value={kpis?.lowStockCount ?? 0}
            sub="items need restock"
            color="bg-amber-50"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>}
          />
          <KpiCard
            label="Near Expiry"
            value={kpis?.expiringSoonCount ?? 0}
            sub={`within ${data?.settings.nearExpiryDays ?? 90} days`}
            color="bg-orange-50"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
          />
          <KpiCard
            label="Expired Items"
            value={kpis?.expiredCount ?? 0}
            sub={formatPaise(kpis?.expiredValuePaise ?? 0) + " value"}
            color="bg-red-50"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>}
          />
          <KpiCard
            label="Out of Stock"
            value={kpis?.outOfStockCount ?? 0}
            color="bg-red-50"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>}
          />
          <KpiCard
            label="Hazardous Items"
            value={kpis?.hazardousCount ?? 0}
            color="bg-red-50"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>}
          />
          <KpiCard
            label="Locations"
            value={kpis?.totalLocations ?? 0}
            color="bg-purple-50"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>}
          />
        </div>
      </section>

      {/* Charts */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Stock by Category</h3>
          <div className="h-52">
            {(charts?.byCategory.length ?? 0) > 0
              ? <Doughnut data={categoryChartData} options={chartOpts} />
              : <div className="flex h-full items-center justify-center text-sm text-slate-400">No data</div>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Storage Distribution</h3>
          <div className="h-52">
            {(charts?.byStorage.some((s) => s.count > 0)) ?? false
              ? <Doughnut data={storageChartData} options={chartOpts} />
              : <div className="flex h-full items-center justify-center text-sm text-slate-400">No data</div>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Expiry Overview</h3>
          <div className="h-52">
            <Bar data={expiryBarData} options={{ ...chartOpts, plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </section>

      {/* Near Expiry + Low Stock */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Near Expiry */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              ⚠️ Near Expiry
              <span className="ml-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                {data?.nearExpiryItems.length ?? 0}
              </span>
            </h3>
            <Link href="/dashboard/stock/inventory?expiryStatus=EXPIRING_SOON" className="text-xs font-medium text-slate-900 hover:underline">
              View all
            </Link>
          </div>
          {(data?.nearExpiryItems.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No items expiring soon 🎉</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data!.nearExpiryItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link href={`/dashboard/stock/inventory/${item.id}`} className="text-sm font-medium text-slate-800 hover:text-slate-700">
                      {item.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      Expires: {formatDate(item.expiryDate)} · Qty: {item.currentQty}
                      {item.location ? ` · ${item.location}` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{formatPaise(item.stockValuePaise)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              🔴 Low Stock
              <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {data?.lowStockItems.length ?? 0}
              </span>
            </h3>
            <Link href="/dashboard/stock/inventory?availability=LOW_STOCK" className="text-xs font-medium text-slate-900 hover:underline">
              View all
            </Link>
          </div>
          {(data?.lowStockItems.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">All items are adequately stocked ✓</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data!.lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link href={`/dashboard/stock/inventory/${item.id}`} className="text-sm font-medium text-slate-800 hover:text-slate-700">
                      {item.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {item.currentQty} remaining · threshold: {item.lowStockThreshold}
                    </p>
                  </div>
                  <StatusBadge status="LOW_STOCK" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Action Bar */}
      <section className="flex flex-wrap gap-3">
        <Link href="/dashboard/stock/inventory?showAdd=1" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Add Stock
        </Link>
        <Link href="/dashboard/stock/issue" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Issue Stock
        </Link>
        <Link href="/dashboard/stock/activity" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          Activity Log
        </Link>
      </section>
    </div>
  );
}
