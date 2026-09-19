"use client";

import { useEffect, useState, useCallback } from "react";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";
import { fetchStockActivity, type StockActivityLog } from "@/lib/api";

const ACTION_CONFIG: Record<string, { label: string; icon: string; cls: string; dotCls: string }> = {
  ADD:             { label: "Added",       icon: "＋", cls: "bg-slate-50 text-slate-700 border-slate-200", dotCls: "bg-slate-800" },
  ISSUE:           { label: "Issued",      icon: "↓",  cls: "bg-blue-50   text-blue-700   border-blue-200",   dotCls: "bg-blue-500" },
  RESTOCK:         { label: "Restocked",   icon: "↑",  cls: "bg-indigo-50 text-indigo-700 border-indigo-200", dotCls: "bg-indigo-500" },
  STOCKOUT:        { label: "Stockout",    icon: "✕",  cls: "bg-red-50    text-red-700    border-red-200",    dotCls: "bg-red-500" },
  ADJUSTMENT:      { label: "Adjusted",    icon: "≈",  cls: "bg-amber-50  text-amber-700  border-amber-200",  dotCls: "bg-amber-500" },
  EDIT:            { label: "Edited",      icon: "✎",  cls: "bg-slate-50  text-slate-700  border-slate-200",  dotCls: "bg-slate-400" },
  LOCATION_CHANGE: { label: "Moved",       icon: "⇨",  cls: "bg-purple-50 text-purple-700 border-purple-200", dotCls: "bg-purple-500" },
};

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function ActivityLogPage() {
  const { activeLab } = useLabWorkspace();
  const [logs, setLogs] = useState<StockActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterAction, setFilterAction] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  const load = useCallback(async (labId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStockActivity(labId, {
        action: filterAction, dateFrom: filterFrom, dateTo: filterTo, page, limit,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterFrom, filterTo, page]);

  useEffect(() => {
    if (!activeLab) return;
    load(activeLab.id);
  }, [activeLab?.id, load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Activity Log</h2>
          <p className="text-sm text-slate-500">Immutable audit trail of all stock operations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-800 focus:outline-none"
          >
            <option value="">All Actions</option>
            {Object.entries(ACTION_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-800 focus:outline-none"
            title="From date"
          />
          <input
            type="date"
            value={filterTo}
            onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-800 focus:outline-none"
            title="To date"
          />
          {(filterAction || filterFrom || filterTo) && (
            <button
              onClick={() => { setFilterAction(""); setFilterFrom(""); setFilterTo(""); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(ACTION_CONFIG).map(([action, cfg]) => {
          const count = logs.filter((l) => l.action === action).length;
          if (!filterAction && count === 0) return null;
          return (
            <button
              key={action}
              onClick={() => { setFilterAction(filterAction === action ? "" : action); setPage(1); }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${filterAction === action ? cfg.cls : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotCls}`} />
              {cfg.label}
            </button>
          );
        })}
        <span className="ml-auto self-center text-xs text-slate-500">{total} log{total !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 px-4 py-6 text-center text-sm text-red-700">{error}</div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-slate-400">No activity logged yet.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-100" />
          <div className="space-y-1 pl-14">
            {logs.map((log) => {
              const cfg = ACTION_CONFIG[log.action] ?? { label: log.action, icon: "·", cls: "bg-slate-50 text-slate-700 border-slate-200", dotCls: "bg-slate-400" };
              const delta = log.quantityDelta;
              return (
                <div key={log.id} className="relative rounded-xl bg-white border border-slate-100 px-4 py-3 hover:border-slate-200 transition-colors group">
                  {/* Timeline dot */}
                  <div className={`absolute -left-[2.25rem] top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white ${cfg.dotCls} shadow-sm`} />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`inline-flex shrink-0 items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${cfg.cls}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{log.itemName}</p>
                        <p className="text-xs text-slate-500">
                          by <span className="font-medium text-slate-700">{log.userName}</span>
                          {log.purpose && ` · ${log.purpose}`}
                          {log.reason && ` · ${log.reason}`}
                          {log.remarks && ` · ${log.remarks}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${delta > 0 ? "text-slate-900" : delta < 0 ? "text-red-600" : "text-slate-500"}`}>
                        {delta > 0 ? "+" : ""}{delta !== 0 ? delta : "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {log.previousQty} → {log.newQty}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-400" title={formatDateTime(log.createdAt)}>
                    {formatRelative(log.createdAt)} · {formatDateTime(log.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">← Previous</button>
          <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
