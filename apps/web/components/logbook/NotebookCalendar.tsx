"use client";

/**
 * NotebookCalendar
 *
 * Compact month-grid calendar.
 * – Dates that have a notebook entry show a filled amber dot.
 * – Clicking a date with an entry opens a popup showing summary + time,
 *   and lets the user edit the time annotation and summary inline.
 * – Clicking today or any date without an entry opens the popup to create.
 */

import { useState } from "react";
import type { NotebookHistoryItem } from "@/lib/api";

type Props = {
  history: NotebookHistoryItem[];       // entries returned by fetchNotebookHistory
  selectedDate: string;                 // YYYY-MM-DD
  onSelectDate: (date: string) => void; // called when user selects a date to view/edit
  onSaveTimeDetails: (date: string, entryTime: string, summary: string) => Promise<void>;
};

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function padDate(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(year: number, month: number, day: number) {
  return `${year}-${padDate(month + 1)}-${padDate(day)}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function NotebookCalendar({
  history,
  selectedDate,
  onSelectDate,
  onSaveTimeDetails,
}: Props) {
  const today = new Date().toISOString().split("T")[0]!;
  const [viewYear, setViewYear] = useState(() => {
    const d = new Date(selectedDate + "T00:00:00");
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(selectedDate + "T00:00:00");
    return d.getMonth();
  });

  // Popup state
  const [popupDate, setPopupDate] = useState<string | null>(null);
  const [popupTime, setPopupTime] = useState("");
  const [popupSummary, setPopupSummary] = useState("");
  const [saving, setSaving] = useState(false);

  // Build a set for O(1) lookup
  const entryMap = new Map<string, NotebookHistoryItem>();
  for (const h of history) entryMap.set(h.date, h);

  const days = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const openPopup = (dateKey: string) => {
    const existing = entryMap.get(dateKey);
    setPopupDate(dateKey);
    setPopupTime(existing?.entryTime || "");
    setPopupSummary(existing?.summary || "");
  };

  const closePopup = () => setPopupDate(null);

  const handlePopupOpen = (dateKey: string) => {
    onSelectDate(dateKey);
    openPopup(dateKey);
  };

  const handleSave = async () => {
    if (!popupDate) return;
    setSaving(true);
    try {
      await onSaveTimeDetails(popupDate, popupTime, popupSummary);
      closePopup();
    } finally {
      setSaving(false);
    }
  };

  // Build grid cells (leading empty + day cells)
  const cells: Array<{ day: number | null; dateKey: string | null }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateKey: null });
  for (let d = 1; d <= days; d++) {
    cells.push({ day: d, dateKey: toKey(viewYear, viewMonth, d) });
  }

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white shadow-xs">
      {/* Month navigation */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-xs font-bold text-slate-900">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="m8.25 4.5 7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-slate-100 px-2">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1.5 text-center text-[10px] font-semibold text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px p-2">
        {cells.map((cell, i) => {
          if (!cell.day || !cell.dateKey) {
            return <div key={`empty-${i}`} />;
          }
          const dk = cell.dateKey;
          const hasEntry = entryMap.has(dk);
          const isSelected = dk === selectedDate;
          const isToday = dk === today;

          return (
            <button
              key={dk}
              type="button"
              onClick={() => handlePopupOpen(dk)}
              className={[
                "relative flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-semibold transition-colors",
                isSelected
                  ? "bg-slate-950 text-white"
                  : isToday
                  ? "bg-amber-100 text-amber-800 ring-1 ring-amber-400"
                  : "text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {cell.day}
              {hasEntry && (
                <span
                  className={[
                    "mt-0.5 h-1.5 w-1.5 rounded-full",
                    isSelected ? "bg-amber-300" : "bg-amber-500",
                  ].join(" ")}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Has entry
        <span className="ml-2 h-2 w-2 rounded-full bg-slate-950" />
        Selected
      </div>

      {/* ── Date detail popup ── */}
      {popupDate && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={closePopup}
          />
          <div className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900">
                {new Date(popupDate + "T00:00:00").toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <button type="button" onClick={closePopup} className="text-slate-400 hover:text-slate-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {entryMap.has(popupDate) && (
              <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Entry exists — click below to open &amp; edit
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Entry Time (HH:MM)
                </label>
                <input
                  type="time"
                  value={popupTime}
                  onChange={(e) => setPopupTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Summary / Title
                </label>
                <input
                  type="text"
                  value={popupSummary}
                  onChange={(e) => setPopupSummary(e.target.value)}
                  maxLength={200}
                  placeholder="Short description of this entry…"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-slate-950 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Details"}
              </button>
              <button
                type="button"
                onClick={() => { onSelectDate(popupDate); closePopup(); }}
                className="flex-1 rounded-xl border border-slate-300 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open Entry
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
