"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";
import {
  fetchStockItem,
  fetchStockSettings,
  adjustStock,
  archiveStockItem,
  type StockItem,
} from "@/lib/api";

function formatPaise(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STORAGE_LABELS: Record<string, string> = {
  AMBIENT: "Ambient",
  FRIDGE_2_8: "2–8°C (Refrigerator)",
  FREEZER_MINUS_20: "−20°C (Freezer)",
  DEEP_FREEZER_MINUS_80: "−80°C (Deep Freezer)",
};

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  ADD: { label: "Added", cls: "bg-slate-50 text-slate-700" },
  ISSUE: { label: "Issued", cls: "bg-blue-50 text-blue-700" },
  RESTOCK: { label: "Restocked", cls: "bg-indigo-50 text-indigo-700" },
  STOCKOUT: { label: "Stockout", cls: "bg-red-50 text-red-700" },
  ADJUSTMENT: { label: "Adjusted", cls: "bg-amber-50 text-amber-700" },
  EDIT: { label: "Edited", cls: "bg-slate-50 text-slate-700" },
  LOCATION_CHANGE: { label: "Location", cls: "bg-purple-50 text-purple-700" },
};

function StatusBadge({ status }: { status?: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    IN_STOCK: { label: "In Stock", cls: "bg-slate-50 text-slate-700 border-slate-200" },
    LOW_STOCK: { label: "Low Stock", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    OUT_OF_STOCK: { label: "Out of Stock", cls: "bg-red-50 text-red-700 border-red-200" },
    EXPIRED: { label: "Expired", cls: "bg-red-100 text-red-800 border-red-300" },
    EXPIRING_SOON: { label: "Expiring Soon", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  };
  const { label, cls } = cfg[status ?? ""] ?? { label: "Unknown", cls: "bg-slate-50 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${cls}`}>{label}</span>
  );
}

export default function StockItemDetailPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = use(params);
  const { activeLab } = useLabWorkspace();
  const [item, setItem] = useState<StockItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  async function load(labId: string) {
    setLoading(true);
    setError(null);
    try {
      const [itemData] = await Promise.all([
        fetchStockItem(labId, itemId),
        fetchStockSettings(labId),
      ]);
      setItem(itemData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load item");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeLab) return;
    load(activeLab.id);
  }, [activeLab?.id, itemId]);

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!activeLab || !item) return;
    const newQty = parseInt(adjustQty);
    if (isNaN(newQty) || newQty < 0) { setAdjustError("Invalid quantity"); return; }
    if (!adjustReason.trim()) { setAdjustError("Reason is required"); return; }
    setAdjusting(true);
    setAdjustError(null);
    try {
      await adjustStock(activeLab.id, { itemId: item.id, newQty, reason: adjustReason });
      setShowAdjust(false);
      setAdjustQty("");
      setAdjustReason("");
      await load(activeLab.id);
    } catch (e) {
      setAdjustError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAdjusting(false);
    }
  }

  async function handleArchive() {
    if (!activeLab || !item) return;
    if (!confirm(item.isArchived ? "Restore this item?" : "Archive this item?")) return;
    try {
      await archiveStockItem(activeLab.id, item.id, !item.isArchived);
      await load(activeLab.id);
    } catch {/* ignore */}
  }

  if (!activeLab) return (
    <div className="py-16 text-center text-sm text-slate-500">No lab workspace selected.</div>
  );

  if (loading) return (
    <div className="space-y-4">
      <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );

  if (error || !item) return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm text-red-700">{error ?? "Item not found"}</p>
      <Link href="/dashboard/stock/inventory" className="mt-3 inline-block text-sm font-medium text-slate-900 underline">Back to Inventory</Link>
    </div>
  );

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb + Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard/stock/inventory" className="hover:text-slate-700">Inventory</Link>
          <span>/</span>
          <span className="font-medium text-slate-800">{item.name}</span>
          {item.isArchived && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Archived</span>
          )}
        </nav>
        <div className="flex gap-2">
          <Link href={`/dashboard/stock/inventory?showEdit=${item.id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit</Link>
          <button onClick={() => setShowAdjust(true)} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100">Adjust Qty</button>
          <button onClick={handleArchive} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            {item.isArchived ? "Restore" : "Archive"}
          </button>
        </div>
      </div>

      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{item.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {item.casNo && <span>CAS: <span className="font-medium text-slate-700">{item.casNo}</span></span>}
              {item.make && <span>By: <span className="font-medium text-slate-700">{item.make}</span></span>}
              {item.catalogueNo && <span>Cat: <span className="font-medium text-slate-700">{item.catalogueNo}</span></span>}
            </div>
            {item.tags && item.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <span key={t.id} className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">{t.tag.name}</span>
                ))}
              </div>
            )}
          </div>
          <StatusBadge status={item.status} />
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Qty</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{item.currentQty}</p>
          <p className="text-xs text-slate-400">{item.packSize ? `per ${item.packSize}` : "units"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Unit Price</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{formatPaise(item.pricePaise)}</p>
          <p className="text-xs text-slate-400">per unit</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Stock Value</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{formatPaise(item.stockValuePaise ?? 0)}</p>
          <p className="text-xs text-slate-400">current holding</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Expiry</p>
          <p className="mt-1 text-xl font-extrabold text-slate-900">{formatDate(item.expiryDate)}</p>
          <p className="text-xs text-slate-400">{item.hazardStatus === "HAZARDOUS" ? "⚠️ Hazardous" : "Safe"}</p>
        </div>
      </div>

      {/* Metadata */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-slate-700">Item Details</h3>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: "Category", value: item.category?.name ?? "—" },
            { label: "Storage", value: STORAGE_LABELS[item.storageTemperature] ?? item.storageTemperature },
            { label: "Location", value: item.location ? (item.location.parent ? `${item.location.parent.name} › ${item.location.name}` : item.location.name) : "—" },
            { label: "Pack Size", value: item.packSize ?? "—" },
            { label: "Hazard", value: item.hazardStatus === "HAZARDOUS" ? "⚠️ Hazardous" : "Non-Hazardous" },
            { label: "Added", value: new Date(item.createdAt).toLocaleDateString("en-IN") },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
        {item.remarks && (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Remarks: </span>{item.remarks}
          </div>
        )}
      </div>

      {/* Transaction History */}
      {item.transactionItems && item.transactionItems.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-700">Transaction History</h3>
          <div className="space-y-1">
            {item.transactionItems.map((ti) => {
              const txn = ti.transaction;
              const action = (txn?.type ? ACTION_LABELS[txn.type] : undefined) ?? { label: "Event", cls: "bg-slate-50 text-slate-700" };
              const delta = ti.newQty - ti.previousQty;
              return (
                <div key={ti.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${action.cls}`}>{action.label}</span>
                    <div>
                      <p className="text-xs text-slate-700">
                        {ti.previousQty} → {ti.newQty}
                        {txn?.purpose && ` · ${txn.purpose}`}
                        {txn?.reason && ` · ${txn.reason}`}
                      </p>
                      <p className="text-xs text-slate-400">
                        {txn?.createdBy?.name ?? "Unknown"} · {txn?.createdAt ? new Date(txn.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${delta >= 0 ? "text-slate-900" : "text-red-600"}`}>
                    {delta >= 0 ? "+" : ""}{delta}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Adjust Qty Modal */}
      {showAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowAdjust(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-slate-900">Manual Stock Adjustment</h2>
              <button onClick={() => setShowAdjust(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAdjust} className="p-6 space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm">
                <p className="font-semibold text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-500">Current: {item.currentQty} unit(s)</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">New Quantity</label>
                <input type="number" min={0} value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} className={inputCls} placeholder={String(item.currentQty)} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Reason *</label>
                <input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className={inputCls} placeholder="e.g. Physical count, spillage, etc." />
              </div>
              {adjustError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{adjustError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdjust(false)} disabled={adjusting} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={adjusting} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                  {adjusting ? "Adjusting…" : "Confirm Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
