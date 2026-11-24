"use client";

import { useState } from "react";
import { useToolAccess } from "@/lib/useToolAccess";
import ToolUsageBar from "@/components/tools/ToolUsageBar";
import LoginRequiredModal from "@/components/tools/LoginRequiredModal";

type Category = "molar" | "weight";

type MolarUnit = "uM" | "mM" | "M";
type WeightUnit = "ug/mL" | "mg/mL";
type VolumeUnit = "uL" | "mL" | "L";

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

const selectClassName =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function parsePositive(value: string) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// Convert Molar units to base M (mol/L)
function toBaseMolar(value: number, unit: MolarUnit): number {
  if (unit === "uM") return value / 1_000_000;
  if (unit === "mM") return value / 1_000;
  return value;
}

// Convert Weight units to base mg/mL
function toBaseWeight(value: number, unit: WeightUnit): number {
  if (unit === "ug/mL") return value / 1_000;
  return value;
}

// Convert Volume to base Liters
function toLiters(value: number, unit: VolumeUnit): number {
  if (unit === "uL") return value / 1_000_000;
  if (unit === "mL") return value / 1_000;
  return value;
}

// Convert Liters to target volume unit
function fromLiters(liters: number, targetUnit: VolumeUnit): number {
  if (targetUnit === "uL") return liters * 1_000_000;
  if (targetUnit === "mL") return liters * 1_000;
  return liters;
}

function formatScientific(value: number, decimals = 4): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 100_000 || (abs < 0.0001 && abs > 0)) {
    return value.toExponential(3);
  }
  return value.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });
}

export default function DilutionCalculator() {
  const [category, setCategory] = useState<Category>("molar");

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
  } = useToolAccess("dilution");

  // Inputs
  const [c1, setC1] = useState("");
  const [c1MolarUnit, setC1MolarUnit] = useState<MolarUnit>("mM");
  const [c1WeightUnit, setC1WeightUnit] = useState<WeightUnit>("mg/mL");

  const [c2, setC2] = useState("");
  const [c2MolarUnit, setC2MolarUnit] = useState<MolarUnit>("uM");
  const [c2WeightUnit, setC2WeightUnit] = useState<WeightUnit>("ug/mL");

  const [v2, setV2] = useState("");
  const [v2Unit, setV2Unit] = useState<VolumeUnit>("mL");

  // Output in Liters
  const [v1Liters, setV1Liters] = useState<number | null>(null);
  const [diluentLiters, setDiluentLiters] = useState<number | null>(null);
  const [v2LitersOutput, setV2LitersOutput] = useState<number | null>(null);

  // Result display unit for volumes
  const [displayVolumeUnit, setDisplayVolumeUnit] = useState<VolumeUnit>("mL");

  const [validationError, setValidationError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Switching category resets incompatible inputs and stale results
  const handleCategorySwitch = (newCategory: Category) => {
    if (newCategory === category) return;
    setCategory(newCategory);
    setValidationError(null);
    clearAccessErrors();
    setC1("");
    setC2("");
    setV2("");
    setV1Liters(null);
    setDiluentLiters(null);
    setV2LitersOutput(null);
  };

  const handleReset = () => {
    setC1("");
    setC2("");
    setV2("");
    setV1Liters(null);
    setDiluentLiters(null);
    setV2LitersOutput(null);
    setValidationError(null);
    clearAccessErrors();
    setDisplayVolumeUnit("mL");
  };

  const handleCalculate = async () => {
    setValidationError(null);
    clearAccessErrors();

    if (!c1.trim()) {
      setValidationError("Please enter the stock concentration (C₁).");
      return;
    }
    const c1Val = parsePositive(c1);
    if (!c1Val) {
      setValidationError("Stock concentration must be a positive number.");
      return;
    }

    if (!c2.trim()) {
      setValidationError("Please enter the required final concentration (C₂).");
      return;
    }
    const c2Val = parsePositive(c2);
    if (!c2Val) {
      setValidationError("Required concentration must be a positive number.");
      return;
    }

    if (!v2.trim()) {
      setValidationError("Please enter the desired final volume (V₂).");
      return;
    }
    const v2Val = parsePositive(v2);
    if (!v2Val) {
      setValidationError("Final volume must be a positive number.");
      return;
    }

    // Convert concentrations to normalized base units
    let c1Base = 0;
    let c2Base = 0;

    if (category === "molar") {
      c1Base = toBaseMolar(c1Val, c1MolarUnit);
      c2Base = toBaseMolar(c2Val, c2MolarUnit);
    } else {
      c1Base = toBaseWeight(c1Val, c1WeightUnit);
      c2Base = toBaseWeight(c2Val, c2WeightUnit);
    }

    // Scientific validation: C1 must be >= C2 for dilution
    if (c1Base < c2Base) {
      setValidationError(
        "The stock concentration must be equal to or greater than the required concentration for a dilution."
      );
      return;
    }

    // Shared access authorization & backend calculation
    const res = await calculateAndConsume<{ v1Liters: number; diluentLiters: number; v2Liters: number }>({
      category,
      c1: c1Val,
      c1Unit: category === "molar" ? c1MolarUnit : c1WeightUnit,
      c2: c2Val,
      c2Unit: category === "molar" ? c2MolarUnit : c2WeightUnit,
      v2: v2Val,
      v2Unit,
    });

    if (!res) {
      if (!user) setShowLoginModal(true);
      return;
    }

    // Formula: V1 = (C2 * V2) / C1
    const v2L = toLiters(v2Val, v2Unit);
    const v1L = res.result?.v1Liters ?? ((c2Base * v2L) / c1Base);
    const diluentL = res.result?.diluentLiters ?? Math.max(0, v2L - v1L);

    setV1Liters(v1L);
    setDiluentLiters(diluentL);
    setV2LitersOutput(v2L);

    // Pick a sensible display unit for volumes
    if (v1L < 0.001) {
      setDisplayVolumeUnit("uL");
    } else if (v1L < 1) {
      setDisplayVolumeUnit("mL");
    } else {
      setDisplayVolumeUnit("L");
    }
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

      {/* Usage Bar */}
      <ToolUsageBar
        status={status}
        loading={statusLoading}
        authenticated={Boolean(user)}
      />

      {/* Category selection */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Concentration Category
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleCategorySwitch("molar")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              category === "molar"
                ? "bg-slate-950 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Molar Concentration
          </button>
          <button
            type="button"
            onClick={() => handleCategorySwitch("weight")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              category === "weight"
                ? "bg-slate-950 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Weight / Volume
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Stock Concentration C1 */}
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Stock Concentration (C<sub>1</sub>)
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={c1}
              onChange={(e) => setC1(e.target.value)}
              placeholder="e.g. 100"
              className={inputClassName}
            />
            {category === "molar" ? (
              <select
                value={c1MolarUnit}
                onChange={(e) => setC1MolarUnit(e.target.value as MolarUnit)}
                className={selectClassName}
                aria-label="Stock concentration unit"
              >
                <option value="uM">µM</option>
                <option value="mM">mM</option>
                <option value="M">M</option>
              </select>
            ) : (
              <select
                value={c1WeightUnit}
                onChange={(e) => setC1WeightUnit(e.target.value as WeightUnit)}
                className={selectClassName}
                aria-label="Stock concentration unit"
              >
                <option value="ug/mL">µg/mL</option>
                <option value="mg/mL">mg/mL</option>
              </select>
            )}
          </div>
        </label>

        {/* Required Concentration C2 */}
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Required Concentration (C<sub>2</sub>)
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={c2}
              onChange={(e) => setC2(e.target.value)}
              placeholder="e.g. 10"
              className={inputClassName}
            />
            {category === "molar" ? (
              <select
                value={c2MolarUnit}
                onChange={(e) => setC2MolarUnit(e.target.value as MolarUnit)}
                className={selectClassName}
                aria-label="Required concentration unit"
              >
                <option value="uM">µM</option>
                <option value="mM">mM</option>
                <option value="M">M</option>
              </select>
            ) : (
              <select
                value={c2WeightUnit}
                onChange={(e) => setC2WeightUnit(e.target.value as WeightUnit)}
                className={selectClassName}
                aria-label="Required concentration unit"
              >
                <option value="ug/mL">µg/mL</option>
                <option value="mg/mL">mg/mL</option>
              </select>
            )}
          </div>
        </label>

        {/* Required Final Volume V2 */}
        <div className="sm:col-span-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Required Final Volume (V<sub>2</sub>)
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={v2}
                onChange={(e) => setV2(e.target.value)}
                placeholder="e.g. 10"
                className={inputClassName}
              />
              <select
                value={v2Unit}
                onChange={(e) => setV2Unit(e.target.value as VolumeUnit)}
                className={selectClassName}
                aria-label="Required volume unit"
              >
                <option value="uL">µL</option>
                <option value="mL">mL</option>
                <option value="L">L</option>
              </select>
            </div>
          </label>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 font-medium">
          {validationError}
        </div>
      )}

      {/* Access / Quota Error */}
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

      {/* Action Buttons */}
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

      {/* Result Card */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Dilution Recipe
          </p>

          {/* Volume unit toggle */}
          {v1Liters !== null && (
            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5 text-xs">
              {(["uL", "mL", "L"] as VolumeUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setDisplayVolumeUnit(u)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    displayVolumeUnit === u
                      ? "bg-slate-950 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {u === "uL" ? "µL" : u}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          {v1Liters !== null && diluentLiters !== null && v2LitersOutput !== null ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Stock Volume Required (V<sub>1</sub>)
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-950">
                    {formatScientific(fromLiters(v1Liters, displayVolumeUnit))}{" "}
                    <span className="text-lg font-bold text-slate-600">
                      {displayVolumeUnit === "uL" ? "µL" : displayVolumeUnit}
                    </span>
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Diluent Volume (Buffer / Solvent)
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-950">
                    {formatScientific(fromLiters(diluentLiters, displayVolumeUnit))}{" "}
                    <span className="text-lg font-bold text-slate-600">
                      {displayVolumeUnit === "uL" ? "µL" : displayVolumeUnit}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-900">Preparation Instructions:</p>
                <p>
                  Take <strong>{formatScientific(fromLiters(v1Liters, displayVolumeUnit))} {displayVolumeUnit === "uL" ? "µL" : displayVolumeUnit}</strong> of your stock solution (C₁).
                </p>
                <p>
                  Add <strong>{formatScientific(fromLiters(diluentLiters, displayVolumeUnit))} {displayVolumeUnit === "uL" ? "µL" : displayVolumeUnit}</strong> of diluent to reach the final volume of <strong>{formatScientific(fromLiters(v2LitersOutput, displayVolumeUnit))} {displayVolumeUnit === "uL" ? "µL" : displayVolumeUnit}</strong> (V₂).
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-500">
              Enter the stock concentration, desired concentration, and final volume above, then click{" "}
              <strong className="text-slate-800">Calculate</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
