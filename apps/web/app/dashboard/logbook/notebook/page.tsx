"use client";

import { useEffect, useState } from "react";
import LogbookHeader from "@/components/logbook/LogbookHeader";
import { fetchLabNotebookEntry, saveLabNotebookEntry, type LabNotebookEntry } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";
import { isAdmin as checkIsAdmin } from "@/lib/admin";

export default function LabNotebookPage() {
  const { user } = useAuth();
  const { activeLab } = useLabWorkspace();
  const isAdminUser = checkIsAdmin(user?.role);

  const getTodayString = () => new Date().toISOString().split("T")[0] || "";

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [entry, setEntry] = useState<LabNotebookEntry | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNotebook = async (dateStr: string) => {
    if (!activeLab) return;
    try {
      setLoading(true);
      setError(null);
      setSavedMessage(null);
      const res = await fetchLabNotebookEntry(dateStr, activeLab.id);
      setEntry(res.entry);
      setContent(res.entry ? res.entry.content : "");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load notebook entry";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotebook(selectedDate);
  }, [selectedDate, activeLab?.id]);

  const handleSave = async () => {
    if (!activeLab) return;
    try {
      setSaving(true);
      setError(null);
      setSavedMessage(null);
      const updated = await saveLabNotebookEntry(content, selectedDate, activeLab.id);
      setEntry(updated);
      setSavedMessage("Notebook entry saved successfully.");
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save notebook entry";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <LogbookHeader
        title="Lab Notebook"
        subtitle="Digital A5-style ruled laboratory notebook for date-wise observations and notes"
        isAdmin={isAdminUser}
      />

      {/* Date Bar */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500">Select Date:</label>
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

        <div>
          <span className="text-sm font-bold text-slate-900">{formattedDate}</span>
        </div>
      </div>

      {savedMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
          {savedMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* A5 Ruled Notebook Sheet Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-amber-50/40 shadow-md">
        {/* Notebook Top Header */}
        <div className="flex items-center justify-between border-b-2 border-amber-300/80 bg-amber-100/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200 text-amber-800 font-bold text-xs">
              A5
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">LABORATORY NOTEBOOK</h2>
              <p className="text-[11px] text-slate-500">
                Author: {entry?.userName || user?.name || user?.email || "Staff Member"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </div>

        {/* Ruled Paper Area */}
        <div className="relative p-6 sm:p-10">
          {/* Margin Line */}
          <div className="pointer-events-none absolute bottom-0 left-12 top-0 w-0.5 bg-rose-300/60 sm:left-16" />

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-amber-600" />
            </div>
          ) : (
            <textarea
              rows={22}
              placeholder="Write date-wise lab entries, observations, experimental parameters, or notes..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full resize-none border-none bg-transparent pl-8 sm:pl-12 text-sm font-medium leading-8 text-slate-900 focus:outline-none"
              style={{
                backgroundImage:
                  "linear-gradient(transparent 31px, rgba(203, 213, 225, 0.7) 32px)",
                backgroundSize: "100% 32px",
                lineHeight: "32px",
              }}
            />
          )}
        </div>

        <div className="flex justify-between border-t border-amber-200 bg-amber-100/40 px-6 py-2.5 text-[11px] text-slate-500">
          <span>Date: {selectedDate}</span>
          <span>CellsInVitro Logbook Notebook • Confidential</span>
        </div>
      </div>
    </div>
  );
}
