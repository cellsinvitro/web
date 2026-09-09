"use client";

import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { fetchBudgets, createBudget, deleteBudget, type Budget } from "@/lib/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(paise: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const color =
    pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
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
          {/* Name */}
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

          {/* Description */}
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

          {/* Allocated amount + currency */}
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

          {/* Date range */}
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

// ─── Budget card ──────────────────────────────────────────────────────────────

function BudgetCard({
  budget,
  onDelete,
}: {
  budget: Budget;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOver = budget.netSpent > budget.allocatedAmount;

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      {/* Delete controls — top-right */}
      <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {confirming ? (
          <>
            <button
              type="button"
              disabled={deleting}
              onClick={async () => {
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
              onClick={() => setConfirming(false)}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete budget"
          >
            ✕
          </button>
        )}
      </div>

      <Link href={`/dashboard/budget/${budget.id}`} className="block">
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
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetListPage() {
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
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
