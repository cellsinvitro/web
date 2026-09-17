"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isAdmin as checkIsAdmin } from "@/lib/admin";
import {
  fetchLogbookInstrument,
  fetchLogbookBookings,
  createLogbookBooking,
  updateLogbookBooking,
  cancelLogbookBooking,
  updateLogbookInstrument,
  type LogbookInstrument,
  type LogbookBooking,
  type InstrumentStatus,
} from "@/lib/api";

function formatTo12Hr(time24: string): string {
  if (!time24) return "";
  const parts = time24.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let i = 0; i < 24; i++) {
    const h = String(i).padStart(2, "0");
    slots.push(`${h}:00`);
    slots.push(`${h}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export default function InstrumentLogbookPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";

  const { user } = useAuth();
  const isAdminUser = checkIsAdmin(user?.role);

  // Today formatted as YYYY-MM-DD
  const getTodayString = () => {
    return new Date().toISOString().split("T")[0] || "";
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [viewMode, setViewMode] = useState<"DAY" | "WEEK" | "MONTH">("DAY");

  const [instrument, setInstrument] = useState<LogbookInstrument | null>(null);
  const [bookings, setBookings] = useState<LogbookBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<LogbookBooking | null>(null);

  // Add booking form fields
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [remarks, setRemarks] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Service Edit Form fields
  const [editServiceDate, setEditServiceDate] = useState("");
  const [editCleaningDate, setEditCleaningDate] = useState("");
  const [editNextServiceDate, setEditNextServiceDate] = useState("");
  const [editStatus, setEditStatus] = useState<InstrumentStatus>("ACTIVE");

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const [instRes, bookingsRes] = await Promise.all([
        fetchLogbookInstrument(id),
        fetchLogbookBookings({ instrumentId: id, date: selectedDate }),
      ]);

      setInstrument(instRes.instrument);
      setBookings(bookingsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load logbook details";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, selectedDate]);

  // Date Nav Helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0] || selectedDate);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0] || selectedDate);
  };

  const handleToday = () => {
    setSelectedDate(getTodayString());
  };

  const openSlotBooking = (slotTime: string) => {
    if (instrument?.status === "UNDER_MAINTENANCE" || instrument?.status === "OUT_OF_SERVICE" || instrument?.status === "ARCHIVED") {
      alert(`Instrument is currently ${instrument.status.replace("_", " ").toLowerCase()}. Bookings are disabled.`);
      return;
    }

    setStartTime(slotTime);
    // Default 1 hr duration
    const parts = slotTime.split(":");
    const h = Number(parts[0] ?? 0);
    const m = Number(parts[1] ?? 0);
    const endH = String((h + 1) % 24).padStart(2, "0");
    setEndTime(`${endH}:${String(m).padStart(2, "0")}`);
    setRemarks("");
    setModalError(null);
    setShowAddModal(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      setModalError("Start time and End time are required");
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);

      await createLogbookBooking({
        instrumentId: id,
        date: selectedDate,
        startTime,
        endTime,
        remarks: remarks.trim() || undefined,
      });

      setShowAddModal(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to book instrument";
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    try {
      setModalSubmitting(true);
      setModalError(null);

      await updateLogbookBooking(selectedBooking.id, {
        date: selectedDate,
        startTime,
        endTime,
        remarks: remarks.trim() || undefined,
      });

      setShowEditModal(false);
      setShowDetailModal(false);
      setSelectedBooking(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update booking";
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      await cancelLogbookBooking(bookingId);
      setShowDetailModal(false);
      setSelectedBooking(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel booking");
    }
  };

  const handleSaveServiceInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setModalSubmitting(true);
      await updateLogbookInstrument(id, {
        lastServiceDate: editServiceDate || null,
        lastCleaningDate: editCleaningDate || null,
        nextServiceDate: editNextServiceDate || null,
        status: editStatus,
      });
      setShowServiceModal(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update service info");
    } finally {
      setModalSubmitting(false);
    }
  };

  const openEditServiceModal = () => {
    if (!instrument) return;
    setEditServiceDate(instrument.lastServiceDate ? (instrument.lastServiceDate.split("T")[0] || "") : "");
    setEditCleaningDate(instrument.lastCleaningDate ? (instrument.lastCleaningDate.split("T")[0] || "") : "");
    setEditNextServiceDate(instrument.nextServiceDate ? (instrument.nextServiceDate.split("T")[0] || "") : "");
    setEditStatus(instrument.status);
    setShowServiceModal(true);
  };

  // Map bookings to time slot index
  const bookingsMap = useMemo(() => {
    const map = new Map<string, LogbookBooking>();
    for (const b of bookings) {
      if (b.status === "CONFIRMED") {
        map.set(b.startTime, b);
      }
    }
    return map;
  }, [bookings]);

  // Format Date for Header
  const formattedDisplayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back to Instruments */}
      <div className="mb-4">
        <Link
          href="/dashboard/logbook"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Logbook Dashboard
        </Link>
      </div>

      {loading && !instrument ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600 mb-3" />
          <p className="text-xs font-medium">Loading instrument calendar...</p>
        </div>
      ) : error || !instrument ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 space-y-3">
          <p className="font-semibold">{error || "Instrument not found"}</p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={loadData}
              className="rounded-xl bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800"
            >
              Retry Loading
            </button>
            <Link
              href="/dashboard/logbook"
              className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              Return to Instruments
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Instrument Header & Info */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {instrument.code}
                  </span>
                  <h1 className="text-2xl font-bold text-slate-950">{instrument.name}</h1>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      instrument.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                        : instrument.status === "UNDER_MAINTENANCE"
                        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                        : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                    }`}
                  >
                    {instrument.status.replace("_", " ")}
                  </span>
                </div>
                {instrument.description && (
                  <p className="mt-2 text-xs text-slate-600">{instrument.description}</p>
                )}
              </div>

              {isAdminUser && (
                <button
                  type="button"
                  onClick={openEditServiceModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                >
                  <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766l.512-.153a3.75 3.75 0 0 0 2.228-2.228l.153-.512c.14-.468.382-.89.766-1.208l3.03-2.496M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.653-4.655" />
                  </svg>
                  Update Service Info
                </button>
              )}
            </div>

            {/* Service & Maintenance details bar */}
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4 text-xs">
              <div>
                <span className="text-slate-400">Installed On:</span>
                <p className="font-semibold text-slate-800">
                  {instrument.installedOn
                    ? new Date(instrument.installedOn).toLocaleDateString("en-IN")
                    : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Last Service:</span>
                <p className="font-semibold text-slate-800">
                  {instrument.lastServiceDate
                    ? new Date(instrument.lastServiceDate).toLocaleDateString("en-IN")
                    : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Next Service Due:</span>
                <p className="font-semibold text-slate-800">
                  {instrument.nextServiceDate
                    ? new Date(instrument.nextServiceDate).toLocaleDateString("en-IN")
                    : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Incharge:</span>
                <p className="font-semibold text-slate-800 truncate">
                  {instrument.inchargeName || "N/A"}{" "}
                  {instrument.inchargeContact ? `(${instrument.inchargeContact})` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Under Maintenance Warning Banner */}
          {instrument.status === "UNDER_MAINTENANCE" && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-800">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </span>
              <div>
                <h4 className="font-bold text-sm">INSTRUMENT UNDER MAINTENANCE</h4>
                <p className="text-xs text-amber-800">
                  This instrument is currently undergoing routine maintenance. Normal booking submissions are disabled until maintenance is completed.
                </p>
              </div>
            </div>
          )}

          {/* Date Navigation Bar */}
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevDay}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
                title="Previous Day"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Today
              </button>

              <button
                type="button"
                onClick={handleNextDay}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
                title="Next Day"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div className="text-center sm:text-right">
              <span className="text-sm font-bold text-slate-900">{formattedDisplayDate}</span>
            </div>

            <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
              {(["DAY", "WEEK", "MONTH"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    viewMode === mode ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* DAY VIEW TIMELINE GRID (00:00 to 24:00) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>Timeline Slot (30-min Intervals)</span>
                <span>Click slot to book instrument</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
              {TIME_SLOTS.map((slot) => {
                const booking = bookingsMap.get(slot);

                return (
                  <div
                    key={slot}
                    className="group flex min-h-[52px] items-stretch transition-colors hover:bg-slate-50/80"
                  >
                    {/* Time Label */}
                    <div className="w-24 shrink-0 border-r border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500">
                      {formatTo12Hr(slot)}
                    </div>

                    {/* Timeline Action / Slot Area */}
                    <div className="flex-1 p-1">
                      {booking ? (
                        <div
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowDetailModal(true);
                          }}
                          className="flex h-full cursor-pointer flex-col justify-center rounded-xl bg-teal-600/10 border-l-4 border-teal-600 p-2.5 transition-all hover:bg-teal-600/20"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-teal-950">
                              {booking.userName}
                            </span>
                            <span className="rounded-md bg-teal-700/10 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
                              {formatTo12Hr(booking.startTime)} - {formatTo12Hr(booking.endTime)}
                            </span>
                          </div>
                          {booking.remarks && (
                            <p className="mt-1 line-clamp-1 text-xs text-teal-900">
                              Remarks: {booking.remarks}
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openSlotBooking(slot)}
                          className="flex h-full w-full items-center rounded-xl px-3 text-xs font-medium text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100/80"
                        >
                          + Book slot ({formatTo12Hr(slot)})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Add Log Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add Log Entry</h3>
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

            <form onSubmit={handleCreateBooking} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-500">Instrument</label>
                <input
                  type="text"
                  disabled
                  value={`${instrument?.name} (${instrument?.code})`}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-500">User / Booked By</label>
                <input
                  type="text"
                  disabled
                  value={user?.name || user?.email || "Staff"}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-500">Date</label>
                <input
                  type="text"
                  disabled
                  value={formattedDisplayDate}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700">Start Time *</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {formatTo12Hr(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700">End Time *</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {formatTo12Hr(t)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700">Remarks / Purpose</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sample analysis, HPLC run batch #42"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
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
                  disabled={modalSubmitting}
                  className="rounded-xl bg-teal-600 px-5 py-2 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {modalSubmitting ? "Booking..." : "Book Instrument"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Booking Details</h3>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Instrument:</span>
                <span className="font-bold text-slate-900">{instrument?.name} ({instrument?.code})</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Booked By:</span>
                <span className="font-bold text-slate-900">{selectedBooking.userName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold text-slate-800">{selectedBooking.date.split("T")[0]}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Time Window:</span>
                <span className="font-bold text-teal-700">
                  {formatTo12Hr(selectedBooking.startTime)} - {formatTo12Hr(selectedBooking.endTime)}
                </span>
              </div>
              <div className="border-b border-slate-100 pb-2">
                <span className="text-slate-500">Remarks / Notes:</span>
                <p className="mt-1 font-medium text-slate-800">{selectedBooking.remarks || "None provided"}</p>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Created At:</span>
                <span>{new Date(selectedBooking.createdAt).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
              {(isAdminUser || selectedBooking.userId === user?.id) && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCancelBooking(selectedBooking.id)}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 font-semibold text-rose-600 hover:bg-rose-100"
                  >
                    Cancel Booking
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Update Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Update Service & Status</h3>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveServiceInfo} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as InstrumentStatus)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  <option value="OUT_OF_SERVICE">Out of Service</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700">Last Service Date</label>
                <input
                  type="date"
                  value={editServiceDate}
                  onChange={(e) => setEditServiceDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700">Last Cleaning Date</label>
                <input
                  type="date"
                  value={editCleaningDate}
                  onChange={(e) => setEditCleaningDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700">Next Service Due Date</label>
                <input
                  type="date"
                  value={editNextServiceDate}
                  onChange={(e) => setEditNextServiceDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="rounded-xl bg-slate-950 px-5 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {modalSubmitting ? "Saving..." : "Save Service Info"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
