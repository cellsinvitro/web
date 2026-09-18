"use client";

import { useEffect, useState } from "react";
import {
  fetchAdminLogbookOverview,
  adminCancelBooking,
  adminDeleteLabWorkspace,
  type AdminLogbookStats,
  type AdminLabWorkspaceItem,
  type AdminBookingItem,
  type AdminNotebookItem,
  type LogbookActivity,
} from "@/lib/api";

export default function AdminLogbookOverviewPage() {
  const [stats, setStats] = useState<AdminLogbookStats>({
    totalLabs: 0,
    totalInstruments: 0,
    totalBookings: 0,
    totalNotebookEntries: 0,
    totalMembers: 0,
  });

  const [labs, setLabs] = useState<AdminLabWorkspaceItem[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string; role: string }[]>([]);
  const [bookings, setBookings] = useState<AdminBookingItem[]>([]);
  const [notebooks, setNotebooks] = useState<AdminNotebookItem[]>([]);
  const [activities, setActivities] = useState<LogbookActivity[]>([]);

  // Filter States
  const [selectedLabId, setSelectedLabId] = useState<string>("ALL");
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"labs" | "bookings" | "notebooks" | "activities">("labs");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded Notebook Modal state
  const [selectedNotebook, setSelectedNotebook] = useState<AdminNotebookItem | null>(null);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminLogbookOverview({
        labId: selectedLabId,
        userId: selectedUserId,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      setStats(data.stats);
      setLabs(data.labs);
      setUsers(data.users);
      setBookings(data.bookings);
      setNotebooks(data.notebooks);
      setActivities(data.activities);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin logbook data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverviewData();
  }, [selectedLabId, selectedUserId, fromDate, toDate]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking as Super Admin?")) return;
    try {
      await adminCancelBooking(bookingId);
      await loadOverviewData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel booking");
    }
  };

  const handleDeleteLab = async (labId: string, labName: string) => {
    if (!confirm(`CAUTION: Are you sure you want to permanently delete '${labName}' and all associated instruments and entries?`)) return;
    try {
      await adminDeleteLabWorkspace(labId);
      await loadOverviewData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete lab workspace");
    }
  };

  const handleExportCSV = () => {
    let csvData = "";
    let filename = "logbook_data.csv";

    if (activeTab === "bookings") {
      filename = "master_bookings_report.csv";
      const headers = ["Booking ID", "Date", "Lab Workspace", "Instrument Code", "Instrument Name", "User Name", "User Email", "Start Time", "End Time", "Remarks", "Status"];
      const rows = filteredBookings.map((b) => [
        b.id,
        b.date,
        `"${b.labName.replace(/"/g, '""')}"`,
        b.instrumentCode,
        `"${b.instrumentName.replace(/"/g, '""')}"`,
        `"${b.userName.replace(/"/g, '""')}"`,
        b.userEmail,
        b.startTime,
        b.endTime,
        `"${b.remarks.replace(/"/g, '""')}"`,
        b.status,
      ]);
      csvData = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else if (activeTab === "notebooks") {
      filename = "master_lab_notebooks.csv";
      const headers = ["Entry ID", "Date", "Lab Workspace", "User Name", "User Email", "Content Snippet"];
      const rows = filteredNotebooks.map((n) => [
        n.id,
        n.date,
        `"${n.labName.replace(/"/g, '""')}"`,
        `"${n.userName.replace(/"/g, '""')}"`,
        n.userEmail,
        `"${n.content.slice(0, 100).replace(/"/g, '""')}"`,
      ]);
      csvData = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else {
      filename = "lab_workspaces.csv";
      const headers = ["Lab ID", "Lab Name", "Owner Name", "Owner Email", "Members Count", "Instruments Count", "Created At"];
      const rows = filteredLabs.map((l) => [
        l.id,
        `"${l.name.replace(/"/g, '""')}"`,
        `"${l.owner.name.replace(/"/g, '""')}"`,
        l.owner.email,
        l.membersCount,
        l.instrumentsCount,
        l.createdAt,
      ]);
      csvData = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Search filtering
  const q = searchQuery.toLowerCase().trim();

  const filteredLabs = labs.filter(
    (l) =>
      !q ||
      l.name.toLowerCase().includes(q) ||
      l.owner.name.toLowerCase().includes(q) ||
      l.owner.email.toLowerCase().includes(q)
  );

  const filteredBookings = bookings.filter(
    (b) =>
      !q ||
      b.userName.toLowerCase().includes(q) ||
      b.userEmail.toLowerCase().includes(q) ||
      b.instrumentName.toLowerCase().includes(q) ||
      b.instrumentCode.toLowerCase().includes(q) ||
      b.labName.toLowerCase().includes(q)
  );

  const filteredNotebooks = notebooks.filter(
    (n) =>
      !q ||
      n.userName.toLowerCase().includes(q) ||
      n.userEmail.toLowerCase().includes(q) ||
      n.labName.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
  );

  const filteredActivities = activities.filter(
    (a) =>
      !q ||
      a.userName.toLowerCase().includes(q) ||
      a.action.toLowerCase().includes(q) ||
      a.details.toLowerCase().includes(q)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white font-bold shadow-sm">
              ⚙️
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Logbook System Overview
              </h1>
              <p className="text-xs text-slate-500">
                Super Admin Master Analytics, User Lab Inspection & Global Audit Control
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Stat Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Lab Workspaces</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats.totalLabs}</p>
          <p className="mt-1 text-[11px] text-slate-400">{stats.totalMembers} total member roles</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Active Instruments</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats.totalInstruments}</p>
          <p className="mt-1 text-[11px] text-slate-400">Deployed across labs</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Bookings Made</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats.totalBookings}</p>
          <p className="mt-1 text-[11px] text-slate-400">Confirmed reservations</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Lab Notebook Entries</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats.totalNotebookEntries}</p>
          <p className="mt-1 text-[11px] text-slate-400">User notebook records</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Global Data Filters & Search</h2>
          {(selectedLabId !== "ALL" || selectedUserId !== "ALL" || fromDate || toDate || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedLabId("ALL");
                setSelectedUserId("ALL");
                setFromDate("");
                setToDate("");
                setSearchQuery("");
              }}
              className="text-[11px] font-semibold text-rose-600 hover:underline"
            >
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {/* Lab Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600">Lab Workspace</label>
            <select
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-950 focus:outline-none"
            >
              <option value="ALL">All Lab Workspaces ({labs.length})</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600">User Account</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-950 focus:outline-none"
            >
              <option value="ALL">All Users ({users.length})</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ? `${u.name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-950 focus:outline-none"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-950 focus:outline-none"
            />
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600">Search Keywords</label>
            <input
              type="text"
              placeholder="Search user, instrument..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-950 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("labs")}
          className={`border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
            activeTab === "labs" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          All Lab Workspaces ({filteredLabs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bookings")}
          className={`border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
            activeTab === "bookings" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Master Bookings ({filteredBookings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notebooks")}
          className={`border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
            activeTab === "notebooks" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Master Lab Notebooks ({filteredNotebooks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("activities")}
          className={`border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
            activeTab === "activities" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Global Activity Logs ({filteredActivities.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">{error}</div>
      ) : (
        <div>
          {/* TAB 1: ALL LAB WORKSPACES */}
          {activeTab === "labs" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Lab Workspace</th>
                      <th className="px-6 py-3.5 font-semibold">Owner</th>
                      <th className="px-6 py-3.5 text-center font-semibold">Members</th>
                      <th className="px-6 py-3.5 text-center font-semibold">Instruments</th>
                      <th className="px-6 py-3.5 text-center font-semibold">Created Date</th>
                      <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredLabs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          No lab workspaces found.
                        </td>
                      </tr>
                    ) : (
                      filteredLabs.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/80">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{l.name}</p>
                            {l.description && <p className="text-[11px] text-slate-500 line-clamp-1">{l.description}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900">{l.owner.name}</p>
                            <p className="text-[11px] text-slate-500">{l.owner.email}</p>
                          </td>
                          <td className="px-6 py-4 text-center font-semibold text-slate-900">{l.membersCount}</td>
                          <td className="px-6 py-4 text-center font-semibold text-slate-900">{l.instrumentsCount}</td>
                          <td className="px-6 py-4 text-center text-slate-500">
                            {new Date(l.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteLab(l.id, l.name)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Delete Lab
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: MASTER BOOKINGS */}
          {activeTab === "bookings" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Date & Time</th>
                      <th className="px-6 py-3.5 font-semibold">Instrument</th>
                      <th className="px-6 py-3.5 font-semibold">Lab Workspace</th>
                      <th className="px-6 py-3.5 font-semibold">User</th>
                      <th className="px-6 py-3.5 text-center font-semibold">Status</th>
                      <th className="px-6 py-3.5 font-semibold">Remarks</th>
                      <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          No booking records found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{b.date}</p>
                            <p className="text-[11px] text-slate-500">{b.startTime} - {b.endTime}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{b.instrumentName}</p>
                            <p className="text-[11px] text-slate-400">{b.instrumentCode}</p>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-700">{b.labName}</td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{b.userName}</p>
                            <p className="text-[11px] text-slate-500">{b.userEmail}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                b.status === "CONFIRMED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{b.remarks}</td>
                          <td className="px-6 py-4 text-right">
                            {b.status === "CONFIRMED" && (
                              <button
                                type="button"
                                onClick={() => handleCancelBooking(b.id)}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MASTER LAB NOTEBOOKS */}
          {activeTab === "notebooks" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNotebooks.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-slate-200 bg-white py-16 text-center text-xs text-slate-400">
                  No lab notebook entries found matching current filters.
                </div>
              ) : (
                filteredNotebooks.map((n) => (
                  <div key={n.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-950">{n.date}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {n.labName}
                        </span>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-bold text-slate-900">{n.userName}</p>
                        <p className="text-[11px] text-slate-500">{n.userEmail}</p>
                      </div>
                      <p className="mt-3 text-xs text-slate-700 line-clamp-4 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
                        {n.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedNotebook(n)}
                      className="mt-4 w-full rounded-xl border border-slate-200 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      View Full Entry
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: GLOBAL AUDIT & ACTIVITIES */}
          {activeTab === "activities" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Timestamp</th>
                      <th className="px-6 py-3.5 font-semibold">User</th>
                      <th className="px-6 py-3.5 font-semibold">Action</th>
                      <th className="px-6 py-3.5 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredActivities.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                          No audit activity logs found.
                        </td>
                      </tr>
                    ) : (
                      filteredActivities.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/80">
                          <td className="whitespace-nowrap px-6 py-3.5 text-slate-500">
                            {new Date(a.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">{a.userName}</td>
                          <td className="px-6 py-4">
                            <span className="inline-block rounded-md bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-white">
                              {a.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-700">{a.details}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULL NOTEBOOK ENTRY MODAL */}
      {selectedNotebook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Lab Notebook Entry</h3>
                <p className="text-xs text-slate-500">
                  {selectedNotebook.date} • {selectedNotebook.userName} ({selectedNotebook.userEmail}) • {selectedNotebook.labName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotebook(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl bg-slate-50 p-4 text-xs text-slate-800 font-mono whitespace-pre-wrap border border-slate-200">
              {selectedNotebook.content}
            </div>
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setSelectedNotebook(null)}
                className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


