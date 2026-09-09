"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  fetchBudget,
  createBudgetField,
  updateBudgetField,
  deleteBudgetField,
  submitBudgetForm,
  deleteBudgetSubmission,
  type Budget,
  type BudgetFormField,
  type BudgetFieldType,
  type BudgetFieldDirection,
  type BudgetSubmission,
} from "@/lib/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

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

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const color = pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-400" : "bg-emerald-500";
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

// Direction icon shown on each entry field row
function DirectionIcon({ direction }: { direction: BudgetFieldDirection }) {
  if (direction === "EXPENSE")
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
        −
      </span>
    );
  if (direction === "ADDITION")
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
        +
      </span>
    );
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400">
      ·
    </span>
  );
}

// ─── Entry field config panel ─────────────────────────────────────────────────

function FieldEditRow({
  field,
  budgetId,
  onUpdated,
  onDeleted,
}: {
  field: BudgetFormField;
  budgetId: string;
  onUpdated: (f: BudgetFormField) => void;
  onDeleted: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(field.label);
  const [fieldType, setFieldType] = useState<BudgetFieldType>(field.fieldType);
  const [direction, setDirection] = useState<BudgetFieldDirection>(field.direction);
  const [defaultValue, setDefaultValue] = useState(field.defaultValue ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function cancelEdit() {
    setLabel(field.label);
    setFieldType(field.fieldType);
    setDirection(field.direction);
    setDefaultValue(field.defaultValue ?? "");
    setErr(null);
    setOpen(false);
  }

  async function save() {
    if (!label.trim()) { setErr("Label is required."); return; }
    setSaving(true); setErr(null);
    try {
      const updated = await updateBudgetField(budgetId, field.id, {
        label: label.trim(),
        fieldType,
        direction: fieldType === "NUMBER" ? direction : "NONE",
        defaultValue: defaultValue.trim() || undefined,
      });
      onUpdated(updated);
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white">
      {/* Collapsed row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <DirectionIcon direction={field.direction} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{field.label}</p>
          <p className="text-xs text-slate-400">
            {field.fieldType === "TEXT" ? "Text" : field.fieldType === "DATE" ? "Date" : (
              field.direction === "EXPENSE" ? "Amount · deducts"
              : field.direction === "ADDITION" ? "Amount · adds"
              : "Amount · info only"
            )}
            {field.defaultValue ? ` · default: ${field.defaultValue}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            {open ? "Close" : "Edit"}
          </button>
          {confirmDel ? (
            <>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try { await deleteBudgetField(budgetId, field.id); onDeleted(field.id); }
                  catch { setDeleting(false); setConfirmDel(false); }
                }}
                className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deleting ? "…" : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDel(false)}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
              aria-label="Delete field"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M6 2a1 1 0 0 0-1 1v.5H3.5a.5.5 0 0 0 0 1H4v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-8h.5a.5.5 0 0 0 0-1H11V3a1 1 0 0 0-1-1H6Zm1 1h2v.5H7V3Zm-2 2h6v7.5H5V5Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded edit form */}
      {open && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-3">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Input type</label>
              <select
                value={fieldType}
                onChange={(e) => {
                  const t = e.target.value as BudgetFieldType;
                  setFieldType(t);
                  if (t !== "NUMBER") setDirection("NONE");
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
              >
                <option value="TEXT">Text</option>
                <option value="NUMBER">Number (amount)</option>
                <option value="DATE">Date</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Budget effect</label>
              <select
                value={direction}
                disabled={fieldType !== "NUMBER"}
                onChange={(e) => setDirection(e.target.value as BudgetFieldDirection)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:bg-white focus:outline-none disabled:opacity-40"
              >
                <option value="EXPENSE">Deducts from budget</option>
                <option value="ADDITION">Adds to budget</option>
                <option value="NONE">Informational only</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Default value{" "}
                <span className="font-normal text-slate-400">(pre-filled, user can change)</span>
              </label>
              <input
                type="text"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder="Leave blank for empty"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddEntryFieldForm({
  budgetId,
  onAdded,
}: {
  budgetId: string;
  onAdded: (f: BudgetFormField) => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<BudgetFieldType>("NUMBER");
  const [direction, setDirection] = useState<BudgetFieldDirection>("EXPENSE");
  const [defaultValue, setDefaultValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) { setErr("Label is required."); return; }
    setSaving(true); setErr(null);
    try {
      const field = await createBudgetField(budgetId, {
        label: label.trim(),
        fieldType,
        direction: fieldType === "NUMBER" ? direction : "NONE",
        defaultValue: defaultValue.trim() || undefined,
      });
      onAdded(field);
      setLabel(""); setFieldType("NUMBER"); setDirection("EXPENSE");
      setDefaultValue(""); setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
          <path d="M8 3.5a.5.5 0 0 1 .5.5v3.5H12a.5.5 0 0 1 0 1H8.5V12a.5.5 0 0 1-1 0V8.5H4a.5.5 0 0 1 0-1h3.5V4a.5.5 0 0 1 .5-.5Z" />
        </svg>
        Add entry field
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={label}
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Reagent cost, Vendor name, Purchase date"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Input type</label>
          <select
            value={fieldType}
            onChange={(e) => {
              const t = e.target.value as BudgetFieldType;
              setFieldType(t);
              if (t !== "NUMBER") setDirection("NONE");
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="NUMBER">Number (amount)</option>
            <option value="TEXT">Text</option>
            <option value="DATE">Date</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Budget effect</label>
          <select
            value={direction}
            disabled={fieldType !== "NUMBER"}
            onChange={(e) => setDirection(e.target.value as BudgetFieldDirection)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:opacity-40"
          >
            <option value="EXPENSE">Deducts from budget</option>
            <option value="ADDITION">Adds to budget</option>
            <option value="NONE">Informational only</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Default value{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
            placeholder="Leave blank for empty"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      <div className="mt-2.5 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add field"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setErr(null); }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Log entry form ───────────────────────────────────────────────────────────

function LogEntryForm({
  budgetId,
  fields,
  currency,
  onSubmitted,
}: {
  budgetId: string;
  fields: BudgetFormField[];
  currency: string;
  onSubmitted: (sub: BudgetSubmission) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const f of fields) {
      if (f.defaultValue) defaults[f.id] = f.defaultValue;
    }
    setValues(defaults);
    setNote("");
    setError(null);
    setSuccess(false);
  }, [fields]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null); setSuccess(false);
    try {
      const sub = await submitBudgetForm(budgetId, values, note.trim() || undefined);
      const defaults: Record<string, string> = {};
      for (const f of fields) { if (f.defaultValue) defaults[f.id] = f.defaultValue; }
      setValues(defaults);
      setNote("");
      setSuccess(true);
      onSubmitted(sub);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const currSymbol = currency === "INR" ? "₹" : currency;

  if (fields.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-700">No entry fields yet</p>
        <p className="mt-1 text-xs text-slate-400">
          Add fields on the right to define what each entry should capture.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">New entry</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Fill in the fields below and hit Submit to record spending.
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        {fields.map((field) => {
          const val = values[field.id] ?? "";

          return (
            <div key={field.id}>
              <label
                htmlFor={`f-${field.id}`}
                className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-700"
              >
                <DirectionIcon direction={field.direction} />
                {field.label}
                {field.fieldType === "NUMBER" && field.direction !== "NONE" && (
                  <span className={`ml-auto text-[10px] font-semibold ${field.direction === "EXPENSE" ? "text-red-500" : "text-emerald-600"}`}>
                    {field.direction === "EXPENSE" ? "deducts" : "adds to budget"}
                  </span>
                )}
              </label>

              {field.fieldType === "TEXT" ? (
                <input
                  id={`f-${field.id}`}
                  type="text"
                  placeholder={field.defaultValue ?? ""}
                  value={val}
                  onChange={(e) => setValues((p) => ({ ...p, [field.id]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm placeholder:text-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none"
                />
              ) : field.fieldType === "NUMBER" ? (
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    {currSymbol}
                  </span>
                  <input
                    id={`f-${field.id}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder={field.defaultValue ?? "0.00"}
                    value={val}
                    onChange={(e) => setValues((p) => ({ ...p, [field.id]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-4 text-sm placeholder:text-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none"
                  />
                </div>
              ) : (
                <input
                  id={`f-${field.id}`}
                  type="date"
                  value={val}
                  onChange={(e) => setValues((p) => ({ ...p, [field.id]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-400 focus:bg-white focus:outline-none"
                />
              )}
            </div>
          );
        })}

        <div>
          <label
            htmlFor="entry-note"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Note{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="entry-note"
            rows={2}
            placeholder="Any additional context…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm placeholder:text-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        {error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        ) : success ? (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            ✓ Entry recorded successfully.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Submit entry"}
        </button>
      </div>
    </form>
  );
}

// ─── Submission history card ──────────────────────────────────────────────────

function SubmissionCard({
  sub,
  currency,
  budgetId,
  onDelete,
}: {
  sub: BudgetSubmission;
  currency: string;
  budgetId: string;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isExpense = sub.netEffect > 0;
  const hasImpact = sub.netEffect !== 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header stripe */}
      <div
        className={`flex items-center justify-between gap-4 px-5 py-3 ${
          hasImpact
            ? isExpense
              ? "bg-red-50"
              : "bg-emerald-50"
            : "bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              !hasImpact
                ? "bg-slate-200 text-slate-500"
                : isExpense
                  ? "bg-red-100 text-red-600"
                  : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {!hasImpact ? "·" : isExpense ? "−" : "+"}
          </span>
          <div>
            {hasImpact ? (
              <p className={`text-sm font-bold ${isExpense ? "text-red-700" : "text-emerald-800"}`}>
                {isExpense ? "−" : "+"}
                {fmt(Math.abs(sub.netEffect), currency)}
              </p>
            ) : (
              <p className="text-sm font-medium text-slate-500">No budget impact</p>
            )}
            <p className="text-xs text-slate-500">
              {fmtDate(sub.submittedAt)} · {sub.user.name ?? sub.user.email}
            </p>
          </div>
        </div>

        {confirming ? (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await deleteBudgetSubmission(budgetId, sub.id);
                  onDelete(sub.id);
                } catch {
                  setDeleting(false);
                  setConfirming(false);
                }
              }}
              className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50"
            >
              {deleting ? "…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-500"
            aria-label="Delete entry"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M6 2a1 1 0 0 0-1 1v.5H3.5a.5.5 0 0 0 0 1H4v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-8h.5a.5.5 0 0 0 0-1H11V3a1 1 0 0 0-1-1H6Zm1 1h2v.5H7V3Zm-2 2h6v7.5H5V5Z" />
            </svg>
          </button>
        )}
      </div>

      {/* Note */}
      {sub.note && (
        <div className="border-b border-slate-100 px-5 py-2.5">
          <p className="text-sm italic text-slate-600">"{sub.note}"</p>
        </div>
      )}

      {/* Field values */}
      {sub.values.length > 0 && (
        <dl className="grid gap-x-6 gap-y-1.5 px-5 py-3 sm:grid-cols-2">
          {sub.values.map((v) => (
            <div key={v.fieldId} className="flex items-baseline gap-2">
              <dt className="shrink-0 text-xs font-medium text-slate-500">{v.label}</dt>
              <dd className="min-w-0 truncate text-xs text-slate-800">
                {v.fieldType === "NUMBER" && v.direction !== "NONE"
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [fields, setFields] = useState<BudgetFormField[]>([]);
  const [submissions, setSubmissions] = useState<BudgetSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshBudget = useCallback(() => {
    return fetchBudget(id).then(({ budget: b, submissions: s }) => {
      setBudget(b);
      setFields(b.fields);
      setSubmissions(s);
    });
  }, [id]);

  useEffect(() => {
    refreshBudget()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load budget."))
      .finally(() => setLoading(false));
  }, [refreshBudget]);

  const handleSubmitted = useCallback(
    (sub: BudgetSubmission) => {
      setSubmissions((prev) => [sub, ...prev]);
      refreshBudget().catch(() => {});
    },
    [refreshBudget]
  );

  const handleDeleteSubmission = useCallback(
    (subId: string) => {
      setSubmissions((prev) => prev.filter((s) => s.id !== subId));
      refreshBudget().catch(() => {});
    },
    [refreshBudget]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Budget not found."}
        </p>
        <Link
          href="/dashboard/budget"
          className="mt-4 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950"
        >
          ← Back to budgets
        </Link>
      </div>
    );
  }

  const isOver = budget.netSpent > budget.allocatedAmount;
  const usedPct =
    budget.allocatedAmount > 0
      ? Math.min(100, Math.round((budget.netSpent / budget.allocatedAmount) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard/budget"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
          >
            ← Budgets
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {budget.name}
          </h1>
          {budget.description && (
            <p className="mt-1 text-sm text-slate-500">{budget.description}</p>
          )}
          {(budget.startDate || budget.endDate) && (
            <p className="mt-1 text-xs text-slate-400">
              {budget.startDate
                ? new Date(budget.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "—"}
              {" → "}
              {budget.endDate
                ? new Date(budget.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "ongoing"}
            </p>
          )}
        </div>
        {isOver && (
          <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
            Over budget
          </span>
        )}
      </div>

      {/* ── Summary strip ── */}
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
              <p className={`mt-1 text-xl font-bold ${s.accent ? "text-red-600" : "text-slate-950"}`}>
                {s.value}
              </p>
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

      {/* ── Two-column layout ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">

        {/* ── Left: log entry + history ── */}
        <div className="space-y-6">
          <LogEntryForm
            budgetId={budget.id}
            fields={fields}
            currency={budget.currency}
            onSubmitted={handleSubmitted}
          />

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-950">
              Entry history{" "}
              <span className="font-normal text-slate-400">({submissions.length})</span>
            </h2>
            {submissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                <p className="text-sm text-slate-400">No entries yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    sub={sub}
                    currency={budget.currency}
                    budgetId={budget.id}
                    onDelete={handleDeleteSubmission}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: entry fields config ── */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-950">Entry fields</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Define what each entry captures. Number fields can deduct or add to your balance.
              </p>
            </div>
            <div className="space-y-1 p-3">
              {fields.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-slate-400">
                  No fields yet — add one below.
                </p>
              ) : (
                fields.map((f) => (
                  <FieldEditRow
                    key={f.id}
                    field={f}
                    budgetId={budget.id}
                    onUpdated={(updated) =>
                      setFields((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                    }
                    onDeleted={(fid) =>
                      setFields((prev) => prev.filter((x) => x.id !== fid))
                    }
                  />
                ))
              )}
            </div>
            <div className="border-t border-slate-100 p-3">
              <AddEntryFieldForm
                budgetId={budget.id}
                onAdded={(f) => setFields((prev) => [...prev, f])}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
