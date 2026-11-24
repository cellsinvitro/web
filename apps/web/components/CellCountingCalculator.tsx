"use client";

import { useState } from "react";
import { useToolAccess } from "@/lib/useToolAccess";
import ToolUsageBar from "@/components/tools/ToolUsageBar";
import LoginRequiredModal from "@/components/tools/LoginRequiredModal";

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function parseNonNegative(value: string) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parsePositive(value: string) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatSciNotation(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (value >= 100_000 || value < 0.001) {
    const expStr = value.toExponential(3);
    const [mantissa, exponent] = expStr.split("e");
    return `${mantissa} × 10${exponent?.replace("+", "")}`;
  }
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export default function CellCountingCalculator() {
  const {
    user,
    status,
    statusLoading,
    calculating,
    loginRequired,
    quotaExceeded,
    accessError,
    verifyAndConsume,
    calculateAndConsume,
    clearAccessErrors,
  } = useToolAccess("cell-counting");

  // Inputs
  const [viableCells, setViableCells] = useState("");
  const [deadCells, setDeadCells] = useState("");
  const [squaresCounted, setSquaresCounted] = useState("4");
  const [dilutionFactor, setDilutionFactor] = useState("1");
  const [sampleVolume, setSampleVolume] = useState("");

  // Chamber type: standard Neubauer has square factor 10,000 (10^4)
  const [chamberFactor, setChamberFactor] = useState("10000");

  // Calculated Results
  const [results, setResults] = useState<{
    concentrationCellsPerMl: number;
    totalCellsPerMl: number;
    viabilityPercentage: number | null;
    totalCellsInSample: number | null;
    viableCount: number;
    deadCount: number;
    totalCounted: number;
  } | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleReset = () => {
    setViableCells("");
    setDeadCells("");
    setSquaresCounted("4");
    setDilutionFactor("1");
    setSampleVolume("");
    setResults(null);
    setValidationError(null);
    clearAccessErrors();
  };

  const handleCalculate = async () => {
    setValidationError(null);
    clearAccessErrors();

    if (!viableCells.trim()) {
      setValidationError("Please enter the number of viable cells counted.");
      return;
    }
    const viable = parseNonNegative(viableCells);
    if (viable === null) {
      setValidationError("Viable cells counted must be a non-negative number.");
      return;
    }

    let dead = 0;
    if (deadCells.trim() !== "") {
      const deadParsed = parseNonNegative(deadCells);
      if (deadParsed === null) {
        setValidationError("Non-viable cells counted must be a non-negative number.");
        return;
      }
      dead = deadParsed;
    }

    if (!squaresCounted.trim()) {
      setValidationError("Please enter the number of large squares counted.");
      return;
    }
    const squares = parsePositive(squaresCounted);
    if (!squares) {
      setValidationError("Number of squares counted must be a positive number.");
      return;
    }

    if (!dilutionFactor.trim()) {
      setValidationError("Please enter the dilution factor (e.g. 1 if undiluted, 2 for 1:1 trypan blue).");
      return;
    }
    const df = parsePositive(dilutionFactor);
    if (!df) {
      setValidationError("Dilution factor must be a positive number.");
      return;
    }

    let volumeMl: number | null = null;
    if (sampleVolume.trim() !== "") {
      const vol = parsePositive(sampleVolume);
      if (!vol) {
        setValidationError("Sample volume must be a positive number.");
        return;
      }
      volumeMl = vol;
    }

    // Shared access authorization & backend calculation
    const res = await calculateAndConsume<{
      concentrationCellsPerMl: number;
      totalCellsPerMl: number;
      viabilityPercentage: number | null;
      totalCellsInSample: number | null;
      viableCount: number;
      deadCount: number;
      totalCounted: number;
    }>({
      viableCells: viable,
      deadCells: dead,
      squaresCounted: squares,
      dilutionFactor: df,
      sampleVolume: volumeMl,
      chamberFactor,
    });

    if (!res) {
      if (!user) setShowLoginModal(true);
      return;
    }

    const factor = Number(chamberFactor) || 10_000;
    const totalCounted = viable + dead;

    // Formula: Cells/mL = (Cells counted / Squares counted) * Dilution factor * 10^4
    const concentrationCellsPerMl = res.result?.concentrationCellsPerMl ?? ((viable / squares) * df * factor);
    const totalCellsPerMl = res.result?.totalCellsPerMl ?? ((totalCounted / squares) * df * factor);

    // Viability % = [Viable / (Viable + Dead)] * 100
    const viabilityPercentage =
      res.result?.viabilityPercentage !== undefined
        ? res.result.viabilityPercentage
        : (totalCounted > 0 ? (viable / totalCounted) * 100 : null);

    // Total cells in sample = concentration * volume in mL
    const totalCellsInSample =
      res.result?.totalCellsInSample !== undefined
        ? res.result.totalCellsInSample
        : (volumeMl !== null ? concentrationCellsPerMl * volumeMl : null);

    setResults({
      concentrationCellsPerMl,
      totalCellsPerMl,
      viabilityPercentage,
      totalCellsInSample,
      viableCount: viable,
      deadCount: dead,
      totalCounted,
    });
  };

  return (
    <div className="space-y-6">
      <LoginRequiredModal
        isOpen={showLoginModal || loginRequired}
        onClose={() => {
          setShowLoginModal(false);
          clearAccessErrors();
        }}
        message="Please login to calculate"
      />

      {/* Usage bar */}
      <ToolUsageBar
        status={status}
        loading={statusLoading}
        authenticated={Boolean(user)}
      />

      {/* Hemocytometer equation formula notice */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs sm:text-sm text-slate-700 space-y-1">
        <p className="font-semibold text-slate-900">
          Standard Hemocytometer Calculation Formula:
        </p>
        <p className="font-mono text-slate-950 font-medium">
          Cells/mL = (Total cells counted / Large squares counted) &times; Dilution factor &times; 10<sup>4</sup>
        </p>
        <p className="text-[11px] text-slate-500">
          The 10<sup>4</sup> factor reflects the standard Neubauer chamber large-square volume of 0.1 mm<sup>3</sup> (10<sup>-4</sup> mL).
        </p>
      </div>

      {/* Inputs grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Viable Cells Counted <span className="text-emerald-600">*</span>
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={viableCells}
            onChange={(e) => setViableCells(e.target.value)}
            placeholder="e.g. 120"
            className={inputClassName}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Non-Viable (Dead) Cells <span className="text-slate-400 font-normal">(Optional)</span>
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={deadCells}
            onChange={(e) => setDeadCells(e.target.value)}
            placeholder="e.g. 15 (Trypan blue stained)"
            className={inputClassName}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Large Squares Counted <span className="text-emerald-600">*</span>
          </span>
          <input
            type="number"
            min="1"
            step="1"
            value={squaresCounted}
            onChange={(e) => setSquaresCounted(e.target.value)}
            placeholder="e.g. 4 (4 corner squares)"
            className={inputClassName}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Dilution Factor <span className="text-emerald-600">*</span>
          </span>
          <input
            type="number"
            min="1"
            step="any"
            value={dilutionFactor}
            onChange={(e) => setDilutionFactor(e.target.value)}
            placeholder="1 for undiluted; 2 for 1:1 trypan blue"
            className={inputClassName}
          />
        </label>

        <div className="sm:col-span-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Total Original Sample Volume (mL) <span className="text-slate-400 font-normal">(Optional — to calculate total cell yield)</span>
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={sampleVolume}
              onChange={(e) => setSampleVolume(e.target.value)}
              placeholder="e.g. 5.0 mL cell suspension"
              className={inputClassName}
            />
          </label>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 font-medium">
          {validationError}
        </div>
      )}

      {/* Access Error */}
      {accessError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 font-medium flex items-center justify-between">
          <span>{accessError}</span>
          {quotaExceeded && (
            <a
              href="/tools#subscription-plans"
              className="ml-3 underline font-semibold text-amber-950"
            >
              View Plans
            </a>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleCalculate}
          disabled={calculating}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
        >
          {calculating ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Calculating result...</span>
            </>
          ) : (
            "Calculate"
          )}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={calculating}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Reset
        </button>
      </div>

      {/* Result Output Card */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        <div className="border-b border-slate-200/60 pb-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Counting &amp; Viability Output
          </p>
        </div>

        <div className="mt-4">
          {results ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Viable Cell Concentration
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-950">
                    {formatSciNotation(results.concentrationCellsPerMl)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 font-medium">cells / mL</p>
                </div>

                {results.viabilityPercentage !== null ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Cell Viability
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-emerald-600">
                      {results.viabilityPercentage.toFixed(1)}%
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {results.viableCount} viable / {results.totalCounted} total cells counted
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Cells per Large Square
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-slate-950">
                      {(results.viableCount / (Number(squaresCounted) || 1)).toFixed(1)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">average viable count</p>
                  </div>
                )}
              </div>

              {results.totalCellsInSample !== null && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    Total Viable Cells in Entire Sample ({sampleVolume} mL)
                  </p>
                  <p className="mt-1.5 text-2xl font-bold text-emerald-950">
                    {formatSciNotation(results.totalCellsInSample)} viable cells
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">Calculation Summary:</p>
                <p>
                  &bull; Total cells counted: {results.totalCounted} ({results.viableCount} viable, {results.deadCount} dead) across {squaresCounted} large square(s).
                </p>
                <p>
                  &bull; Dilution factor applied: {dilutionFactor}&times;.
                </p>
                <p>
                  &bull; Hemocytometer chamber volume factor: 10<sup>4</sup> (standard 0.1 mm depth).
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-500">
              Enter the counted hemocytometer values above and click{" "}
              <strong className="text-slate-800">Calculate</strong> to obtain cell concentration and viability.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
