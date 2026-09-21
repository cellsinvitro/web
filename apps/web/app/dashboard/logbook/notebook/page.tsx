"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LogbookHeader from "@/components/logbook/LogbookHeader";
import NotebookEditor from "@/components/logbook/NotebookEditor";
import NotebookCalendar from "@/components/logbook/NotebookCalendar";
import NotebookTaskPanel from "@/components/logbook/NotebookTaskPanel";
import NotebookActivityLogPanel from "@/components/logbook/NotebookActivityLog";
import AdminNotebookView from "@/components/logbook/AdminNotebookView";
import {
  fetchLabNotebookEntry,
  saveLabNotebookEntry,
  fetchNotebookHistory,
  uploadNotebookImage,
  fetchLabTeam,
  type LabNotebookEntry,
  type NotebookBlock,
  type NotebookHistoryItem,
  type LabTeamMember,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";
import { isAdmin as checkIsAdmin } from "@/lib/admin";

// ── helpers ────────────────────────────────────────────────────────────────────

function getTodayString() {
  return new Date().toISOString().split("T")[0] ?? "";
}

function blocksToPlainText(blocks: NotebookBlock[]): string {
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => {
      const div = typeof document !== "undefined" ? document.createElement("div") : null;
      if (div) { div.innerHTML = (b as { content: string }).content; return div.innerText; }
      return (b as { content: string }).content.replace(/<[^>]+>/g, " ");
    })
    .join("\n");
}

function entryToBlocks(entry: LabNotebookEntry | null): NotebookBlock[] {
  if (!entry) return [];
  if (Array.isArray(entry.richContent) && entry.richContent.length > 0) {
    return entry.richContent as NotebookBlock[];
  }
  if (entry.content) {
    return [{ type: "text", id: "legacy-content", content: entry.content }];
  }
  return [];
}

// ── tab type ──────────────────────────────────────────────────────────────────

type Tab = "editor" | "tasks" | "activity" | "admin";

export default function LabNotebookPage() {
  const { user } = useAuth();
  const { activeLab } = useLabWorkspace();
  const isAdminUser = checkIsAdmin(user?.role);

  // ── core state ───────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [blocks, setBlocks] = useState<NotebookBlock[]>([]);
  const [entry, setEntry] = useState<LabNotebookEntry | null>(null);
  const [entryTime, setEntryTime] = useState("");
  const [summary, setSummary] = useState("");

  const [history, setHistory] = useState<NotebookHistoryItem[]>([]);
  const [labTeam, setLabTeam] = useState<LabTeamMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("editor");

  // Auto-save debounce
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirty = useRef(false);

  // ── load entry ────────────────────────────────────────────────────────────────
  const loadEntry = useCallback(async (dateStr: string) => {
    if (!activeLab) return;
    setLoading(true);
    setError(null);
    setSavedMsg(null);
    try {
      const res = await fetchLabNotebookEntry(dateStr, activeLab.id);
      setEntry(res.entry);
      setBlocks(entryToBlocks(res.entry));
      setEntryTime(res.entry?.entryTime ?? "");
      setSummary(res.entry?.summary ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load entry");
    } finally {
      setLoading(false);
    }
  }, [activeLab]);

  // ── load history (calendar dots) ─────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!activeLab) return;
    try {
      const h = await fetchNotebookHistory(activeLab.id);
      setHistory(h);
    } catch { /* non-critical */ }
  }, [activeLab]);

  // ── load team (for task panel) ────────────────────────────────────────────────
  const loadTeam = useCallback(async () => {
    if (!activeLab) return;
    try {
      const res = await fetchLabTeam(activeLab.id);
      setLabTeam(res.members);
    } catch { /* non-critical */ }
  }, [activeLab]);

  useEffect(() => {
    loadEntry(selectedDate);
  }, [selectedDate, activeLab?.id, loadEntry]);

  useEffect(() => {
    loadHistory();
    loadTeam();
  }, [activeLab?.id, loadHistory, loadTeam]);

  // ── save ────────────────────────────────────────────────────────────────────
  const doSave = useCallback(
    async (currentBlocks: NotebookBlock[], time: string, sum: string) => {
      if (!activeLab) return;
      setSaving(true);
      setError(null);
      try {
        const plainText = blocksToPlainText(currentBlocks);
        const updated = await saveLabNotebookEntry(
          plainText,
          selectedDate,
          activeLab.id,
          currentBlocks,
          time || null,
          sum || null,
        );
        setEntry(updated);
        setSavedMsg("Saved ✓");
        setTimeout(() => setSavedMsg(null), 2500);
        isDirty.current = false;
        // Refresh calendar dots
        await loadHistory();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [activeLab, selectedDate, loadHistory],
  );

  const handleSave = () => doSave(blocks, entryTime, summary);

  // ── blocks change → mark dirty + debounced auto-save ─────────────────────────
  const handleBlocksChange = (next: NotebookBlock[]) => {
    setBlocks(next);
    isDirty.current = true;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (isDirty.current) doSave(next, entryTime, summary);
    }, 5000);
  };

  // ── image upload ─────────────────────────────────────────────────────────────
  const handleImageUpload = async (file: File) => {
    return uploadNotebookImage(file, activeLab?.id);
  };

  // ── calendar popup save ──────────────────────────────────────────────────────
  const handleSaveTimeDetails = async (date: string, time: string, sum: string) => {
    // If it's for the currently loaded date, save immediately
    if (date === selectedDate) {
      setEntryTime(time);
      setSummary(sum);
      await doSave(blocks, time, sum);
    } else {
      // Need to load entry first, then save with updated time/summary
      const res = await fetchLabNotebookEntry(date, activeLab?.id);
      const existingBlocks = entryToBlocks(res.entry);
      if (!activeLab) return;
      const plainText = blocksToPlainText(existingBlocks);
      await saveLabNotebookEntry(plainText, date, activeLab.id, existingBlocks, time || null, sum || null);
      await loadHistory();
    }
  };

  // ── formatted date ─────────────────────────────────────────────────────────
  const formattedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // ── tab list ───────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: "editor",   label: "Notebook" },
    { id: "tasks",    label: "Tasks" },
    { id: "activity", label: "Activity" },
    ...(isAdminUser ? [{ id: "admin" as Tab, label: "Compare Users", adminOnly: true }] : []),
  ];

  const labUsers = labTeam.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <LogbookHeader
        title="Lab Notebook"
        subtitle="Digital ruled notebook with rich formatting, calendar history, tasks and activity log"
        isAdmin={isAdminUser}
      />

      {/* Tab bar */}
      <div className="mb-5 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-xs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={[
              "flex-1 rounded-xl py-2 text-xs font-bold transition-colors",
              activeTab === t.id
                ? "bg-slate-950 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900",
            ].join(" ")}
          >
            {t.label}
            {t.adminOnly && (
              <span className="ml-1 rounded-md bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">
                Admin
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── EDITOR TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === "editor" && (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          {/* Left: Calendar + metadata */}
          <div className="space-y-4">
            <NotebookCalendar
              history={history}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onSaveTimeDetails={handleSaveTimeDetails}
            />

            {/* Entry metadata */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Entry Metadata
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">Entry Time</label>
                <input
                  type="time"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">Summary / Title</label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  maxLength={200}
                  placeholder="Short description for this entry…"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Entry history list */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-xs font-bold text-slate-900">My Entries</p>
                <p className="text-[10px] text-slate-400">{history.length} total entries</p>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                {history.length === 0 ? (
                  <p className="px-4 py-4 text-center text-[11px] text-slate-400">No entries yet</p>
                ) : (
                  history.slice(0, 30).map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelectedDate(h.date)}
                      className={[
                        "w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors",
                        h.date === selectedDate ? "bg-amber-50" : "",
                      ].join(" ")}
                    >
                      <p className="text-[11px] font-semibold text-slate-900">{h.date}</p>
                      {h.summary && (
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">{h.summary}</p>
                      )}
                      {h.entryTime && (
                        <p className="text-[10px] text-slate-400">{h.entryTime}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: editor */}
          <div className="space-y-3">
            {/* Date bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-500">Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayString())}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Today
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900">{formattedDate}</span>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Saving…
                    </>
                  ) : (
                    "Save Entry"
                  )}
                </button>
              </div>
            </div>

            {savedMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">
                {savedMsg}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-amber-600" />
              </div>
            ) : (
              <NotebookEditor
                blocks={blocks}
                onChange={handleBlocksChange}
                onImageUpload={handleImageUpload}
                authorName={entry?.userName || user?.name || user?.email || ""}
                dateLabel={selectedDate}
              />
            )}
          </div>
        </div>
      )}

      {/* ── TASKS TAB ─────────────────────────────────────────────────────────── */}
      {activeTab === "tasks" && (
        <NotebookTaskPanel
          labId={activeLab?.id}
          isAdmin={isAdminUser}
          currentUserId={user?.id ?? ""}
          labUsers={labUsers}
        />
      )}

      {/* ── ACTIVITY TAB ──────────────────────────────────────────────────────── */}
      {activeTab === "activity" && (
        <NotebookActivityLogPanel labId={activeLab?.id} />
      )}

      {/* ── ADMIN COMPARE TAB ─────────────────────────────────────────────────── */}
      {activeTab === "admin" && isAdminUser && (
        <AdminNotebookView
          users={labUsers}
          labId={activeLab?.id}
        />
      )}
    </div>
  );
}
