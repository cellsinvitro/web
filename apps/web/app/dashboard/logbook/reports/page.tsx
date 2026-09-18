"use client";

import { useEffect, useState } from "react";
import LogbookHeader from "@/components/logbook/LogbookHeader";
import {
  fetchLogbookReport,
  fetchLogbookInstruments,
  type LogbookReportRow,
  type LogbookInstrument,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLabWorkspace } from "@/context/LabWorkspaceContext";
import { isAdmin as checkIsAdmin } from "@/lib/admin";

export default function LogbookReportsPage() {
  const { user } = useAuth();
  const { activeLab } = useLabWorkspace();
  const isAdminUser = checkIsAdmin(user?.role);

  const getTodayString = () => new Date().toISOString().split("T")[0] || "";
  const getThirtyDaysAgoString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0] || "";
  };

  const [instruments, setInstruments] = useState<LogbookInstrument[]>([]);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState<string>(getThirtyDaysAgoString());
  const [toDate, setToDate] = useState<string>(getTodayString());

  const [rows, setRows] = useState<LogbookReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeLab) return;
    fetchLogbookInstruments(activeLab.id)
      .then((res) => setInstruments(res.instruments))
      .catch(() => {});
  }, [activeLab?.id]);

  const loadReport = async () => {
    if (!activeLab) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchLogbookReport({
        instrumentId: selectedInstrumentId,
        fromDate,
        toDate,
        labId: activeLab.id,
      });
      setRows(res.reportRows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate report";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedInstrumentId, fromDate, toDate, activeLab?.id]);

  const handleDownloadCSV = () => {
    if (rows.length === 0) {
      alert("No report data available to export");
      return;
    }

    const headers = ["Date", "Instrument Name", "Instrument Code", "User", "Start Time", "End Time", "Duration", "Remarks"];
    const csvLines = [headers.join(",")];

    for (const r of rows) {
      const line = [
        `"${r.date}"`,
        `"${r.instrumentName.replace(/"/g, '""')}"`,
        `"${r.instrumentCode.replace(/"/g, '""')}"`,
        `"${r.user.replace(/"/g, '""')}"`,
        `"${r.startTime}"`,
        `"${r.endTime}"`,
        `"${r.durationHours}"`,
        `"${r.remarks.replace(/"/g, '""')}"`,
      ].join(",");
      csvLines.push(line);
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvLines.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `logbook_report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <LogbookHeader
        title="Logbook Reports"
        subtitle="Generate monthly and custom date-range usage reports for laboratory audit"
        canGenerateReports={true}
        isAdmin={isAdminUser}
      />

      {/* Filter Bar */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          Report Filters
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Instrument</label>
            <select
              value={selectedInstrumentId}
              onChange={(e) => setSelectedInstrumentId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              <option value="ALL">All Instruments</option>
              {instruments.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs font-medium text-slate-500">
            Total Records Found: <strong className="text-slate-900">{rows.length}</strong>
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <svg className="h-4 w-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download CSV
            </button>

            <button
              type="button"
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231a1.125 1.125 0 0 1-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M3 9.456c0-1.081.768-2.015 1.837-2.175a48.049 48.049 0 0 1 1.913-.247m0 0a48.1 48.1 0 0 1 10.5 0m-10.5 0V3.375c0-.621.504-1.125 1.125-1.125h8.25c.621 0 1.125.504 1.125 1.125V7.036" />
              </svg>
              Print / PDF Report
            </button>
          </div>
        </div>
      </div>

      {/* Printable Report Content */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">Lab Logbook Usage Report</h2>
          <p className="text-xs text-slate-500">
            Period: {fromDate} to {toDate}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
          </div>
        ) : error ? (
          <div className="p-6 text-xs text-rose-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No booking records found for the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Instrument</th>
                  <th className="px-6 py-3 font-semibold">User</th>
                  <th className="px-6 py-3 font-semibold">Start</th>
                  <th className="px-6 py-3 font-semibold">End</th>
                  <th className="px-6 py-3 font-semibold">Duration</th>
                  <th className="px-6 py-3 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-6 py-3.5 font-medium">{row.date}</td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <span className="font-bold text-slate-900">{row.instrumentName}</span>{" "}
                      <span className="text-slate-400">({row.instrumentCode})</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 font-semibold text-slate-900">{row.user}</td>
                    <td className="whitespace-nowrap px-6 py-3.5">{row.startTime}</td>
                    <td className="whitespace-nowrap px-6 py-3.5">{row.endTime}</td>
                    <td className="whitespace-nowrap px-6 py-3.5 font-semibold">{row.durationHours}</td>
                    <td className="px-6 py-3.5 text-slate-600">{row.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
