"use client";

import { useEffect, useState } from "react";
import LogbookHeader from "@/components/logbook/LogbookHeader";
import {
  fetchLogbookActivities,
  fetchLogbookInstruments,
  type LogbookActivity,
  type LogbookInstrument,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";
import { isAdmin as checkIsAdmin } from "@/lib/admin";

export default function LogbookActivityPage() {
  const { user } = useAuth();
  const { activeLab } = useLabWorkspace();
  const isAdminUser = checkIsAdmin(user?.role);

  const [instruments, setInstruments] = useState<LogbookInstrument[]>([]);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>("ALL");
  const [activities, setActivities] = useState<LogbookActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeLab) return;
    fetchLogbookInstruments(activeLab.id)
      .then((res) => setInstruments(res.instruments))
      .catch(() => {});
  }, [activeLab?.id]);

  const loadActivities = async () => {
    if (!activeLab) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchLogbookActivities(
        selectedInstrumentId === "ALL" ? undefined : selectedInstrumentId,
        activeLab.id
      );
      setActivities(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load logbook activity history";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [selectedInstrumentId, activeLab?.id]);

  const getActionBadge = (action: string) => {
    if (action.includes("CREATED") || action.includes("ADDED")) {
      return (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
          {action.replace("_", " ")}
        </span>
      );
    }
    if (action.includes("CANCELLED") || action.includes("ARCHIVED")) {
      return (
        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-600/20">
          {action.replace("_", " ")}
        </span>
      );
    }
    return (
      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-600/20">
        {action.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <LogbookHeader
        title="Activity Log"
        subtitle="Complete audit trail of all logbook bookings, instrument modifications, and administrative actions"
        isAdmin={isAdminUser}
      />

      {/* Filter */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-700">Filter Instrument:</label>
          <select
            value={selectedInstrumentId}
            onChange={(e) => setSelectedInstrumentId(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
          >
            <option value="ALL">All Instruments</option>
            {instruments.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.code})
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-medium text-slate-500">
          Total Activity Records: <strong className="text-slate-900">{activities.length}</strong>
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-xs text-slate-500">
          No activity records recorded yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="divide-y divide-slate-100">
            {activities.map((act) => (
              <div key={act.id} className="flex items-start gap-4 p-4 hover:bg-slate-50/80">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getActionBadge(act.action)}
                    <span className="text-xs font-bold text-slate-900">{act.userName}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700 font-medium">{act.details}</p>
                </div>

                <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                  {new Date(act.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
