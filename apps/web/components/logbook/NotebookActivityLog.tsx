"use client";

/**
 * NotebookActivityLog
 *
 * Admin: sees the full log (all users, all actions).
 * User: sees only their own actions.
 * The `isAdmin` flag is returned by the API alongside the logs.
 */

import { useEffect, useState } from "react";
import { fetchNotebookActivityLog, type NotebookActivityLog as ActivityEntry } from "@/lib/api";

const ACTION_META: Record<string, { label: string; color: string }> = {
  ENTRY_CREATED:  { label: "Entry Created",  color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  ENTRY_UPDATED:  { label: "Entry Updated",  color: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  TASK_ASSIGNED:  { label: "Task Assigned",  color: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  TASK_COMPLETED: { label: "Task Completed", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { label: action.replace(/_/g, " "), color: "bg-amber-50 text-amber-700 ring-amber-600/20" };
}

type Props = { labId?: string };

export default function NotebookActivityLog({ labId }: Props) {
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchNotebookActivityLog(labId)
      .then(({ logs: data, isAdmin: admin }) => {
        if (cancelled) return;
        setLogs(data);
        setIsAdmin(admin);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load activity log");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [labId]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">Notebook Activity Log</h3>
        <p className="text-[11px] text-slate-500">
          {isAdmin
            ? "Complete audit trail — all users' notebook actions"
            : "Your own notebook activity history"}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      ) : error ? (
        <div className="px-5 py-4 text-xs text-rose-600">{error}</div>
      ) : logs.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-slate-400">No activity yet.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {logs.map((log) => {
            const { label, color } = getActionMeta(log.action);
            return (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/50">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${color}`}>
                      {label}
                    </span>
                    {isAdmin && (
                      <span className="text-[11px] font-semibold text-slate-800">{log.userName}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-600">{log.details}</p>
                </div>
                <time className="shrink-0 text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
