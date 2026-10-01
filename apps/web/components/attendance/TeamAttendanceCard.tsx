"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  fetchTodayAttendance,
  markUserAttendance,
  type TodayAttendanceResponse,
  type LabAttendanceStatus,
} from "@/lib/api";

type Props = {
  labId: string;
  onViewClick?: (filterStatus?: LabAttendanceStatus | "ALL") => void;
  className?: string;
};

export default function TeamAttendanceCard({ labId, onViewClick, className = "" }: Props) {
  const [data, setData] = useState<TodayAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingStatus, setMarkingStatus] = useState<string | null>(null);
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [note, setNote] = useState("");

  const loadData = useCallback(async () => {
    if (!labId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchTodayAttendance(labId);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [labId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckIn = async (status: "PRESENT_ON_SITE" | "WORKING_FROM_HOME" | "ON_LEAVE") => {
    try {
      setMarkingStatus(status);
      await markUserAttendance(labId, status, note.trim() || undefined);
      setShowCheckInForm(false);
      setNote("");
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update attendance");
    } finally {
      setMarkingStatus(null);
    }
  };

  const stats = data?.stats || {
    totalMembers: 0,
    presentOnSite: 0,
    workingFromHome: 0,
    absent: 0,
    onLeave: 0,
  };

  const myStatus = data?.myAttendance?.status;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Top Title & View Link */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xl font-bold tracking-tight text-slate-900">Team Attendance</h3>
        <button
          type="button"
          onClick={() => onViewClick?.("ALL")}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          View
        </button>
      </div>

      {/* Card Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-md">
        {/* Banner Header (Amber/Orange accent) */}
        <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 px-5 py-3 text-white">
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold tracking-wide drop-shadow-xs">Attendance</span>
            {data?.date && (
              <span className="text-xs font-medium text-amber-100/90">
                {new Date(data.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Card Content Stats */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="py-4 text-center text-xs text-rose-600">{error}</div>
          ) : (
            <div className="space-y-4">
              {/* Row 1: Total Members */}
              <button
                type="button"
                onClick={() => onViewClick?.("ALL")}
                className="group flex w-full items-baseline justify-between rounded-xl p-2.5 transition-colors hover:bg-slate-50 text-left"
              >
                <div>
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    {stats.totalMembers}
                  </span>
                  <span className="mt-1 block text-xs font-bold tracking-wider text-slate-400 uppercase">
                    TOTAL TEAM MEMBERS
                  </span>
                </div>
                <span className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>

              <div className="h-px bg-slate-100" />

              {/* Row 2: Present on site | Working from home */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onViewClick?.("PRESENT_ON_SITE")}
                  className="group flex items-baseline justify-between rounded-xl p-2.5 transition-colors hover:bg-emerald-50/50 text-left border-r border-slate-100 pr-3"
                >
                  <div>
                    <span className="text-3xl font-bold text-emerald-600">
                      {stats.presentOnSite}
                    </span>
                    <span className="mt-1 block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      PRESENT ON SITE
                    </span>
                  </div>
                  <span className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onViewClick?.("WORKING_FROM_HOME")}
                  className="group flex items-baseline justify-between rounded-xl p-2.5 transition-colors hover:bg-emerald-50/50 text-left pl-3"
                >
                  <div>
                    <span className="text-3xl font-bold text-emerald-600">
                      {stats.workingFromHome}
                    </span>
                    <span className="mt-1 block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      WORKING FROM HOME
                    </span>
                  </div>
                  <span className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Row 3: Absent | On leave */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onViewClick?.("ABSENT")}
                  className="group flex items-baseline justify-between rounded-xl p-2.5 transition-colors hover:bg-rose-50/50 text-left border-r border-slate-100 pr-3"
                >
                  <div>
                    <span className="text-3xl font-bold text-rose-500">
                      {stats.absent}
                    </span>
                    <span className="mt-1 block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      ABSENT
                    </span>
                  </div>
                  <span className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-rose-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onViewClick?.("ON_LEAVE")}
                  className="group flex items-baseline justify-between rounded-xl p-2.5 transition-colors hover:bg-amber-50/50 text-left pl-3"
                >
                  <div>
                    <span className="text-3xl font-bold text-amber-500">
                      {stats.onLeave}
                    </span>
                    <span className="mt-1 block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      ON LEAVE
                    </span>
                  </div>
                  <span className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              </div>

              {/* User Action Footer */}
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-700">Your Attendance Today:</span>
                  </div>
                  {myStatus ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        myStatus === "PRESENT_ON_SITE"
                          ? "bg-emerald-100 text-emerald-800"
                          : myStatus === "WORKING_FROM_HOME"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {myStatus === "PRESENT_ON_SITE"
                        ? "Present on Site"
                        : myStatus === "WORKING_FROM_HOME"
                        ? "WFH"
                        : "On Leave"}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Not Marked</span>
                  )}
                </div>

                {showCheckInForm ? (
                  <div className="mt-3 space-y-2.5 border-t border-slate-200/60 pt-3">
                    <input
                      type="text"
                      placeholder="Optional note (e.g. Bench 3, Lab 102)..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={!!markingStatus}
                        onClick={() => handleCheckIn("PRESENT_ON_SITE")}
                        className="rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                      >
                        📍 On Site
                      </button>
                      <button
                        type="button"
                        disabled={!!markingStatus}
                        onClick={() => handleCheckIn("WORKING_FROM_HOME")}
                        className="rounded-lg bg-blue-600 px-2 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                      >
                        🏠 WFH
                      </button>
                      <button
                        type="button"
                        disabled={!!markingStatus}
                        onClick={() => handleCheckIn("ON_LEAVE")}
                        className="rounded-lg bg-amber-600 px-2 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                      >
                        🌴 On Leave
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCheckInForm(true)}
                    className="mt-2.5 w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                  >
                    {myStatus ? "Update Status" : "Mark My Attendance"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
