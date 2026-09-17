"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LogbookHeader from "@/components/logbook/LogbookHeader";
import {
  fetchLogbookInstruments,
  createLogbookInstrument,
  type LogbookInstrument,
  type LogbookPermission,
  type InstrumentStatus,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { isAdmin as checkIsAdmin } from "@/lib/admin";

export default function LogbookDashboardPage() {
  const { user } = useAuth();
  const isAdminUser = checkIsAdmin(user?.role);

  const [instruments, setInstruments] = useState<LogbookInstrument[]>([]);
  const [permissions, setPermissions] = useState<LogbookPermission>({
    canViewLogbook: true,
    canCreateEntries: true,
    canEditOwnEntries: true,
    canEditOthersEntries: isAdminUser,
    canManageInstruments: isAdminUser,
    canGenerateReports: isAdminUser,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Instrument Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [inchargeName, setInchargeName] = useState("");
  const [inchargeContact, setInchargeContact] = useState("");
  const [installedOn, setInstalledOn] = useState("");
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<InstrumentStatus>("ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchLogbookInstruments();
      setInstruments(res.instruments);
      if (res.permissions) setPermissions(res.permissions);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load instruments";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddInstrument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setModalError("Instrument Name and Code are required");
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);
      await createLogbookInstrument({
        code: code.trim(),
        name: name.trim(),
        inchargeName: inchargeName.trim() || null,
        inchargeContact: inchargeContact.trim() || null,
        installedOn: installedOn || null,
        lastServiceDate: lastServiceDate || null,
        nextServiceDate: nextServiceDate || null,
        description: description.trim() || null,
        status,
      });

      setShowAddModal(false);
      // Reset form
      setCode("");
      setName("");
      setInchargeName("");
      setInchargeContact("");
      setInstalledOn("");
      setLastServiceDate("");
      setNextServiceDate("");
      setDescription("");
      setStatus("ACTIVE");

      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create instrument";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (st: InstrumentStatus) => {
    switch (st) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      case "UNDER_MAINTENANCE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Under Maintenance
          </span>
        );
      case "OUT_OF_SERVICE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Out of Service
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            Archived
          </span>
        );
    }
  };

  const todayDisplayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <LogbookHeader
        canManageInstruments={permissions.canManageInstruments}
        canGenerateReports={permissions.canGenerateReports}
        isAdmin={isAdminUser}
        onAddInstrument={() => setShowAddModal(true)}
      />

      {/* Date & Quick Stats Bar */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Today&apos;s Date
          </span>
          <p className="text-lg font-bold text-slate-900">{todayDisplayDate}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center sm:text-right">
            <span className="text-xs font-medium text-slate-500">
              Total Instruments
            </span>
            <p className="text-xl font-bold text-slate-900">{instruments.length}</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center sm:text-right">
            <span className="text-xs font-medium text-slate-500">
              Today&apos;s Bookings
            </span>
            <p className="text-xl font-bold text-teal-600">
              {instruments.reduce((acc, curr) => acc + (curr.todayBookingsCount || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : instruments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            No Instruments Found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Add an instrument to start tracking bookings and maintenance logbook.
          </p>
          {permissions.canManageInstruments && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800"
            >
              Add First Instrument
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {instruments.map((inst) => {
            const isServiceDueSoon = inst.isServiceDueSoon;
            const nextBookingText = inst.nextBookingTime || "No upcoming bookings today";

            return (
              <div
                key={inst.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        {inst.code}
                      </span>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">
                        {inst.name}
                      </h2>
                    </div>
                    {getStatusBadge(inst.status)}
                  </div>

                  {inst.description && (
                    <p className="mt-2.5 line-clamp-2 text-xs text-slate-600">
                      {inst.description}
                    </p>
                  )}

                  {/* Booking Info Box */}
                  <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Today&apos;s Bookings:</span>
                      <span className="font-bold text-slate-900">
                        {inst.todayBookingsCount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Next Booking:</span>
                      <span className="font-medium text-slate-900 truncate max-w-[160px]">
                        {nextBookingText}
                      </span>
                    </div>
                  </div>

                  {/* Incharge & Maintenance details */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                    {inst.inchargeName && (
                      <div className="flex justify-between">
                        <span>Incharge:</span>
                        <span className="font-medium text-slate-800">
                          {inst.inchargeName} {inst.inchargeContact ? `(${inst.inchargeContact})` : ""}
                        </span>
                      </div>
                    )}
                    {inst.nextServiceDate && (
                      <div className="flex justify-between">
                        <span>Service Due:</span>
                        <span
                          className={`font-medium ${
                            isServiceDueSoon ? "font-bold text-amber-600" : "text-slate-800"
                          }`}
                        >
                          {new Date(inst.nextServiceDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {isServiceDueSoon && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800 border border-amber-200/70">
                      <svg
                        className="h-4 w-4 shrink-0 text-amber-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                        />
                      </svg>
                      Maintenance/Service due soon!
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <Link
                    href={`/dashboard/logbook/instruments/${inst.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-teal-600"
                  >
                    Open Logbook Calendar
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Instrument Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Add New Instrument</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modalError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddInstrument} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700">Instrument Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HPLC-02"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700">Instrument Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HPLC System"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700">Incharge Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. XYZ"
                    value={inchargeName}
                    onChange={(e) => setInchargeName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700">Incharge Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={inchargeContact}
                    onChange={(e) => setInchargeContact(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700">Installed On</label>
                  <input
                    type="date"
                    value={installedOn}
                    onChange={(e) => setInstalledOn(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700">Last Service</label>
                  <input
                    type="date"
                    value={lastServiceDate}
                    onChange={(e) => setLastServiceDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700">Next Service Due</label>
                  <input
                    type="date"
                    value={nextServiceDate}
                    onChange={(e) => setNextServiceDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InstrumentStatus)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  <option value="OUT_OF_SERVICE">Out of Service</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional details or specifications..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-950 px-5 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Add Instrument"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
