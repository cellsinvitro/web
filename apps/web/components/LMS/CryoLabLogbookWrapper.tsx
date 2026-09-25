"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import LogbookHeader from "@/components/logbook/LogbookHeader";
import NotebookEditor from "@/components/logbook/NotebookEditor";
import NotebookCalendar from "@/components/logbook/NotebookCalendar";
import NotebookTaskPanel from "@/components/logbook/NotebookTaskPanel";
import NotebookActivityLogPanel from "@/components/logbook/NotebookActivityLog";
import AdminNotebookView from "@/components/logbook/AdminNotebookView";

import { useSearchParams } from "next/navigation";
import {
  fetchLogbookInstruments,
  fetchLogbookInstrument,
  createLogbookInstrument,
  updateLogbookInstrument,
  fetchLogbookBookings,
  createLogbookBooking,
  updateLogbookBooking,
  cancelLogbookBooking,
  fetchLabNotebookEntry,
  saveLabNotebookEntry,
  fetchNotebookHistory,
  uploadNotebookImage,
  fetchLogbookReport,
  fetchLogbookActivities,
  fetchLabTeam,
  sendLabInvite,
  cancelLabInvite,
  acceptLabInvite,
  updateLabMemberPermission,
  type LogbookInstrument,
  type LogbookBooking,
  type LogbookPermission,
  type InstrumentStatus,
  type LabNotebookEntry,
  type NotebookBlock,
  type NotebookHistoryItem,
  type LogbookReportRow,
  type LogbookActivity,
  type LabTeamMember,
  type LabInviteItem,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLabWorkspace, LabWorkspaceProvider } from "@/context/LabWorkspaceContext";
import { isAdmin as checkIsAdmin } from "@/lib/admin";

// Helpers for Notebook
function getTodayString() {
  return new Date().toISOString().split("T")[0] ?? "";
}

function getThirtyDaysAgoString() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0] ?? "";
}

function blocksToPlainText(blocks: NotebookBlock[]): string {
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => {
      const div = typeof document !== "undefined" ? document.createElement("div") : null;
      if (div) {
        div.innerHTML = (b as { content: string }).content;
        return div.innerText;
      }
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

export default function CryoLabLogbookWrapper() {
  return (
    <LabWorkspaceProvider>
      <CryoLabLogbookContent />
    </LabWorkspaceProvider>
  );
}

function CryoLabLogbookContent() {
  const { user } = useAuth();
  const { activeLab, refreshLabs, setActiveLabId } = useLabWorkspace();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("inviteToken") || searchParams.get("labInvite") || searchParams.get("token");
  const isAdminUser = checkIsAdmin(user?.role);

  const [subTab, setSubTab] = useState<"instruments" | "notebook" | "reports" | "activity" | "team">("instruments");
  const [labInviteBanner, setLabInviteBanner] = useState<{ status: "idle" | "accepting" | "success" | "error"; msg?: string }>({ status: "idle" });

  useEffect(() => {
    if (!inviteToken) return;
    let active = true;
    async function handleAccept() {
      try {
        setLabInviteBanner({ status: "accepting", msg: "Joining lab workspace..." });
        const res = await acceptLabInvite(inviteToken!);
        await refreshLabs();
        setActiveLabId(res.labId);
        if (active) {
          setLabInviteBanner({ status: "success", msg: `Successfully joined ${res.labName}!` });
          const url = new URL(window.location.href);
          url.searchParams.delete("inviteToken");
          url.searchParams.delete("labInvite");
          url.searchParams.delete("token");
          window.history.replaceState({}, "", url.toString());
        }
      } catch (err: unknown) {
        if (active) {
          setLabInviteBanner({ status: "error", msg: err instanceof Error ? err.message : "Failed to accept lab invite" });
        }
      }
    }
    handleAccept();
    return () => { active = false; };
  }, [inviteToken, refreshLabs, setActiveLabId]);

  // Shared permissions
  const [permissions, setPermissions] = useState<LogbookPermission>({
    canViewLogbook: true,
    canCreateEntries: true,
    canEditOwnEntries: true,
    canEditOthersEntries: isAdminUser,
    canManageInstruments: isAdminUser,
    canGenerateReports: isAdminUser,
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. INSTRUMENTS STATE & LOGIC
  // ───────────────────────────────────────────────────────────────────────────
  const [instruments, setInstruments] = useState<LogbookInstrument[]>([]);
  const [instLoading, setInstLoading] = useState(true);
  const [instError, setInstError] = useState<string | null>(null);

  // Selected Instrument Detail view inside CryoSearch
  const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
  const [selectedInst, setSelectedInst] = useState<LogbookInstrument | null>(null);
  const [instBookings, setInstBookings] = useState<LogbookBooking[]>([]);
  const [instDetailLoading, setInstDetailLoading] = useState(false);
  const [instDetailError, setInstDetailError] = useState<string | null>(null);
  const [selectedInstDate, setSelectedInstDate] = useState<string>(getTodayString());
  const [viewMode, setViewMode] = useState<"DAY" | "WEEK" | "MONTH">("DAY");

  // Instrument Modals state
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

  // Slot Booking & Service Modals
  const [showSlotBookingModal, setShowSlotBookingModal] = useState(false);
  const [showBookingDetailModal, setShowBookingDetailModal] = useState(false);
  const [showServiceEditModal, setShowServiceEditModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<LogbookBooking | null>(null);

  const [bookingStartTime, setBookingStartTime] = useState("09:00");
  const [bookingEndTime, setBookingEndTime] = useState("10:00");
  const [bookingRemarks, setBookingRemarks] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Service Edit fields
  const [editServiceDate, setEditServiceDate] = useState("");
  const [editCleaningDate, setEditCleaningDate] = useState("");
  const [editNextServiceDate, setEditNextServiceDate] = useState("");
  const [editStatus, setEditStatus] = useState<InstrumentStatus>("ACTIVE");

  const loadInstruments = async () => {
    if (!activeLab) return;
    try {
      setInstLoading(true);
      setInstError(null);
      const res = await fetchLogbookInstruments(activeLab.id);
      setInstruments(res.instruments);
      if (res.permissions) setPermissions(res.permissions);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load instruments";
      setInstError(msg);
    } finally {
      setInstLoading(false);
    }
  };

  const loadSelectedInstrumentDetails = async () => {
    if (!selectedInstId) return;
    try {
      setInstDetailLoading(true);
      setInstDetailError(null);
      const [instRes, bookingsRes] = await Promise.all([
        fetchLogbookInstrument(selectedInstId),
        fetchLogbookBookings({ instrumentId: selectedInstId, date: selectedInstDate }),
      ]);
      setSelectedInst(instRes.instrument);
      setInstBookings(bookingsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load instrument details";
      setInstDetailError(msg);
    } finally {
      setInstDetailLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === "instruments" && !selectedInstId) {
      loadInstruments();
    }
  }, [activeLab?.id, subTab, selectedInstId]);

  useEffect(() => {
    if (subTab === "instruments" && selectedInstId) {
      loadSelectedInstrumentDetails();
    }
  }, [selectedInstId, selectedInstDate, subTab]);

  const handleAddInstrument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setModalError("Instrument Name and Code are required");
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);
      await createLogbookInstrument(
        {
          code: code.trim(),
          name: name.trim(),
          inchargeName: inchargeName.trim() || null,
          inchargeContact: inchargeContact.trim() || null,
          installedOn: installedOn || null,
          lastServiceDate: lastServiceDate || null,
          nextServiceDate: nextServiceDate || null,
          description: description.trim() || null,
          status,
        },
        activeLab?.id
      );

      setShowAddModal(false);
      setCode("");
      setName("");
      setInchargeName("");
      setInchargeContact("");
      setInstalledOn("");
      setLastServiceDate("");
      setNextServiceDate("");
      setDescription("");
      setStatus("ACTIVE");

      await loadInstruments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create instrument";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSlotBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstId || !bookingStartTime || !bookingEndTime) return;
    try {
      setBookingSubmitting(true);
      await createLogbookBooking({
        instrumentId: selectedInstId,
        date: selectedInstDate,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        remarks: bookingRemarks.trim() || undefined,
      });
      setShowSlotBookingModal(false);
      setBookingRemarks("");
      await loadSelectedInstrumentDetails();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to book slot");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await cancelLogbookBooking(bookingId);
      setShowBookingDetailModal(false);
      setSelectedBooking(null);
      await loadSelectedInstrumentDetails();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel booking");
    }
  };

  const handleSaveServiceInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstId) return;
    try {
      setSubmitting(true);
      await updateLogbookInstrument(selectedInstId, {
        lastServiceDate: editServiceDate || null,
        lastCleaningDate: editCleaningDate || null,
        nextServiceDate: editNextServiceDate || null,
        status: editStatus,
      });
      setShowServiceEditModal(false);
      await loadSelectedInstrumentDetails();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update service info");
    } finally {
      setSubmitting(false);
    }
  };

  const openSlotBooking = (slotTime: string) => {
    if (selectedInst?.status !== "ACTIVE") {
      alert(`Instrument is currently ${selectedInst?.status.replace("_", " ").toLowerCase()}. Bookings are disabled.`);
      return;
    }
    setBookingStartTime(slotTime);
    const parts = slotTime.split(":");
    const h = Number(parts[0] ?? 0);
    const m = Number(parts[1] ?? 0);
    const endH = String((h + 1) % 24).padStart(2, "0");
    setBookingEndTime(`${endH}:${String(m).padStart(2, "0")}`);
    setBookingRemarks("");
    setShowSlotBookingModal(true);
  };

  const openServiceEditModal = () => {
    if (!selectedInst) return;
    setEditServiceDate(selectedInst.lastServiceDate ? selectedInst.lastServiceDate.split("T")[0] || "" : "");
    setEditCleaningDate(selectedInst.lastCleaningDate ? selectedInst.lastCleaningDate.split("T")[0] || "" : "");
    setEditNextServiceDate(selectedInst.nextServiceDate ? selectedInst.nextServiceDate.split("T")[0] || "" : "");
    setEditStatus(selectedInst.status);
    setShowServiceEditModal(true);
  };

  const bookingsMap = useMemo(() => {
    const map = new Map<string, LogbookBooking>();
    for (const b of instBookings) {
      if (b.status === "CONFIRMED") {
        map.set(b.startTime, b);
      }
    }
    return map;
  }, [instBookings]);

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

  // ───────────────────────────────────────────────────────────────────────────
  // 2. LAB NOTEBOOK STATE & LOGIC
  // ───────────────────────────────────────────────────────────────────────────
  type NotebookTab = "editor" | "tasks" | "activity" | "admin";
  const [notebookSubTab, setNotebookSubTab] = useState<NotebookTab>("editor");
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [blocks, setBlocks] = useState<NotebookBlock[]>([]);
  const [entry, setEntry] = useState<LabNotebookEntry | null>(null);
  const [entryTime, setEntryTime] = useState("");
  const [summary, setSummary] = useState("");
  const [history, setHistory] = useState<NotebookHistoryItem[]>([]);
  const [notebookLoading, setNotebookLoading] = useState(false);
  const [notebookSaving, setNotebookSaving] = useState(false);
  const [notebookSavedMsg, setNotebookSavedMsg] = useState<string | null>(null);
  const [notebookError, setNotebookError] = useState<string | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirty = useRef(false);

  const loadNotebookEntry = useCallback(async (dateStr: string) => {
    if (!activeLab) return;
    try {
      setNotebookLoading(true);
      setNotebookError(null);
      setNotebookSavedMsg(null);
      const res = await fetchLabNotebookEntry(dateStr, activeLab.id);
      setEntry(res.entry);
      setBlocks(entryToBlocks(res.entry));
      setEntryTime(res.entry?.entryTime ?? "");
      setSummary(res.entry?.summary ?? "");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load notebook entry";
      setNotebookError(msg);
    } finally {
      setNotebookLoading(false);
    }
  }, [activeLab]);

  const loadNotebookHistory = useCallback(async () => {
    if (!activeLab) return;
    try {
      const h = await fetchNotebookHistory(activeLab.id);
      setHistory(h);
    } catch { /* ignore */ }
  }, [activeLab]);

  useEffect(() => {
    if (subTab === "notebook") {
      loadNotebookEntry(selectedDate);
    }
  }, [selectedDate, activeLab?.id, subTab, loadNotebookEntry]);

  useEffect(() => {
    if (subTab === "notebook") {
      loadNotebookHistory();
    }
  }, [activeLab?.id, subTab, loadNotebookHistory]);

  const doSaveNotebook = useCallback(
    async (currentBlocks: NotebookBlock[], time: string, sum: string) => {
      if (!activeLab) return;
      try {
        setNotebookSaving(true);
        setNotebookError(null);
        const plainText = blocksToPlainText(currentBlocks);
        const updated = await saveLabNotebookEntry(
          plainText,
          selectedDate,
          activeLab.id,
          currentBlocks,
          time || null,
          sum || null
        );
        setEntry(updated);
        setNotebookSavedMsg("Saved ✓");
        setTimeout(() => setNotebookSavedMsg(null), 2500);
        isDirty.current = false;
        await loadNotebookHistory();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to save notebook entry";
        setNotebookError(msg);
      } finally {
        setNotebookSaving(false);
      }
    },
    [activeLab, selectedDate, loadNotebookHistory]
  );

  const handleBlocksChange = (next: NotebookBlock[]) => {
    setBlocks(next);
    isDirty.current = true;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (isDirty.current) doSaveNotebook(next, entryTime, summary);
    }, 5000);
  };

  const handleImageUpload = async (file: File) => {
    return uploadNotebookImage(file, activeLab?.id);
  };

  const handleSaveTimeDetails = async (dateStr: string, time: string, sum: string) => {
    if (dateStr === selectedDate) {
      setEntryTime(time);
      setSummary(sum);
      await doSaveNotebook(blocks, time, sum);
    } else {
      const res = await fetchLabNotebookEntry(dateStr, activeLab?.id);
      const existingBlocks = entryToBlocks(res.entry);
      if (!activeLab) return;
      const plainText = blocksToPlainText(existingBlocks);
      await saveLabNotebookEntry(plainText, dateStr, activeLab.id, existingBlocks, time || null, sum || null);
      await loadNotebookHistory();
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 3. REPORTS STATE & LOGIC
  // ───────────────────────────────────────────────────────────────────────────
  const [repInstrumentId, setRepInstrumentId] = useState<string>("ALL");
  const [repFromDate, setRepFromDate] = useState<string>(getThirtyDaysAgoString());
  const [repToDate, setRepToDate] = useState<string>(getTodayString());
  const [repRows, setRepRows] = useState<LogbookReportRow[]>([]);
  const [repLoading, setRepLoading] = useState(false);
  const [repError, setRepError] = useState<string | null>(null);

  const loadReport = async () => {
    if (!activeLab) return;
    try {
      setRepLoading(true);
      setRepError(null);
      const res = await fetchLogbookReport({
        instrumentId: repInstrumentId,
        fromDate: repFromDate,
        toDate: repToDate,
        labId: activeLab.id,
      });
      setRepRows(res.reportRows || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate report";
      setRepError(msg);
    } finally {
      setRepLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === "reports") {
      loadReport();
    }
  }, [subTab, repInstrumentId, repFromDate, repToDate, activeLab?.id]);

  const handleDownloadCSV = () => {
    if (repRows.length === 0) {
      alert("No report data available to export");
      return;
    }
    const headers = ["Date", "Instrument Name", "Instrument Code", "User", "Start Time", "End Time", "Duration", "Remarks"];
    const csvLines = [headers.join(",")];
    for (const r of repRows) {
      const line = [
        `"${r.date}"`,
        `"${r.instrumentName.replace(/"/g, '""')}"`,
        `"${r.instrumentCode.replace(/"/g, '""')}"`,
        `"${r.user.replace(/"/g, '""')}"`,
        `"${r.startTime}"`,
        `"${r.endTime}"`,
        `"${r.durationHours}"`,
        `"${(r.remarks || "").replace(/"/g, '""')}"`,
      ].join(",");
      csvLines.push(line);
    }
    const csvContent = "data:text/csv;charset=utf-8," + csvLines.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `logbook_report_${repFromDate}_to_${repToDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 4. ACTIVITY LOG STATE & LOGIC
  // ───────────────────────────────────────────────────────────────────────────
  const [actInstrumentId, setActInstrumentId] = useState<string>("ALL");
  const [activities, setActivities] = useState<LogbookActivity[]>([]);
  const [actLoading, setActLoading] = useState(false);
  const [actError, setActError] = useState<string | null>(null);

  const loadActivities = async () => {
    if (!activeLab) return;
    try {
      setActLoading(true);
      setActError(null);
      const res = await fetchLogbookActivities(
        actInstrumentId === "ALL" ? undefined : actInstrumentId,
        activeLab.id
      );
      setActivities(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load logbook activity history";
      setActError(msg);
    } finally {
      setActLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === "activity") {
      loadActivities();
    }
  }, [subTab, actInstrumentId, activeLab?.id]);

  const getActionBadge = (action: string) => {
    if (action.includes("CREATED") || action.includes("ADDED")) {
      return (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
          {action.replace("_", " ")}
        </span>
      );
    }
    if (action.includes("CANCELLED") || action.includes("ARCHIVED")) {
      return (
        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-600/20">
          {action.replace("_", " ")}
        </span>
      );
    }
    return (
      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-600/20">
        {action.replace("_", " ")}
      </span>
    );
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 5. TEAM & PERMISSIONS STATE & LOGIC
  // ───────────────────────────────────────────────────────────────────────────
  const [teamSubTab, setTeamSubTab] = useState<"members" | "invites">("members");
  const [teamMembers, setTeamMembers] = useState<LabTeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<LabInviteItem[]>([]);
  const [isWorkspaceOwner, setIsWorkspaceOwner] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Invite modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteErrorMsg, setInviteErrorMsg] = useState<string | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadTeam = async () => {
    if (!activeLab) return;
    try {
      setTeamLoading(true);
      setTeamError(null);
      const res = await fetchLabTeam(activeLab.id);
      setTeamMembers(res.members);
      setPendingInvites(res.pendingInvites || []);
      setIsWorkspaceOwner(res.isOwner || isAdminUser);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load team members";
      setTeamError(msg);
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === "team" || (subTab === "notebook" && notebookSubTab === "admin")) {
      loadTeam();
    }
  }, [subTab, notebookSubTab, activeLab?.id]);

  const handleTogglePermission = async (
    userId: string,
    key: keyof LogbookPermission,
    currentVal: boolean
  ) => {
    if (!activeLab || (!isWorkspaceOwner && !isAdminUser)) return;
    setTeamMembers((prev) =>
      prev.map((m) =>
        m.id === userId || m.memberId === userId
          ? { ...m, permissions: { ...m.permissions, [key]: !currentVal } }
          : m
      )
    );
    try {
      await updateLabMemberPermission(activeLab.id, userId, { [key]: !currentVal });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update permission");
      await loadTeam();
    }
  };

  const handleSendInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLab || !inviteEmail.trim()) return;
    try {
      setInviting(true);
      setInviteErrorMsg(null);
      setLastInviteLink(null);
      const res = await sendLabInvite(activeLab.id, inviteEmail.trim());
      const link = `${window.location.origin}/cyrosearch?tab=logbook&inviteToken=${res.invite.token}`;
      setLastInviteLink(link);
      setInviteEmail("");
      await loadTeam();
    } catch (err: unknown) {
      setInviteErrorMsg(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!activeLab || !confirm("Are you sure you want to cancel this invitation?")) return;
    try {
      await cancelLabInvite(activeLab.id, inviteId);
      await loadTeam();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel invitation");
    }
  };

  const copyToClipboard = (token: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const todayDisplayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {labInviteBanner.status !== "idle" && (
        <div className={`mb-4 flex items-center justify-between rounded-2xl border p-4 text-xs font-semibold ${
          labInviteBanner.status === "accepting"
            ? "border-blue-200 bg-blue-50 text-blue-800"
            : labInviteBanner.status === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-rose-200 bg-rose-50 text-rose-800"
        }`}>
          <span>{labInviteBanner.msg}</span>
          <button
            type="button"
            onClick={() => setLabInviteBanner({ status: "idle" })}
            className="rounded-lg p-1 hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── LOGBOOK HEADER ── */}
      <LogbookHeader
        canManageInstruments={permissions.canManageInstruments}
        canGenerateReports={permissions.canGenerateReports}
        isAdmin={isAdminUser}
        onAddInstrument={() => setShowAddModal(true)}
        activeSubTab={subTab}
        onSubTabChange={(key) => {
          setSelectedInstId(null);
          setSubTab(key as typeof subTab);
        }}
      />

      {/* ===================================================================== */}
      {/* SUB-TAB 1: INSTRUMENTS */}
      {/* ===================================================================== */}
      {subTab === "instruments" && (
        <div className="mt-6 space-y-6">
          {selectedInstId ? (
            /* Inline Instrument Detail View */
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setSelectedInstId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                ← Back to All Instruments
              </button>

              {instDetailLoading && !selectedInst ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
                </div>
              ) : instDetailError || !selectedInst ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                  {instDetailError || "Instrument not found"}
                </div>
              ) : (
                <>
                  {/* Instrument Header */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            {selectedInst.code}
                          </span>
                          <h2 className="text-2xl font-bold text-slate-950">{selectedInst.name}</h2>
                          {getStatusBadge(selectedInst.status)}
                        </div>
                        {selectedInst.description && (
                          <p className="mt-2 text-xs text-slate-600">{selectedInst.description}</p>
                        )}
                      </div>

                      {(isAdminUser || permissions.canManageInstruments) && (
                        <button
                          type="button"
                          onClick={openServiceEditModal}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                        >
                          <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0m-9.75 0h9.75" />
                          </svg>
                          Edit Maintenance Details
                        </button>
                      )}
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4 text-xs">
                      <div>
                        <span className="text-slate-400">In-Charge</span>
                        <p className="font-semibold text-slate-900">{selectedInst.inchargeName || "Unassigned"}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Contact</span>
                        <p className="font-semibold text-slate-900">{selectedInst.inchargeContact || "—"}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Last Serviced</span>
                        <p className="font-semibold text-slate-900">{selectedInst.lastServiceDate || "—"}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Next Service Due</span>
                        <p className={`font-semibold ${selectedInst.isServiceDueSoon ? "text-amber-600 font-bold" : "text-slate-900"}`}>
                          {selectedInst.nextServiceDate || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Controls */}
                  <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(selectedInstDate);
                          d.setDate(d.getDate() - 1);
                          setSelectedInstDate(d.toISOString().split("T")[0] || selectedInstDate);
                        }}
                        className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedInstDate(getTodayString())}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(selectedInstDate);
                          d.setDate(d.getDate() + 1);
                          setSelectedInstDate(d.toISOString().split("T")[0] || selectedInstDate);
                        }}
                        className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      >
                        ›
                      </button>
                      <input
                        type="date"
                        value={selectedInstDate}
                        onChange={(e) => setSelectedInstDate(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1 bg-slate-50">
                      {(["DAY", "WEEK", "MONTH"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setViewMode(mode)}
                          className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                            viewMode === mode ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slots Grid */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="border-b border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        Daily Booking Slots ({selectedInstDate})
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Click any free time slot to reserve equipment
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                      {TIME_SLOTS.map((slot) => {
                        const booking = bookingsMap.get(slot);
                        const isBooked = !!booking;
                        return (
                          <div
                            key={slot}
                            className={`flex items-center justify-between px-6 py-3 text-xs transition-colors ${
                              isBooked ? "bg-amber-50/50" : "hover:bg-slate-50 cursor-pointer"
                            }`}
                            onClick={() => {
                              if (isBooked) {
                                setSelectedBooking(booking);
                                setShowBookingDetailModal(true);
                              } else {
                                openSlotBooking(slot);
                              }
                            }}
                          >
                            <span className="font-mono font-bold text-slate-700 w-20">{formatTo12Hr(slot)}</span>
                            {isBooked ? (
                              <div className="flex flex-1 items-center justify-between pl-4">
                                <div>
                                  <span className="font-bold text-slate-900">{booking.userName || "Booked"}</span>
                                  {booking.remarks && (
                                    <span className="ml-2 text-slate-500">({booking.remarks})</span>
                                  )}
                                </div>
                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  Booked ({booking.startTime} - {booking.endTime})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">Available — Click to Book</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* List of Instruments */
            <>
              {/* Stats & Date Bar */}
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Today&apos;s Date
                  </span>
                  <p className="text-lg font-bold text-slate-900">{todayDisplayDate}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center sm:text-right">
                    <span className="text-xs font-medium text-slate-500">Total Instruments</span>
                    <p className="text-xl font-bold text-slate-900">{instruments.length}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center sm:text-right">
                    <span className="text-xs font-medium text-slate-500">Today&apos;s Bookings</span>
                    <p className="text-xl font-bold text-slate-900">
                      {instruments.reduce((acc, curr) => acc + (curr.todayBookingsCount || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>

              {instLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
                </div>
              ) : instError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {instError}
                </div>
              ) : instruments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">No Instruments Found</h3>
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
                  {instruments.map((inst) => (
                    <div key={inst.id} className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:shadow-md">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                              {inst.code}
                            </span>
                            <h2 className="mt-2 text-xl font-bold text-slate-900">{inst.name}</h2>
                          </div>
                          {getStatusBadge(inst.status)}
                        </div>

                        {inst.description && (
                          <p className="mt-2.5 line-clamp-2 text-xs text-slate-600">{inst.description}</p>
                        )}

                        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-400">In-Charge:</span>
                            <span className="font-semibold text-slate-800">{inst.inchargeName || "Not assigned"}</span>
                          </div>
                          {inst.nextServiceDate && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Next Service:</span>
                              <span className={`font-semibold ${inst.isServiceDueSoon ? "text-amber-600 font-bold" : "text-slate-800"}`}>
                                {inst.nextServiceDate}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => setSelectedInstId(inst.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-900 hover:text-white"
                        >
                          View Instrument Logbook & Bookings →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: LAB NOTEBOOK */}
      {/* ===================================================================== */}
      {subTab === "notebook" && (
        <div className="mt-6 space-y-6">
          {/* Sub-navigation bar inside Notebook */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setNotebookSubTab("editor")}
              className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                notebookSubTab === "editor" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Lab Notebook
            </button>
            <button
              type="button"
              onClick={() => setNotebookSubTab("tasks")}
              className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                notebookSubTab === "tasks" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Tasks & Action Items
            </button>
            <button
              type="button"
              onClick={() => setNotebookSubTab("activity")}
              className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                notebookSubTab === "activity" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Notebook Activity
            </button>
            {(isAdminUser || isWorkspaceOwner) && (
              <button
                type="button"
                onClick={() => setNotebookSubTab("admin")}
                className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                  notebookSubTab === "admin" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                Admin View — Team Notebooks
              </button>
            )}
          </div>

          {notebookSubTab === "editor" && (
            <div className="space-y-6">
              {/* Date & Details header */}
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedDate(getTodayString())}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Today
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Entry Time</span>
                    <input
                      type="text"
                      placeholder="e.g. 09:30 AM"
                      value={entryTime}
                      onChange={(e) => {
                        setEntryTime(e.target.value);
                        isDirty.current = true;
                      }}
                      className="mt-0.5 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Summary / Title</span>
                    <input
                      type="text"
                      placeholder="e.g. Cell Thawing & Media Prep"
                      value={summary}
                      onChange={(e) => {
                        setSummary(e.target.value);
                        isDirty.current = true;
                      }}
                      className="mt-0.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {notebookSavedMsg && <span className="text-xs font-semibold text-emerald-600">{notebookSavedMsg}</span>}
                  <button
                    type="button"
                    onClick={() => doSaveNotebook(blocks, entryTime, summary)}
                    disabled={notebookSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
                  >
                    {notebookSaving ? "Saving Entry…" : "Save Entry"}
                  </button>
                </div>
              </div>

              {notebookLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                  {/* Rich Block Editor */}
                  <div className="lg:col-span-3">
                    <NotebookEditor
                      blocks={blocks}
                      onChange={handleBlocksChange}
                      onImageUpload={handleImageUpload}
                      authorName={entry?.userName || user?.name || "Researcher"}
                      dateLabel={selectedDate}
                    />
                  </div>

                  {/* Calendar Sidebar */}
                  <div>
                    <NotebookCalendar
                      history={history}
                      selectedDate={selectedDate}
                      onSelectDate={(d) => setSelectedDate(d)}
                      onSaveTimeDetails={handleSaveTimeDetails}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {notebookSubTab === "tasks" && (
            <NotebookTaskPanel
              labId={activeLab?.id}
              isAdmin={isAdminUser || isWorkspaceOwner}
              currentUserId={user?.id || ""}
              labUsers={teamMembers.map((m) => ({ id: m.id || m.memberId, name: m.name, email: m.email }))}
            />
          )}

          {notebookSubTab === "activity" && (
            <NotebookActivityLogPanel labId={activeLab?.id} />
          )}

          {notebookSubTab === "admin" && (
            <AdminNotebookView
              users={teamMembers.map((m) => ({ id: m.id || m.memberId, name: m.name, email: m.email }))}
              labId={activeLab?.id}
            />
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 3: REPORTS */}
      {/* ===================================================================== */}
      {subTab === "reports" && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-end sm:justify-between">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-500">Instrument</label>
                <select
                  value={repInstrumentId}
                  onChange={(e) => setRepInstrumentId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none"
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
                <label className="block text-xs font-semibold text-slate-500">From Date</label>
                <input
                  type="date"
                  value={repFromDate}
                  onChange={(e) => setRepFromDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500">To Date</label>
                <input
                  type="date"
                  value={repToDate}
                  onChange={(e) => setRepToDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
              >
                Print / PDF Report
              </button>
            </div>
          </div>

          {repLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            </div>
          ) : repRows.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
              No booking or usage records found for the selected filter range.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Instrument</th>
                    <th className="px-4 py-3">Booked By</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Time Slot</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repRows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {row.instrumentName} ({row.instrumentCode})
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.user}</td>
                      <td className="px-4 py-3 text-slate-600">{row.date}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{row.startTime} - {row.endTime}</td>
                      <td className="px-4 py-3 text-slate-600">{row.durationHours} hrs</td>
                      <td className="px-4 py-3 text-slate-500">{row.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 4: ACTIVITY LOG */}
      {/* ===================================================================== */}
      {subTab === "activity" && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">Filter Instrument:</label>
              <select
                value={actInstrumentId}
                onChange={(e) => setActInstrumentId(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="ALL">All Instruments</option>
                {instruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.code})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-medium text-slate-500">
              Total Activity Records: <strong className="text-slate-900">{activities.length}</strong>
            </span>
          </div>

          {actLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            </div>
          ) : activities.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
              No audit log activity recorded yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="divide-y divide-slate-100">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-4 p-4 hover:bg-slate-50/80">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getActionBadge(act.action)}
                        <span className="text-xs font-bold text-slate-900">{act.userName}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-700 font-medium">{act.details}</p>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(act.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 5: TEAM & PERMISSIONS */}
      {/* ===================================================================== */}
      {subTab === "team" && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{activeLab?.name} Workspace</h2>
                {isWorkspaceOwner && (
                  <span className="rounded-md bg-slate-950 px-2.5 py-0.5 text-xs font-bold text-white">
                    Lab Owner / Admin
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Manage team permissions and view pending invitations for this workspace.
              </p>
            </div>

            {(isWorkspaceOwner || isAdminUser) && (
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(true);
                  setInviteErrorMsg(null);
                  setLastInviteLink(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
              >
                + Invite Team Member
              </button>
            )}
          </div>

          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setTeamSubTab("members")}
              className={`border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
                teamSubTab === "members" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Active Team Members ({teamMembers.length})
            </button>
            <button
              type="button"
              onClick={() => setTeamSubTab("invites")}
              className={`border-b-2 px-5 py-3 text-xs font-bold transition-colors ${
                teamSubTab === "invites" ? "border-slate-950 text-slate-950" : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Pending Invites ({pendingInvites.length})
            </button>
          </div>

          {teamLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
            </div>
          ) : teamError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {teamError}
            </div>
          ) : teamSubTab === "members" ? (
            teamMembers.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
                No team members listed in this workspace.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Member Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Manage Equipment</th>
                      <th className="px-4 py-3">Generate Reports</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamMembers.map((mem) => (
                      <tr key={mem.id || mem.memberId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">{mem.name}</td>
                        <td className="px-4 py-3 text-slate-600">{mem.email}</td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={mem.permissions.canManageInstruments}
                            disabled={!isWorkspaceOwner && !isAdminUser}
                            onChange={() => handleTogglePermission(mem.id || mem.memberId, "canManageInstruments", mem.permissions.canManageInstruments)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={mem.permissions.canGenerateReports}
                            disabled={!isWorkspaceOwner && !isAdminUser}
                            onChange={() => handleTogglePermission(mem.id || mem.memberId, "canGenerateReports", mem.permissions.canGenerateReports)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            pendingInvites.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
                No pending invitations.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Invited Email</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Invite Link</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingInvites.map((inv) => {
                      const link = `${typeof window !== "undefined" ? window.location.origin : ""}/cyrosearch?tab=logbook&inviteToken=${inv.token}`;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-900">{inv.email}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              Pending
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500 max-w-[200px] truncate">
                            {link}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(inv.token, link)}
                              className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                            >
                              {copiedToken === inv.token ? "Copied! ✓" : "Copy Link"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelInvite(inv.id)}
                              className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                            >
                              Cancel Invite
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {/* MODALS */}
      {/* ─────────────────────────────────────────────────────────────────────────── */}

      {/* Add Instrument Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Add New Instrument</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{modalError}</div>
            )}

            <form onSubmit={handleAddInstrument} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. INS-01"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Flow Cytometer"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">In-Charge Name</label>
                  <input
                    type="text"
                    value={inchargeName}
                    onChange={(e) => setInchargeName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">In-Charge Contact</label>
                  <input
                    type="text"
                    value={inchargeContact}
                    onChange={(e) => setInchargeContact(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Last Service Date</label>
                  <input
                    type="date"
                    value={lastServiceDate}
                    onChange={(e) => setLastServiceDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Next Service Date</label>
                  <input
                    type="date"
                    value={nextServiceDate}
                    onChange={(e) => setNextServiceDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add Instrument"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Slot Modal */}
      {showSlotBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Book Equipment Slot</h3>
              <button
                type="button"
                onClick={() => setShowSlotBookingModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSlotBooking} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Date</label>
                <input
                  type="text"
                  readOnly
                  value={selectedInstDate}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Start Time</label>
                  <input
                    type="time"
                    value={bookingStartTime}
                    onChange={(e) => setBookingStartTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">End Time</label>
                  <input
                    type="time"
                    value={bookingEndTime}
                    onChange={(e) => setBookingEndTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Remarks / Experiment Goal</label>
                <input
                  type="text"
                  placeholder="e.g. Assay run for sample #102"
                  value={bookingRemarks}
                  onChange={(e) => setBookingRemarks(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium"
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSlotBookingModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
                >
                  {bookingSubmitting ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {showBookingDetailModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Booking Details</h3>
              <button
                type="button"
                onClick={() => setShowBookingDetailModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Booked By:</span>
                <span className="font-bold text-slate-900">{selectedBooking.userName || "User"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold text-slate-800">{selectedBooking.date}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Time Slot:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedBooking.startTime} - {selectedBooking.endTime}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Remarks:</span>
                <span className="font-medium text-slate-800">{selectedBooking.remarks || "—"}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-between border-t border-slate-100 pt-3">
              {(isAdminUser || selectedBooking.userId === user?.id) && (
                <button
                  type="button"
                  onClick={() => handleCancelBooking(selectedBooking.id)}
                  className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  Cancel Booking
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowBookingDetailModal(false)}
                className="ml-auto rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {showServiceEditModal && selectedInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Maintenance & Service</h3>
              <button
                type="button"
                onClick={() => setShowServiceEditModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveServiceInfo} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as InstrumentStatus)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
                  <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Last Service Date</label>
                  <input
                    type="date"
                    value={editServiceDate}
                    onChange={(e) => setEditServiceDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Next Service Date</label>
                  <input
                    type="date"
                    value={editNextServiceDate}
                    onChange={(e) => setEditNextServiceDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowServiceEditModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Team Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Invite Team Member</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {inviteErrorMsg && (
              <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{inviteErrorMsg}</div>
            )}

            <form onSubmit={handleSendInviteSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Member Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@lab.org"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              {lastInviteLink && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
                  <p className="font-bold text-emerald-800">Invitation Generated!</p>
                  <p className="mt-1 text-slate-600">Share this link directly with your team member:</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={lastInviteLink}
                      className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-mono text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard("modal-link", lastInviteLink)}
                      className="shrink-0 rounded-lg bg-emerald-700 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-800"
                    >
                      {copiedToken === "modal-link" ? "Copied! ✓" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
                >
                  {inviting ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
