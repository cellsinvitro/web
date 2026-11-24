"use client";

import { useState } from "react";
import { useToolAccess } from "@/lib/useToolAccess";
import ToolUsageBar from "@/components/tools/ToolUsageBar";
import LoginRequiredModal from "@/components/tools/LoginRequiredModal";

type Mode = "mass" | "molarity";

type VolumeUnit = "uL" | "mL" | "L";
type MassUnit = "ug" | "mg" | "g";
type MolarityUnit = "uM" | "mM" | "M";

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

const selectClassName =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function parsePositive(value: string) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toLiters(value: number, unit: VolumeUnit): number {
  if (unit === "uL") return value / 1_000_000;
  if (unit === "mL") return value / 1_000;
  return value;
}

function toMolar(value: number, unit: MolarityUnit): number {
  if (unit === "uM") return value / 1_000_000;
  if (unit === "mM") return value / 1_000;
  return value;
}

function toGrams(value: number, unit: MassUnit): number {
  if (unit === "ug") return value / 1_000_000;
  if (unit === "mg") return value / 1_000;
  return value;
}

function fromGrams(grams: number, targetUnit: MassUnit): number {
  if (targetUnit === "ug") return grams * 1_000_000;
  if (targetUnit === "mg") return grams * 1_000;
  return grams;
}

function fromMolar(molesPerLiter: number, targetUnit: MolarityUnit): number {
  if (targetUnit === "uM") return molesPerLiter * 1_000_000;
  if (targetUnit === "mM") return molesPerLiter * 1_000;
  return molesPerLiter;
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  unit,
  onUnitChange,
  unitOptions,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  unit?: string;
  onUnitChange?: (unit: string) => void;
  unitOptions?: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputClassName} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
        />
        {unitOptions && onUnitChange ? (
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            disabled={disabled}
            className={`${selectClassName} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
            aria-label={`${label} unit`}
          >
            {unitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : unit ? (
          <span className="flex min-w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
            {unit}
          </span>
        ) : null}
      </div>
    </label>
  );
}

export default function MolarityCalculator() {
  // Phase 2.1: Default active tab is "mass" (Find Mass)
  const [mode, setMode] = useState<Mode>("mass");

  // Shared access hook
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
  } = useToolAccess("molarity");

  // State for Find Mass tab
  const [targetMolarity, setTargetMolarity] = useState("");
  const [targetMolarityUnit, setTargetMolarityUnit] = useState<MolarityUnit>("mM");
  const [massVolume, setMassVolume] = useState("");
  const [massVolumeUnit, setMassVolumeUnit] = useState<VolumeUnit>("mL");
  const [massMolecularWeight, setMassMolecularWeight] = useState("");

  // Result state for Find Mass (stored in base grams)
  const [calculatedMassGrams, setCalculatedMassGrams] = useState<number | null>(null);
  const [displayMassUnit, setDisplayMassUnit] = useState<MassUnit>("mg");

  // State for Find Molarity tab
  const [soluteMass, setSoluteMass] = useState("");
  const [soluteMassUnit, setSoluteMassUnit] = useState<MassUnit>("mg");
  const [molarityMolecularWeight, setMolarityMolecularWeight] = useState("");
  const [molarityVolume, setMolarityVolume] = useState("");
  const [molarityVolumeUnit, setMolarityVolumeUnit] = useState<VolumeUnit>("mL");

  // Result state for Find Molarity (stored in base Molar)
  const [calculatedMolarityBase, setCalculatedMolarityBase] = useState<number | null>(null);
  const [displayMolarityUnit, setDisplayMolarityUnit] = useState<MolarityUnit>("mM");

  // Validation error
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Phase 2.7: Reset on tab switching
  const handleTabSwitch = (newMode: Mode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setValidationError(null);
    clearAccessErrors();

    // Clear stale calculation results
    setCalculatedMassGrams(null);
    setCalculatedMolarityBase(null);

    // Reset inputs of previous tab
    if (newMode === "mass") {
      setSoluteMass("");
      setSoluteMassUnit("mg");
      setMolarityMolecularWeight("");
      setMolarityVolume("");
      setMolarityVolumeUnit("mL");
      setDisplayMassUnit("mg");
    } else {
      setTargetMolarity("");
      setTargetMolarityUnit("mM");
      setMassVolume("");
      setMassVolumeUnit("mL");
      setMassMolecularWeight("");
      setDisplayMolarityUnit("mM");
    }
  };

  // Phase 2.6: Clear / Reset button
  const handleReset = () => {
    setValidationError(null);
    clearAccessErrors();

    if (mode === "mass") {
      setTargetMolarity("");
      setTargetMolarityUnit("mM");
      setMassVolume("");
      setMassVolumeUnit("mL");
      setMassMolecularWeight("");
      setCalculatedMassGrams(null);
      setDisplayMassUnit("mg");
    } else {
      setSoluteMass("");
      setSoluteMassUnit("mg");
      setMolarityMolecularWeight("");
      setMolarityVolume("");
      setMolarityVolumeUnit("mL");
      setCalculatedMolarityBase(null);
      setDisplayMolarityUnit("mM");
    }
  };

  // Calculate execution
  const handleCalculate = async () => {
    setValidationError(null);
    clearAccessErrors();

    // Phase 2.8: Validation
    if (mode === "mass") {
      const conc = parsePositive(targetMolarity);
      const vol = parsePositive(massVolume);
      const mw = parsePositive(massMolecularWeight);

      if (!targetMolarity.trim()) {
        setValidationError("Please enter the target concentration.");
        return;
      }
      if (!conc) {
        setValidationError("Target concentration must be a positive number.");
        return;
      }
      if (!massVolume.trim()) {
        setValidationError("Please enter the final solution volume.");
        return;
      }
      if (!vol) {
        setValidationError("Volume must be a positive number.");
        return;
      }
      if (!massMolecularWeight.trim()) {
        setValidationError("Please enter the molecular weight.");
        return;
      }
      if (!mw) {
        setValidationError("Molecular weight must be a positive number.");
        return;
      }

      // Authoritative calculation & quota consumption
      const res = await calculateAndConsume<{ calculatedMassGrams: number }>({
        mode: "mass",
        targetMolarity: conc,
        targetMolarityUnit,
        volume: vol,
        volumeUnit: massVolumeUnit,
        molecularWeight: mw,
      });

      if (!res) {
        if (!user) setShowLoginModal(true);
        return;
      }

      // Mass (g) = Molarity (mol/L) × Volume (L) × Molecular Weight (g/mol)
      const grams = res.result?.calculatedMassGrams ?? (toMolar(conc, targetMolarityUnit) * toLiters(vol, massVolumeUnit) * mw);
      setCalculatedMassGrams(grams);

      // Pick an initial sensible display unit
      if (grams < 0.001) setDisplayMassUnit("ug");
      else if (grams < 1) setDisplayMassUnit("mg");
      else setDisplayMassUnit("g");
    } else {
      const massVal = parsePositive(soluteMass);
      const mw = parsePositive(molarityMolecularWeight);
      const vol = parsePositive(molarityVolume);

      if (!soluteMass.trim()) {
        setValidationError("Please enter the solute mass.");
        return;
      }
      if (!massVal) {
        setValidationError("Solute mass must be a positive number.");
        return;
      }
      if (!molarityMolecularWeight.trim()) {
        setValidationError("Please enter the molecular weight.");
        return;
      }
      if (!mw) {
        setValidationError("Molecular weight must be a positive number.");
        return;
      }
      if (!molarityVolume.trim()) {
        setValidationError("Please enter the final solution volume.");
        return;
      }
      if (!vol) {
        setValidationError("Volume must be a positive number.");
        return;
      }

      // Authoritative calculation & quota consumption
      const res = await calculateAndConsume<{ calculatedMolarityBase: number }>({
        mode: "molarity",
        soluteMass: massVal,
        soluteMassUnit,
        volume: vol,
        volumeUnit: molarityVolumeUnit,
        molecularWeight: mw,
      });

      if (!res) {
        if (!user) setShowLoginModal(true);
        return;
      }

      // Molarity (M) = Mass (g) / [Molecular Weight (g/mol) × Volume (L)]
      const molarityM = res.result?.calculatedMolarityBase ?? (toGrams(massVal, soluteMassUnit) / (mw * toLiters(vol, molarityVolumeUnit)));
      setCalculatedMolarityBase(molarityM);

      // Pick an initial sensible display unit
      if (molarityM < 0.001) setDisplayMolarityUnit("uM");
      else if (molarityM < 1) setDisplayMolarityUnit("mM");
      else setDisplayMolarityUnit("M");
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

      {/* Usage quota bar */}
      <ToolUsageBar
        status={status}
        loading={statusLoading}
        authenticated={Boolean(user)}
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => handleTabSwitch("mass")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            mode === "mass"
              ? "bg-slate-950 text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Find Mass (Required)
        </button>
        <button
          type="button"
          onClick={() => handleTabSwitch("molarity")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            mode === "molarity"
              ? "bg-slate-950 text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Find Molarity (Concentration)
        </button>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        {mode === "mass"
          ? "Calculate the solute mass to weigh out for a target concentration and desired solution volume."
          : "Calculate resulting solution molarity based on solute mass, formula weight, and final volume."}
      </p>

      {/* Inputs for Find Mass */}
      {mode === "mass" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Target Concentration"
            value={targetMolarity}
            onChange={setTargetMolarity}
            placeholder="e.g. 50"
            unit={targetMolarityUnit}
            onUnitChange={(u) => setTargetMolarityUnit(u as MolarityUnit)}
            unitOptions={[
              { value: "uM", label: "µM (micromolar)" },
              { value: "mM", label: "mM (millimolar)" },
              { value: "M", label: "M (molar)" },
            ]}
          />
          <Field
            label="Final Solution Volume"
            value={massVolume}
            onChange={setMassVolume}
            placeholder="e.g. 250"
            unit={massVolumeUnit}
            onUnitChange={(u) => setMassVolumeUnit(u as VolumeUnit)}
            unitOptions={[
              { value: "uL", label: "µL" },
              { value: "mL", label: "mL" },
              { value: "L", label: "L" },
            ]}
          />
          <div className="sm:col-span-2">
            <Field
              label="Molecular Weight (Formula Weight)"
              value={massMolecularWeight}
              onChange={setMassMolecularWeight}
              placeholder="e.g. 180.16 (Glucose)"
              unit="g/mol"
            />
          </div>
        </div>
      )}

      {/* Inputs for Find Molarity */}
      {mode === "molarity" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Solute Mass"
            value={soluteMass}
            onChange={setSoluteMass}
            placeholder="e.g. 5.85"
            unit={soluteMassUnit}
            onUnitChange={(u) => setSoluteMassUnit(u as MassUnit)}
            unitOptions={[
              { value: "ug", label: "µg (micrograms)" },
              { value: "mg", label: "mg (milligrams)" },
              { value: "g", label: "g (grams)" },
            ]}
          />
          <Field
            label="Molecular Weight"
            value={molarityMolecularWeight}
            onChange={setMolarityMolecularWeight}
            placeholder="e.g. 58.44 (NaCl)"
            unit="g/mol"
          />
          <div className="sm:col-span-2">
            <Field
              label="Final Solution Volume"
              value={molarityVolume}
              onChange={setMolarityVolume}
              placeholder="e.g. 500"
              unit={molarityVolumeUnit}
              onUnitChange={(u) => setMolarityVolumeUnit(u as VolumeUnit)}
              unitOptions={[
                { value: "uL", label: "µL" },
                { value: "mL", label: "mL" },
                { value: "L", label: "L" },
              ]}
            />
          </div>
        </div>
      )}

      {/* Validation or access error */}
      {validationError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 font-medium">
          {validationError}
        </div>
      )}

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

      {/* Actions */}
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
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6 transition-all">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Calculation Output
          </p>

          {/* Unit Switcher */}
          {mode === "mass" && calculatedMassGrams !== null && (
            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5 text-xs">
              {(["ug", "mg", "g"] as MassUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setDisplayMassUnit(u)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    displayMassUnit === u
                      ? "bg-slate-950 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {u === "ug" ? "µg" : u}
                </button>
              ))}
            </div>
          )}

          {mode === "molarity" && calculatedMolarityBase !== null && (
            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5 text-xs">
              {(["uM", "mM", "M"] as MolarityUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setDisplayMolarityUnit(u)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    displayMolarityUnit === u
                      ? "bg-slate-950 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {u === "uM" ? "µM" : u}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          {mode === "mass" && calculatedMassGrams !== null ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Solute Mass Required
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-slate-950">
                  {formatScientific(fromGrams(calculatedMassGrams, displayMassUnit))}
                </span>
                <span className="text-xl font-bold text-slate-600">
                  {displayMassUnit === "ug" ? "µg" : displayMassUnit}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 space-y-1">
                <p className="font-mono text-[11px] text-slate-500">
                  Formula: Mass (g) = Molarity (mol/L) × Volume (L) × MW (g/mol)
                </p>
                <p>
                  Equivalent values: {formatScientific(fromGrams(calculatedMassGrams, "ug"))} µg ={" "}
                  {formatScientific(fromGrams(calculatedMassGrams, "mg"))} mg ={" "}
                  {formatScientific(fromGrams(calculatedMassGrams, "g"))} g
                </p>
              </div>
            </div>
          ) : mode === "molarity" && calculatedMolarityBase !== null ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Resulting Concentration
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-slate-950">
                  {formatScientific(fromMolar(calculatedMolarityBase, displayMolarityUnit))}
                </span>
                <span className="text-xl font-bold text-slate-600">
                  {displayMolarityUnit === "uM" ? "µM" : displayMolarityUnit}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 space-y-1">
                <p className="font-mono text-[11px] text-slate-500">
                  Formula: Molarity (M) = Mass (g) / [MW (g/mol) × Volume (L)]
                </p>
                <p>
                  Equivalent concentrations:{" "}
                  {formatScientific(fromMolar(calculatedMolarityBase, "uM"))} µM ={" "}
                  {formatScientific(fromMolar(calculatedMolarityBase, "mM"))} mM ={" "}
                  {formatScientific(fromMolar(calculatedMolarityBase, "M"))} M
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-500">
              Enter the scientific parameters above and click{" "}
              <strong className="text-slate-800">Calculate</strong> to view verified results.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
