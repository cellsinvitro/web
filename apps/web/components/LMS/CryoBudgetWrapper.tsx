"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import PageLoadingScreen from "@/components/PageLoadingScreen";
import * as XLSX from "xlsx";
import {
  fetchBudgets,
  createBudget,
  deleteBudget,
  fetchBudget,
  createBudgetHead,
  updateBudgetHead,
  deleteBudgetHead,
  createBudgetField,
  updateBudgetField,
  deleteBudgetField,
  submitBudgetForm,
  deleteBudgetSubmission,
  type Budget,
  type BudgetHead,
  type BudgetFormField,
  type BudgetFieldDirection,
  type BudgetSubmission,
} from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(paise: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtShortDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const color =
    pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

// ─── Create-budget modal ──────────────────────────────────────────────────────

type CreateState = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  allocatedAmount: string;
  currency: string;
  submitting: boolean;
  error: string | null;
};

type CreateAction =
  | { type: "FIELD"; key: keyof Omit<CreateState, "submitting" | "error">; value: string }
  | { type: "START" }
  | { type: "ERROR"; msg: string }
  | { type: "RESET" };

const initCreate: CreateState = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  allocatedAmount: "",
  currency: "INR",
  submitting: false,
  error: null,
};

function createReducer(s: CreateState, a: CreateAction): CreateState {
  switch (a.type) {
    case "FIELD": return { ...s, [a.key]: a.value };
    case "START": return { ...s, submitting: true, error: null };
    case "ERROR": return { ...s, submitting: false, error: a.msg };
    case "RESET": return initCreate;
  }
}

function CreateBudgetModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (b: Budget) => void;
}) {
  const [s, dispatch] = useReducer(createReducer, initCreate);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(s.allocatedAmount);
    if (!s.name.trim()) { dispatch({ type: "ERROR", msg: "Budget name is required." }); return; }
    if (isNaN(amt) || amt < 0) { dispatch({ type: "ERROR", msg: "Enter a valid allocated amount." }); return; }
    dispatch({ type: "START" });
    try {
      const budget = await createBudget({
        name: s.name.trim(),
        description: s.description.trim() || undefined,
        startDate: s.startDate || undefined,
        endDate: s.endDate || undefined,
        allocatedAmount: amt,
        currency: s.currency.trim().toUpperCase() || "INR",
      });
      dispatch({ type: "RESET" });
      onCreated(budget);
    } catch (err) {
      dispatch({ type: "ERROR", msg: err instanceof Error ? err.message : "Failed to create budget." });
    }
  }

  const field = (key: keyof Omit<CreateState, "submitting" | "error">) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      dispatch({ type: "FIELD", key, value: e.target.value });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create budget"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">New budget</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Budget name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Lab Budget 2026"
              required
              value={s.name}
              onChange={field("name")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Description
            </label>
            <input
              type="text"
              placeholder="Optional"
              value={s.description}
              onChange={field("description")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Allocated amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                required
                value={s.allocatedAmount}
                onChange={field("allocatedAmount")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Currency
              </label>
              <input
                type="text"
                maxLength={3}
                value={s.currency}
                onChange={(e) =>
                  dispatch({ type: "FIELD", key: "currency", value: e.target.value.toUpperCase() })
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm uppercase focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Start date
              </label>
              <input
                type="date"
                value={s.startDate}
                onChange={field("startDate")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                End date
              </label>
              <input
                type="date"
                value={s.endDate}
                onChange={field("endDate")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {s.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{s.error}</p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={s.submitting}
              className="flex-1 rounded-xl bg-slate-950 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {s.submitting ? "Creating…" : "Create budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Budget Card ──────────────────────────────────────────────────────────────

function BudgetCard({
  budget,
  onDelete,
  onSelect,
}: {
  budget: Budget;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOver = budget.netSpent > budget.allocatedAmount;

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      {/* Delete controls — top-right */}
      <div className="absolute right-4 top-4 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {confirming ? (
          <>
            <button
              type="button"
              disabled={deleting}
              onClick={async (e) => {
                e.stopPropagation();
                setDeleting(true);
                try { await deleteBudget(budget.id); onDelete(budget.id); }
                catch { setDeleting(false); setConfirming(false); }
              }}
              className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {deleting ? "…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete budget"
          >
            ✕
          </button>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(budget.id)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(budget.id); }}
        className="cursor-pointer block text-left"
      >
        <div className="flex items-start gap-3 pr-16">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{budget.name}</p>
            {budget.description ? (
              <p className="mt-0.5 truncate text-sm text-slate-500">{budget.description}</p>
            ) : null}
            {(budget.startDate || budget.endDate) ? (
              <p className="mt-1 text-xs text-slate-400">
                {budget.startDate
                  ? new Date(budget.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "—"}
                {" → "}
                {budget.endDate
                  ? new Date(budget.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "ongoing"}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-end justify-between gap-2 text-sm">
            <span className="text-slate-500">
              Spent{" "}
              <span className={`font-semibold ${isOver ? "text-red-600" : "text-slate-950"}`}>
                {fmt(budget.netSpent, budget.currency)}
              </span>
            </span>
            <span className="text-slate-400 text-xs">
              of {fmt(budget.allocatedAmount, budget.currency)}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar value={budget.netSpent} max={budget.allocatedAmount} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>
              Remaining:{" "}
              <span className={`font-semibold ${budget.remaining < 0 ? "text-red-600" : "text-slate-800"}`}>
                {fmt(budget.remaining, budget.currency)}
              </span>
            </span>
            <span className="text-slate-300">·</span>
            <span>{budget.submissionCount} submission{budget.submissionCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Export Helpers ───────────────────────────────────────────────────────────

function buildExport(
  budget: Budget,
  heads: BudgetHead[],
  submissions: BudgetSubmission[]
) {
  const wb = XLSX.utils.book_new();

  const summaryData: (string | number)[][] = [
    ["Budget Name", budget.name],
    ["Description", budget.description ?? ""],
    ["Start Date", fmtShortDate(budget.startDate)],
    ["End Date", fmtShortDate(budget.endDate)],
    ["Currency", budget.currency],
    ["Allocated", budget.allocatedAmount / 100],
    ["Total Spent", budget.netSpent / 100],
    ["Remaining", budget.remaining / 100],
    ["Total Entries", budget.submissionCount],
    [],
    ["Budget Head Breakdown"],
    ["Head", "Entries", "Spent"],
  ];

  const unheadedSubs = submissions.filter((s) => !s.headId);
  const unheadedSpent = unheadedSubs.reduce((acc, s) => acc + s.netEffect, 0);
  if (unheadedSubs.length > 0) {
    summaryData.push(["(No section)", unheadedSubs.length, unheadedSpent / 100]);
  }
  for (const head of heads) {
    const headSubs = submissions.filter((s) => s.headId === head.id);
    const headSpent = headSubs.reduce((acc, s) => acc + s.netEffect, 0);
    summaryData.push([head.name, headSubs.length, headSpent / 100]);
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

  const labelSet = new Set<string>();
  for (const sub of submissions) for (const v of sub.values) labelSet.add(v.label);
  const labels = Array.from(labelSet);

  const rows: (string | number | null)[][] = [
    ["Date", "Section", "Net Effect", "Note", "Submitted By", ...labels],
  ];
  for (const sub of submissions) {
    const headName = sub.headId
      ? (heads.find((h) => h.id === sub.headId)?.name ?? "")
      : "";
    const valMap: Record<string, string> = {};
    for (const v of sub.values) valMap[v.label] = v.value;
    rows.push([
      fmtDate(sub.submittedAt),
      headName,
      sub.netEffect / 100,
      sub.note ?? "",
      sub.user.name ?? sub.user.email,
      ...labels.map((l) => valMap[l] ?? ""),
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Entries");
  return wb;
}

function downloadExcel(budget: Budget, heads: BudgetHead[], submissions: BudgetSubmission[]) {
  const wb = buildExport(budget, heads, submissions);
  XLSX.writeFile(wb, `${budget.name.replace(/\s+/g, "_")}_budget.xlsx`);
}

function downloadPdf(budget: Budget, heads: BudgetHead[], submissions: BudgetSubmission[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const currency = budget.currency;

  const headRows = heads.map((h) => {
    const subs = submissions.filter((s) => s.headId === h.id);
    const spent = subs.reduce((a, s) => a + s.netEffect, 0);
    return `<tr><td>${h.name}</td><td style="text-align:right">${subs.length}</td><td style="text-align:right">${fmt(spent, currency)}</td></tr>`;
  }).join("");

  const unheadedSubs = submissions.filter((s) => !s.headId);
  const unheadedRow = unheadedSubs.length > 0
    ? `<tr><td><em>(No section)</em></td><td style="text-align:right">${unheadedSubs.length}</td><td style="text-align:right">${fmt(unheadedSubs.reduce((a, s) => a + s.netEffect, 0), currency)}</td></tr>`
    : "";

  const labelSet = new Set<string>();
  for (const sub of submissions) for (const v of sub.values) labelSet.add(v.label);
  const labels = Array.from(labelSet);

  const entryRows = submissions.map((sub) => {
    const headName = sub.headId ? (heads.find((h) => h.id === sub.headId)?.name ?? "") : "";
    const valMap: Record<string, string> = {};
    for (const v of sub.values) valMap[v.label] = v.value;
    return `<tr>
      <td>${fmtDate(sub.submittedAt)}</td>
      <td>${headName}</td>
      <td style="text-align:right">${fmt(sub.netEffect, currency)}</td>
      <td>${sub.note ?? ""}</td>
      <td>${sub.user.name ?? sub.user.email}</td>
      ${labels.map((l) => `<td>${valMap[l] ?? ""}</td>`).join("")}
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${budget.name} — Budget Report</title>
  <style>
    body{font-family:sans-serif;font-size:12px;color:#0f172a;padding:32px}
    h1{font-size:20px;margin-bottom:4px}
    h2{font-size:14px;margin-top:24px;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
    p{margin:2px 0;color:#64748b}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{text-align:left;padding:6px 8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
    td{padding:6px 8px;border:1px solid #e2e8f0}
    tr:nth-child(even) td{background:#f8fafc}
    .stat{display:inline-block;margin-right:32px}
    .stat-label{font-size:11px;color:#94a3b8}
    .stat-value{font-size:16px;font-weight:bold}
    @media print{body{padding:0}}
  </style>
</head>
<body>
  <h1>${budget.name}</h1>
  ${budget.description ? `<p>${budget.description}</p>` : ""}
  <p>${fmtShortDate(budget.startDate)} → ${fmtShortDate(budget.endDate)}</p>
  <div style="margin-top:16px;display:flex;gap:32px;flex-wrap:wrap">
    <div class="stat"><div class="stat-label">Allocated</div><div class="stat-value">${fmt(budget.allocatedAmount, currency)}</div></div>
    <div class="stat"><div class="stat-label">Spent</div><div class="stat-value">${fmt(budget.netSpent, currency)}</div></div>
    <div class="stat"><div class="stat-label">Remaining</div><div class="stat-value">${fmt(budget.remaining, currency)}</div></div>
    <div class="stat"><div class="stat-label">Entries</div><div class="stat-value">${budget.submissionCount}</div></div>
  </div>
  <h2>Section Breakdown</h2>
  <table>
    <thead><tr><th>Section</th><th style="text-align:right">Entries</th><th style="text-align:right">Spent</th></tr></thead>
    <tbody>${unheadedRow}${headRows}</tbody>
  </table>
  <h2>All Entries</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Section</th><th>Net Effect</th><th>Note</th><th>By</th>${labels.map((l) => `<th>${l}</th>`).join("")}</tr>
    </thead>
    <tbody>${entryRows}</tbody>
  </table>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function DownloadDropdown({
  budget,
  heads,
  submissions,
}: {
  budget: Budget;
  heads: BudgetHead[];
  submissions: BudgetSubmission[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0">
          <path d="M8 1a.5.5 0 0 1 .5.5v7.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 .708-.708L7.5 9.293V1.5A.5.5 0 0 1 8 1ZM1 13.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5Z" />
        </svg>
        Download
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-slate-400">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => { downloadExcel(budget, heads, submissions); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-xs font-bold text-emerald-700">XL</span>
            Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => { downloadPdf(budget, heads, submissions); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-red-100 text-xs font-bold text-red-600">PDF</span>
            PDF (print)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add Head Form ──────────────────────────────────────────────────────────

function AddHeadForm({ budgetId, onAdded }: { budgetId: string; onAdded: (h: BudgetHead) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Section name is required."); return; }
    setSaving(true); setErr(null);
    try {
      const head = await createBudgetHead(budgetId, { name: name.trim(), description: desc.trim() || undefined });
      onAdded(head);
      setName(""); setDesc(""); setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create section.");
    } finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-3 text-sm font-medium text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
          <path d="M8 3.5a.5.5 0 0 1 .5.5v3.5H12a.5.5 0 0 1 0 1H8.5V12a.5.5 0 0 1-1 0V8.5H4a.5.5 0 0 1 0-1h3.5V4a.5.5 0 0 1 .5-.5Z" />
        </svg>
        Add budget section
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-xs font-semibold text-slate-600">New section</p>
      <div className="space-y-2.5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text" autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Equipment, Salary, Consumables"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Description <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Short description"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {saving ? "Adding…" : "Add section"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setErr(null); }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Submission Card ──────────────────────────────────────────────────────────

function SubmissionCard({
  sub, currency, budgetId, onDelete,
}: {
  sub: BudgetSubmission; currency: string; budgetId: string; onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isExpense = sub.netEffect > 0;
  const hasImpact = sub.netEffect !== 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className={`flex items-center justify-between gap-4 px-4 py-3 ${hasImpact ? (isExpense ? "bg-red-50" : "bg-emerald-50") : "bg-slate-50"}`}>
        <div className="flex items-center gap-3">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${!hasImpact ? "bg-slate-200 text-slate-500" : isExpense ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
            {!hasImpact ? "·" : isExpense ? "−" : "+"}
          </span>
          <div>
            {hasImpact ? (
              <p className={`text-sm font-bold ${isExpense ? "text-red-700" : "text-emerald-800"}`}>
                {isExpense ? "−" : "+"}{fmt(Math.abs(sub.netEffect), currency)}
              </p>
            ) : (
              <p className="text-sm font-medium text-slate-500">No budget impact</p>
            )}
            <p className="text-xs text-slate-500">{fmtDate(sub.submittedAt)} · {sub.user.name ?? sub.user.email}</p>
          </div>
        </div>

        {confirming ? (
          <div className="flex shrink-0 gap-1">
            <button type="button" disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try { await deleteBudgetSubmission(budgetId, sub.id); onDelete(sub.id); }
                catch { setDeleting(false); setConfirming(false); }
              }}
              className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50">
              {deleting ? "…" : "Delete"}
            </button>
            <button type="button" onClick={() => setConfirming(false)}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-500"
            aria-label="Delete entry">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M6 2a1 1 0 0 0-1 1v.5H3.5a.5.5 0 0 0 0 1H4v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-8h.5a.5.5 0 0 0 0-1H11V3a1 1 0 0 0-1-1H6Zm1 1h2v.5H7V3Zm-2 2h6v7.5H5V5Z" />
            </svg>
          </button>
        )}
      </div>

      {sub.note && (
        <div className="border-b border-slate-100 px-4 py-2">
          <p className="text-xs italic text-slate-500">&quot;{sub.note}&quot;</p>
        </div>
      )}

      {sub.values.length > 0 && (
        <dl className="flex flex-wrap gap-x-5 gap-y-1 px-4 py-2.5">
          {sub.values.map((v) => (
            <div key={v.fieldId} className="flex items-baseline gap-1.5">
              <dt className="text-xs font-medium text-slate-400">{v.label}</dt>
              <dd className="text-xs font-semibold text-slate-700">
                {v.direction !== "NONE"
                  ? `${v.direction === "EXPENSE" ? "−" : "+"}${fmt(Math.round(parseFloat(v.value) * 100), currency)}`
                  : v.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

// ─── Delete Field Button ──────────────────────────────────────────────────────

function DeleteFieldButton({
  budgetId, fieldId, onDeleted,
}: {
  budgetId: string; fieldId: string; onDeleted: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (confirm) {
    return (
      <div className="flex shrink-0 gap-1">
        <button type="button" disabled={deleting}
          onClick={async () => {
            setDeleting(true);
            try { await deleteBudgetField(budgetId, fieldId); onDeleted(fieldId); }
            catch { setDeleting(false); setConfirm(false); }
          }}
          className="rounded-lg bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">
          {deleting ? "…" : "Delete"}
        </button>
        <button type="button" onClick={() => setConfirm(false)}
          className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-100">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setConfirm(true)}
      className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
      aria-label="Delete field">
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M6 2a1 1 0 0 0-1 1v.5H3.5a.5.5 0 0 0 0 1H4v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-8h.5a.5.5 0 0 0 0-1H11V3a1 1 0 0 0-1-1H6Zm1 1h2v.5H7V3Zm-2 2h6v7.5H5V5Z" />
      </svg>
    </button>
  );
}

// ─── Section Panel ────────────────────────────────────────────────────────────

function SectionPanel({
  budgetId,
  headId,
  currency,
  fields,
  submissions,
  onFieldAdded,
  onFieldUpdated,
  onFieldDeleted,
  onEntrySubmitted,
  onEntryDeleted,
}: {
  budgetId: string;
  headId: string | null;
  currency: string;
  fields: BudgetFormField[];
  submissions: BudgetSubmission[];
  onFieldAdded: (f: BudgetFormField) => void;
  onFieldUpdated: (f: BudgetFormField) => void;
  onFieldDeleted: (id: string) => void;
  onEntrySubmitted: (sub: BudgetSubmission) => void;
  onEntryDeleted: (id: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  const [addingField, setAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldDir, setNewFieldDir] = useState<BudgetFieldDirection>("EXPENSE");
  const [addingFieldSaving, setAddingFieldSaving] = useState(false);
  const [addingFieldErr, setAddingFieldErr] = useState<string | null>(null);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDir, setEditDir] = useState<BudgetFieldDirection>("EXPENSE");
  const [editSaving, setEditSaving] = useState(false);

  const currSymbol = currency === "INR" ? "₹" : currency;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fields.length === 0) return;
    setSubmitting(true); setSubmitErr(null); setSubmitOk(false);
    try {
      const sub = await submitBudgetForm(budgetId, values, note.trim() || undefined, headId ?? undefined);
      setValues({});
      setNote("");
      setSubmitOk(true);
      onEntrySubmitted(sub);
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddField(e: React.FormEvent) {
    e.preventDefault();
    if (!newFieldName.trim()) { setAddingFieldErr("Name is required."); return; }
    setAddingFieldSaving(true); setAddingFieldErr(null);
    try {
      const field = await createBudgetField(budgetId, {
        label: newFieldName.trim(),
        fieldType: "NUMBER",
        direction: newFieldDir,
        headId: headId ?? undefined,
      });
      onFieldAdded(field);
      setNewFieldName(""); setNewFieldDir("EXPENSE"); setAddingField(false);
    } catch (e) {
      setAddingFieldErr(e instanceof Error ? e.message : "Failed to add.");
    } finally {
      setAddingFieldSaving(false);
    }
  }

  function startEdit(f: BudgetFormField) {
    setEditingField(f.id);
    setEditLabel(f.label);
    setEditDir(f.direction);
  }

  async function saveEdit(fieldId: string) {
    if (!editLabel.trim()) return;
    setEditSaving(true);
    try {
      const updated = await updateBudgetField(budgetId, fieldId, {
        label: editLabel.trim(),
        fieldType: "NUMBER",
        direction: editDir,
      });
      onFieldUpdated(updated);
      setEditingField(null);
    } catch { /* noop */ } finally { setEditSaving(false); }
  }

  return (
    <div className="p-5">
      <form onSubmit={handleSubmit}>
        {fields.length === 0 && !addingField ? (
          <p className="mb-3 text-xs text-slate-400">No fields yet — add one below to start recording entries.</p>
        ) : (
          <div className="mb-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {fields.map((f) => {
              const isEditing = editingField === f.id;
              return (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                  {isEditing ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); saveEdit(f.id); }
                          if (e.key === "Escape") setEditingField(null);
                        }}
                        className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm font-medium focus:border-slate-500 focus:outline-none"
                      />
                      <select
                        value={editDir}
                        onChange={(e) => setEditDir(e.target.value as BudgetFieldDirection)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
                      >
                        <option value="EXPENSE">Deducts</option>
                        <option value="ADDITION">Adds</option>
                        <option value="NONE">Info only</option>
                      </select>
                      <button type="button" onClick={() => saveEdit(f.id)} disabled={editSaving}
                        className="rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">
                        {editSaving ? "…" : "Save"}
                      </button>
                      <button type="button" onClick={() => setEditingField(null)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-slate-800">{f.label}</span>
                        <span className={`ml-2 text-[10px] font-semibold ${f.direction === "EXPENSE" ? "text-red-400" : f.direction === "ADDITION" ? "text-emerald-500" : "text-slate-300"}`}>
                          {f.direction === "EXPENSE" ? "deducts" : f.direction === "ADDITION" ? "adds" : "info"}
                        </span>
                      </div>

                      <div className="relative w-36 shrink-0">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                          {currSymbol}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={values[f.id] ?? ""}
                          onChange={(e) => setValues((p) => ({ ...p, [f.id]: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
                        />
                      </div>

                      <button type="button" onClick={() => startEdit(f)}
                        className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Edit field">
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="M11.013 2.5a1.657 1.657 0 0 1 2.345 2.344L5.5 12.702l-2.7.601.6-2.7 7.613-8.103Zm1.168.878a.657.657 0 0 0-.929 0L3.5 11.5l-.234 1.05 1.05-.234L12.18 4.55a.657.657 0 0 0 0-.929l-.469-.243Z" />
                        </svg>
                      </button>
                      <DeleteFieldButton budgetId={budgetId} fieldId={f.id} onDeleted={onFieldDeleted} />
                    </>
                  )}
                </div>
              );
            })}

            {addingField ? (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { setAddingField(false); setAddingFieldErr(null); } }}
                    placeholder="e.g. Microscope, Centrifuge, Salary"
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  />
                  <select
                    value={newFieldDir}
                    onChange={(e) => setNewFieldDir(e.target.value as BudgetFieldDirection)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs focus:border-slate-400 focus:outline-none"
                  >
                    <option value="EXPENSE">Deducts</option>
                    <option value="ADDITION">Adds</option>
                    <option value="NONE">Info only</option>
                  </select>
                  <button type="button" onClick={handleAddField} disabled={addingFieldSaving}
                    className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                    {addingFieldSaving ? "…" : "Add"}
                  </button>
                  <button type="button" onClick={() => { setAddingField(false); setAddingFieldErr(null); }}
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-50">
                    ✕
                  </button>
                </div>
                {addingFieldErr && <p className="mt-1.5 text-xs text-red-600">{addingFieldErr}</p>}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingField(true)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M8 3.5a.5.5 0 0 1 .5.5v3.5H12a.5.5 0 0 1 0 1H8.5V12a.5.5 0 0 1-1 0V8.5H4a.5.5 0 0 1 0-1h3.5V4a.5.5 0 0 1 .5-.5Z" />
                </svg>
                Add field
              </button>
            )}
          </div>
        )}

        {fields.length === 0 && !addingField && (
          <button
            type="button"
            onClick={() => setAddingField(true)}
            className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-sm font-medium text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M8 3.5a.5.5 0 0 1 .5.5v3.5H12a.5.5 0 0 1 0 1H8.5V12a.5.5 0 0 1-1 0V8.5H4a.5.5 0 0 1 0-1h3.5V4a.5.5 0 0 1 .5-.5Z" />
            </svg>
            Add field
          </button>
        )}

        {fields.length === 0 && addingField && (
          <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setAddingField(false); setAddingFieldErr(null); } }}
                placeholder="e.g. Microscope, Centrifuge, Salary"
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
              <select
                value={newFieldDir}
                onChange={(e) => setNewFieldDir(e.target.value as BudgetFieldDirection)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs focus:border-slate-400 focus:outline-none"
              >
                <option value="EXPENSE">Deducts</option>
                <option value="ADDITION">Adds</option>
                <option value="NONE">Info only</option>
              </select>
              <button type="button" onClick={handleAddField} disabled={addingFieldSaving}
                className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                {addingFieldSaving ? "…" : "Add"}
              </button>
              <button type="button" onClick={() => { setAddingField(false); setAddingFieldErr(null); }}
                className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-50">
                ✕
              </button>
            </div>
            {addingFieldErr && <p className="mt-1.5 text-xs text-red-600">{addingFieldErr}</p>}
          </div>
        )}

        {fields.length > 0 && (
          <>
            <div className="mb-3">
              <textarea
                rows={2}
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm placeholder:text-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>

            {submitErr && (
              <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{submitErr}</p>
            )}
            {submitOk && (
              <p className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">✓ Entry recorded.</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Submit entry"}
            </button>
          </>
        )}
      </form>

      {submissions.length > 0 && (
        <div className="mt-5">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            History ({submissions.length})
          </p>
          <div className="space-y-2">
            {submissions.map((sub) => (
              <SubmissionCard
                key={sub.id}
                sub={sub}
                currency={currency}
                budgetId={budgetId}
                onDelete={onEntryDeleted}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Budget Head Section ──────────────────────────────────────────────────────

function BudgetHeadSection({
  head, budgetId, currency, allFields, submissions,
  onHeadUpdated, onHeadDeleted, onFieldAdded, onFieldUpdated, onFieldDeleted,
  onEntrySubmitted, onEntryDeleted,
}: {
  head: BudgetHead;
  budgetId: string;
  currency: string;
  allFields: BudgetFormField[];
  submissions: BudgetSubmission[];
  onHeadUpdated: (h: BudgetHead) => void;
  onHeadDeleted: (id: string) => void;
  onFieldAdded: (f: BudgetFormField) => void;
  onFieldUpdated: (f: BudgetFormField) => void;
  onFieldDeleted: (id: string) => void;
  onEntrySubmitted: (sub: BudgetSubmission) => void;
  onEntryDeleted: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(head.name);
  const [descVal, setDescVal] = useState(head.description ?? "");
  const [savingName, setSavingName] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const headFields = allFields.filter((f) => f.headId === head.id);
  const headSubs = submissions.filter((s) => s.headId === head.id);
  const headSpent = headSubs.reduce((acc, s) => acc + s.netEffect, 0);

  async function saveName() {
    if (!nameVal.trim()) return;
    setSavingName(true);
    try {
      const updated = await updateBudgetHead(budgetId, head.id, {
        name: nameVal.trim(),
        description: descVal.trim() || undefined,
      });
      onHeadUpdated(updated);
      setEditingName(false);
    } catch { /* noop */ } finally { setSavingName(false); }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <button type="button" onClick={() => setCollapsed((v) => !v)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label={collapsed ? "Expand section" : "Collapse section"}>
          <svg viewBox="0 0 16 16" fill="currentColor" className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`}>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input type="text" autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setNameVal(head.name); } }}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-semibold focus:border-slate-500 focus:outline-none" />
              <input type="text" value={descVal} onChange={(e) => setDescVal(e.target.value)}
                placeholder="Description (optional)"
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setDescVal(head.description ?? ""); } }}
                className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 focus:border-slate-400 focus:outline-none" />
              <button type="button" onClick={saveName} disabled={savingName}
                className="rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">
                {savingName ? "…" : "Save"}
              </button>
              <button type="button" onClick={() => { setEditingName(false); setNameVal(head.name); setDescVal(head.description ?? ""); }}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <h2 className="font-semibold text-slate-950">{head.name}</h2>
              {head.description && <span className="truncate text-xs text-slate-400">{head.description}</span>}
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className={`text-sm font-bold ${headSpent > 0 ? "text-red-600" : headSpent < 0 ? "text-emerald-700" : "text-slate-400"}`}>
            {headSpent !== 0 ? (headSpent > 0 ? "−" : "+") + fmt(Math.abs(headSpent), currency) : "—"}
          </p>
          <p className="text-xs text-slate-400">{headSubs.length} entr{headSubs.length !== 1 ? "ies" : "y"}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!editingName && (
            <button type="button" onClick={() => setEditingName(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Edit section name">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M11.013 2.5a1.657 1.657 0 0 1 2.345 2.344L5.5 12.702l-2.7.601.6-2.7 7.613-8.103Zm1.168.878a.657.657 0 0 0-.929 0L3.5 11.5l-.234 1.05 1.05-.234L12.18 4.55a.657.657 0 0 0 0-.929l-.469-.243Z" />
              </svg>
            </button>
          )}
          {confirmDel ? (
            <>
              <button type="button" disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try { await deleteBudgetHead(budgetId, head.id); onHeadDeleted(head.id); }
                  catch { setDeleting(false); setConfirmDel(false); }
                }}
                className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">
                {deleting ? "…" : "Delete"}
              </button>
              <button type="button" onClick={() => setConfirmDel(false)}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmDel(true)}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
              aria-label="Delete section">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M6 2a1 1 0 0 0-1 1v.5H3.5a.5.5 0 0 0 0 1H4v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-8h.5a.5.5 0 0 0 0-1H11V3a1 1 0 0 0-1-1H6Zm1 1h2v.5H7V3Zm-2 2h6v7.5H5V5Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <SectionPanel
          budgetId={budgetId}
          headId={head.id}
          currency={currency}
          fields={headFields}
          submissions={headSubs}
          onFieldAdded={onFieldAdded}
          onFieldUpdated={onFieldUpdated}
          onFieldDeleted={onFieldDeleted}
          onEntrySubmitted={onEntrySubmitted}
          onEntryDeleted={onEntryDeleted}
        />
      )}
    </div>
  );
}

// ─── Budget Detail View Component ──────────────────────────────────────────────

function BudgetDetailView({
  budgetId,
  onBack,
}: {
  budgetId: string;
  onBack: () => void;
}) {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [heads, setHeads] = useState<BudgetHead[]>([]);
  const [fields, setFields] = useState<BudgetFormField[]>([]);
  const [submissions, setSubmissions] = useState<BudgetSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshBudget = useCallback(() => {
    return fetchBudget(budgetId).then(({ budget: b, submissions: s }) => {
      setBudget(b);
      setHeads(b.heads ?? []);
      setFields(b.fields);
      setSubmissions(s);
    });
  }, [budgetId]);

  useEffect(() => {
    refreshBudget()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load budget."))
      .finally(() => setLoading(false));
  }, [refreshBudget]);

  const handleEntrySubmitted = useCallback(
    (sub: BudgetSubmission) => {
      setSubmissions((prev) => [sub, ...prev]);
      refreshBudget().catch(() => {});
    },
    [refreshBudget]
  );

  const handleDeleteEntry = useCallback(
    (subId: string) => {
      setSubmissions((prev) => prev.filter((s) => s.id !== subId));
      refreshBudget().catch(() => {});
    },
    [refreshBudget]
  );

  if (loading) {
    return <PageLoadingScreen sublabel="Loading budget details..." />;
  }

  if (error || !budget) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Budget not found."}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950"
        >
          ← Back to budgets
        </button>
      </div>
    );
  }

  const isOver = budget.netSpent > budget.allocatedAmount;
  const usedPct = budget.allocatedAmount > 0
    ? Math.min(100, Math.round((budget.netSpent / budget.allocatedAmount) * 100))
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
          >
            ← Budgets
          </button>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {budget.name}
          </h1>
          {budget.description && <p className="mt-1 text-sm text-slate-500">{budget.description}</p>}
          {(budget.startDate || budget.endDate) && (
            <p className="mt-1 text-xs text-slate-400">
              {fmtShortDate(budget.startDate)} → {fmtShortDate(budget.endDate)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOver && (
            <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
              Over budget
            </span>
          )}
          <DownloadDropdown budget={budget} heads={heads} submissions={submissions} />
        </div>
      </div>

      {/* Summary strip */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
          {[
            { label: "Allocated", value: fmt(budget.allocatedAmount, budget.currency), accent: false },
            { label: "Spent", value: fmt(budget.netSpent, budget.currency), accent: isOver },
            { label: "Remaining", value: fmt(budget.remaining, budget.currency), accent: budget.remaining < 0 },
            { label: "Entries", value: String(budget.submissionCount), accent: false },
          ].map((s) => (
            <div key={s.label} className="px-5 py-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`mt-1 text-xl font-bold ${s.accent ? "text-red-600" : "text-slate-950"}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="mb-1.5 flex justify-between text-xs text-slate-400">
            <span>Budget used</span>
            <span>{usedPct}%</span>
          </div>
          <ProgressBar value={budget.netSpent} max={budget.allocatedAmount} />
        </div>
      </div>

      {/* Section breakdown */}
      {heads.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white px-5 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Breakdown by section</p>
          <div className="flex flex-wrap gap-4">
            {heads.map((h) => {
              const hSpent = submissions.filter((s) => s.headId === h.id).reduce((a, s) => a + s.netEffect, 0);
              return (
                <div key={h.id} className="flex items-center gap-1.5 text-sm">
                  <span className="font-medium text-slate-700">{h.name}</span>
                  <span className={`font-semibold ${hSpent > 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {fmt(hSpent, budget.currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="mt-6 space-y-4">
        {heads.map((head) => (
          <BudgetHeadSection
            key={head.id}
            head={head}
            budgetId={budget.id}
            currency={budget.currency}
            allFields={fields}
            submissions={submissions}
            onHeadUpdated={(h) => setHeads((prev) => prev.map((x) => (x.id === h.id ? h : x)))}
            onHeadDeleted={(hid) => {
              setHeads((prev) => prev.filter((x) => x.id !== hid));
              setFields((prev) => prev.map((f) => f.headId === hid ? { ...f, headId: null } : f));
              setSubmissions((prev) => prev.map((s) => s.headId === hid ? { ...s, headId: null } : s));
            }}
            onFieldAdded={(f) => setFields((prev) => [...prev, f])}
            onFieldUpdated={(f) => setFields((prev) => prev.map((x) => (x.id === f.id ? f : x)))}
            onFieldDeleted={(fid) => setFields((prev) => prev.filter((x) => x.id !== fid))}
            onEntrySubmitted={handleEntrySubmitted}
            onEntryDeleted={handleDeleteEntry}
          />
        ))}

        {heads.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="font-semibold text-slate-950">No sections yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Add a section like Equipment or Salary to start recording entries.
            </p>
          </div>
        )}

        <AddHeadForm
          budgetId={budget.id}
          onAdded={(h) => setHeads((prev) => [...prev, h])}
        />
      </div>
    </div>
  );
}

// ─── Budget List View Component ────────────────────────────────────────────────

function BudgetListView({
  onSelectBudget,
}: {
  onSelectBudget: (id: string) => void;
}) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchBudgets()
      .then(setBudgets)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load budgets"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Lab management
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            My budgets
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create and track budgets for your lab projects.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + New budget
        </button>
      </div>

      {loading ? (
        <div className="mt-8">
          <PageLoadingScreen sublabel="Loading lab budgets..." />
        </div>
      ) : error ? (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      ) : budgets.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="font-semibold text-slate-950">No budgets yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Create your first budget to start tracking lab spending.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-5 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Create budget
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              onDelete={(id) => setBudgets((prev) => prev.filter((x) => x.id !== id))}
              onSelect={onSelectBudget}
            />
          ))}
        </div>
      )}

      {showCreate ? (
        <CreateBudgetModal
          onClose={() => setShowCreate(false)}
          onCreated={(b) => {
            setBudgets((prev) => [b, ...prev]);
            setShowCreate(false);
          }}
        />
      ) : null}
    </div>
  );
}

// ─── Main CryoBudgetWrapper Export ─────────────────────────────────────────────

export default function CryoBudgetWrapper() {
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  if (selectedBudgetId) {
    return (
      <BudgetDetailView
        budgetId={selectedBudgetId}
        onBack={() => setSelectedBudgetId(null)}
      />
    );
  }

  return <BudgetListView onSelectBudget={(id) => setSelectedBudgetId(id)} />;
}
