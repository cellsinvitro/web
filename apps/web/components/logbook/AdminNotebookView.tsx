"use client";

/**
 * AdminNotebookView
 *
 * Admin selects up to 4 users and views their notebook entries side by side
 * (or in a single-column stack on mobile) for a chosen date.
 * Read-only rendered via NotebookEditor readOnly={true}.
 */

import { useEffect, useState } from "react";
import {
  fetchAdminNotebookUsers,
  fetchAdminNotebookHistory,
  type AdminNotebookUserView,
  type NotebookHistoryItem,
  type NotebookBlock,
} from "@/lib/api";
import NotebookEditor from "./NotebookEditor";

const MAX_USERS = 4;

type UserOption = { id: string; name: string | null; email: string };

type Props = {
  users: UserOption[];
  labId?: string;
};

function getTodayString() {
  return new Date().toISOString().split("T")[0]!;
}

export default function AdminNotebookView({ users, labId }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [date, setDate] = useState(getTodayString());
  const [notebooks, setNotebooks] = useState<AdminNotebookUserView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-user history for calendar dots
  const [userHistories, setUserHistories] = useState<Record<string, NotebookHistoryItem[]>>({});

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= MAX_USERS) {
        alert(`You can view up to ${MAX_USERS} notebooks at once.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  // Load notebooks whenever selectedIds or date changes
  useEffect(() => {
    if (selectedIds.length === 0) { setNotebooks([]); return; }
    let cancelled = false;
    setLoading(true); setError(null);
    fetchAdminNotebookUsers(selectedIds, date, labId)
      .then(({ notebooks: data }) => { if (!cancelled) setNotebooks(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load notebooks"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedIds, date, labId]);

  // Load history (date dots) when a new user is selected
  useEffect(() => {
    for (const uid of selectedIds) {
      if (!userHistories[uid]) {
        fetchAdminNotebookHistory(uid, labId)
          .then((h) => setUserHistories((prev) => ({ ...prev, [uid]: h })))
          .catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  // Determine dates with entries for a user (for visual indicator)
  const datesWithEntry = (uid: string) =>
    new Set((userHistories[uid] || []).map((h) => h.date));

  return (
    <div className="space-y-5">
      {/* User picker */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-900">
            Select up to {MAX_USERS} users to view notebooks
          </p>
          <span className="text-[11px] text-slate-400">
            {selectedIds.length}/{MAX_USERS} selected
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {users.map((u) => {
            const isSelected = selectedIds.includes(u.id);
            const hasHistory = (userHistories[u.id]?.length ?? 0) > 0;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleUser(u.id)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
                  isSelected
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400",
                ].join(" ")}
              >
                {u.name || u.email.split("@")[0]}
                {hasHistory && !isSelected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Has notebook entries" />
                )}
              </button>
            );
          })}
        </div>

        {/* Date picker */}
        <div className="mt-3 flex items-center gap-3">
          <label className="text-[11px] font-semibold text-slate-600">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setDate(getTodayString())}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      )}

      {/* Notebooks grid */}
      {!loading && notebooks.length > 0 && (
        <div className={`grid gap-4 ${notebooks.length === 1 ? "grid-cols-1" : notebooks.length === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-2"}`}>
          {notebooks.map((nb) => {
            const blocks: NotebookBlock[] =
              Array.isArray(nb.entry?.richContent) && (nb.entry?.richContent as NotebookBlock[]).length > 0
                ? (nb.entry?.richContent as NotebookBlock[])
                : nb.entry?.content
                ? [{ type: "text", id: "legacy", content: nb.entry.content }]
                : [];

            const entryDates = datesWithEntry(nb.userId);

            return (
              <div key={nb.userId} className="space-y-2">
                {/* User badge */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-xs">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
                    {(nb.userName || nb.userEmail)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">{nb.userName}</p>
                    <p className="truncate text-[10px] text-slate-400">{nb.userEmail}</p>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {entryDates.size} {entryDates.size === 1 ? "entry" : "entries"}
                  </div>
                </div>

                {/* Entry or empty */}
                {nb.entry ? (
                  <NotebookEditor
                    blocks={blocks}
                    onChange={() => {}}
                    onImageUpload={async () => ({ url: "", storageKey: "" })}
                    readOnly
                    authorName={nb.userName}
                    dateLabel={date}
                  />
                ) : (
                  <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
                    No entry for {date}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && selectedIds.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-xs text-slate-400">
          Select users above to view their notebooks
        </div>
      )}
    </div>
  );
}
