"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  fetchTodayAttendance,
  adminUpdateAttendance,
  fetchAttendanceHistory,
  type TodayAttendanceResponse,
  type AttendanceHistoryRecord,
  type LabAttendanceStatus,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Props = {
  labId: string;
  initialFilter?: LabAttendanceStatus | "ALL";
};

export default function AttendanceManagement({ labId, initialFilter = "ALL" }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [todayData, setTodayData] = useState<TodayAttendanceResponse | null>(null);
  const [historyData, setHistoryData] = useState<AttendanceHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<LabAttendanceStatus | "ALL">(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");

  // Override Modal
  const [editingUser, setEditingUser] = useState<{
    userId: string;
    name: string;
    currentStatus: LabAttendanceStatus;
  } | null>(null);
  const [newStatus, setNewStatus] = useState<LabAttendanceStatus>("PRESENT_ON_SITE");
  const [overrideNote, setOverrideNote] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  const loadData = useCallback(async () => {
    if (!labId) return;
    try {
      setLoading(true);
      setError(null);

      if (activeTab === "today") {
        const res = await fetchTodayAttendance(labId);
        setTodayData(res);
      } else {
        const res = await fetchAttendanceHistory(labId, 30);
        setHistoryData(res.records);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  }, [labId, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdminOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSavingOverride(true);
      await adminUpdateAttendance(
        labId,
        editingUser.userId,
        newStatus,
        overrideNote.trim() || undefined
      );
      setEditingUser(null);
      setOverrideNote("");
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to override attendance");
    } finally {
      setSavingOverride(false);
    }
  };

  const filteredMembers = (todayData?.members || []).filter((m) => {
    const matchesStatus =
      statusFilter === "ALL" || m.attendance.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredHistory = historyData.filter((h) => {
    const matchesStatus = statusFilter === "ALL" || h.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      h.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: LabAttendanceStatus) => {
    switch (status) {
      case "PRESENT_ON_SITE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Present On Site
          </span>
        );
      case "WORKING_FROM_HOME":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Working From Home
          </span>
        );
      case "ON_LEAVE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
            On Leave
          </span>
        );
      case "ABSENT":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
            Absent
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Team Attendance Roster</h2>
          <p className="mt-1 text-xs text-slate-500">
            Monitor lab presence, remote work, leaves, and manage team attendance logs.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
              activeTab === "today"
                ? "bg-white text-slate-950 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Today&apos;s Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
              activeTab === "history"
                ? "bg-white text-slate-950 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            History Log (30 Days)
          </button>
        </div>
      </div>

      {/* Summary KPI Badges (for Today tab) */}
      {activeTab === "today" && todayData && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-2xl font-black text-slate-900">{todayData.stats.totalMembers}</span>
            <span className="mt-1 block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Team Members
            </span>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-xs">
            <span className="text-2xl font-black text-emerald-600">{todayData.stats.presentOnSite}</span>
            <span className="mt-1 block text-[11px] font-bold text-emerald-700/70 uppercase tracking-wider">
              Present On Site
            </span>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-xs">
            <span className="text-2xl font-black text-blue-600">{todayData.stats.workingFromHome}</span>
            <span className="mt-1 block text-[11px] font-bold text-blue-700/70 uppercase tracking-wider">
              Working From Home
            </span>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-xs">
            <span className="text-2xl font-black text-rose-500">{todayData.stats.absent}</span>
            <span className="mt-1 block text-[11px] font-bold text-rose-700/70 uppercase tracking-wider">
              Absent
            </span>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-xs">
            <span className="text-2xl font-black text-amber-500">{todayData.stats.onLeave}</span>
            <span className="mt-1 block text-[11px] font-bold text-amber-700/70 uppercase tracking-wider">
              On Leave
            </span>
          </div>
        </div>
      )}

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ALL", "PRESENT_ON_SITE", "WORKING_FROM_HOME", "ABSENT", "ON_LEAVE"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === st
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {st === "ALL"
                ? "All Members"
                : st === "PRESENT_ON_SITE"
                ? "On Site"
                : st === "WORKING_FROM_HOME"
                ? "WFH"
                : st === "ABSENT"
                ? "Absent"
                : "On Leave"}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search member..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 pl-9 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Main Table / List View */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-900 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600">{error}</div>
        ) : activeTab === "today" ? (
          filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-sm font-medium text-slate-500">
              No team members match the selected filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMembers.map((m) => (
                <div
                  key={m.userId}
                  className="flex flex-col gap-4 p-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* User Profile */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-white text-base shadow-xs">
                      {m.name ? m.name.charAt(0).toUpperCase() : m.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{m.name}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                          {m.memberRole}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">{m.email}</span>
                    </div>
                  </div>

                  {/* Attendance Details & Admin Action */}
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      {getStatusBadge(m.attendance.status)}
                      {m.attendance.checkInTime && (
                        <span className="mt-1 block text-[11px] font-medium text-slate-400">
                          Check-in: {new Date(m.attendance.checkInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                        </span>
                      )}
                      {m.attendance.note && (
                        <span className="mt-0.5 block text-[11px] italic text-slate-500">
                          &quot;{m.attendance.note}&quot;
                        </span>
                      )}
                      {m.attendance.markedBy && (
                        <span className="block text-[10px] text-slate-400">
                          Marked by: {m.attendance.markedBy}
                        </span>
                      )}
                    </div>

                    {/* Admin Override Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setEditingUser({
                          userId: m.userId,
                          name: m.name,
                          currentStatus: m.attendance.status,
                        })
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors shadow-2xs"
                    >
                      Edit Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* History Tab Table */
          filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-sm font-medium text-slate-500">
              No attendance logs recorded for the selected period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Check-In Time</th>
                    <th className="px-5 py-3">Note / Marked By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-slate-900 font-semibold">{h.date}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{h.userName}</div>
                        <div className="text-[11px] text-slate-400">{h.userEmail}</div>
                      </td>
                      <td className="px-5 py-3.5">{getStatusBadge(h.status)}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">
                        {h.checkInTime ? new Date(h.checkInTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "-"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {h.note && <span className="block font-medium text-slate-700">&quot;{h.note}&quot;</span>}
                        {h.markedBy && <span className="block text-[10px] text-slate-400">By {h.markedBy}</span>}
                        {!h.note && !h.markedBy && <span className="text-slate-300">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Admin Override Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Update Attendance: {editingUser.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminOverride} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Select Status</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { id: "PRESENT_ON_SITE", label: "📍 Present on Site" },
                    { id: "WORKING_FROM_HOME", label: "🏠 Working from Home" },
                    { id: "ON_LEAVE", label: "🌴 On Leave" },
                    { id: "ABSENT", label: "❌ Absent" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNewStatus(opt.id as LabAttendanceStatus)}
                      className={`rounded-xl border p-2.5 text-xs font-bold transition-all text-left ${
                        newStatus === opt.id
                          ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Optional Manager Note</label>
                <input
                  type="text"
                  placeholder="e.g. Approved leave / Site visit..."
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOverride}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingOverride ? "Saving..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
