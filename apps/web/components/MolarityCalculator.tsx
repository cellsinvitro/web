"use client";

import { useMemo, useState } from "react";

type Mode = "molarity" | "mass" | "dilution";

type VolumeUnit = "uL" | "mL" | "L";
type MassUnit = "mg" | "g";

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

const selectClassName =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function parsePositive(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toLiters(value: number, unit: VolumeUnit) {
  if (unit === "uL") return value / 1_000_000;
  if (unit === "mL") return value / 1_000;
  return value;
}

function toGrams(value: number, unit: MassUnit) {
  return unit === "mg" ? value / 1_000 : value;
}

function formatNumber(value: number, decimals = 4) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000) return value.toExponential(3);
  if (abs < 0.0001 && abs > 0) return value.toExponential(3);
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  unit?: string;
  onUnitChange?: (unit: string) => void;
  unitOptions?: { value: string; label: string }[];
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
          className={inputClassName}
        />
        {unitOptions && onUnitChange ? (
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            className={selectClassName}
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

const modes: { id: Mode; label: string; description: string }[] = [
  {
    id: "molarity",
    label: "Find molarity",
    description: "Calculate concentration from mass, molecular weight, and volume.",
  },
  {
    id: "mass",
    label: "Find mass",
    description: "Calculate how much solute to weigh for a target concentration.",
  },
  {
    id: "dilution",
    label: "Dilution",
    description: "Solve C₁V₁ = C₂V₂ for any missing value.",
  },
];

export default function MolarityCalculator() {
  const [mode, setMode] = useState<Mode>("molarity");

  const [mass, setMass] = useState("");
  const [massUnit, setMassUnit] = useState<MassUnit>("g");
  const [molecularWeight, setMolecularWeight] = useState("");
  const [volume, setVolume] = useState("");
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("mL");
  const [targetMolarity, setTargetMolarity] = useState("");

  const [c1, setC1] = useState("");
  const [v1, setV1] = useState("");
  const [v1Unit, setV1Unit] = useState<VolumeUnit>("mL");
  const [c2, setC2] = useState("");
  const [v2, setV2] = useState("");
  const [v2Unit, setV2Unit] = useState<VolumeUnit>("mL");

  const result = useMemo(() => {
    if (mode === "molarity") {
      const massValue = parsePositive(mass);
      const mw = parsePositive(molecularWeight);
      const volumeValue = parsePositive(volume);
      if (!massValue || !mw || !volumeValue) return null;

      const moles = toGrams(massValue, massUnit) / mw;
      const liters = toLiters(volumeValue, volumeUnit);
      return {
        label: "Molarity",
        value: moles / liters,
        unit: "M",
        formula: "M = (mass / MW) / volume",
      };
    }

    if (mode === "mass") {
      const molarity = parsePositive(targetMolarity);
      const mw = parsePositive(molecularWeight);
      const volumeValue = parsePositive(volume);
      if (!molarity || !mw || !volumeValue) return null;

      const liters = toLiters(volumeValue, volumeUnit);
      const grams = molarity * mw * liters;
      return {
        label: "Mass required",
        value: grams,
        unit: "g",
        alt:
          grams < 1
            ? { label: "Mass required", value: grams * 1_000, unit: "mg" }
            : null,
        formula: "mass = M × MW × volume",
      };
    }

    const c1Value = c1.trim() ? parsePositive(c1) : null;
    const v1Value = v1.trim() ? parsePositive(v1) : null;
    const c2Value = c2.trim() ? parsePositive(c2) : null;
    const v2Value = v2.trim() ? parsePositive(v2) : null;

    const known = [c1Value, v1Value, c2Value, v2Value].filter(
      (value) => value !== null
    ).length;
    if (known !== 3) return null;

    if (!c1Value) {
      if (!v1Value || !c2Value || !v2Value) return null;
      const value =
        (c2Value * toLiters(v2Value, v2Unit)) / toLiters(v1Value, v1Unit);
      return {
        label: "Stock concentration (C₁)",
        value,
        unit: "M",
        formula: "C₁ = (C₂ × V₂) / V₁",
      };
    }

    if (!v1Value) {
      if (!c2Value || !v2Value) return null;
      const liters =
        (c2Value * toLiters(v2Value, v2Unit)) / c1Value;
      return {
        label: "Stock volume (V₁)",
        value: liters * 1_000,
        unit: "mL",
        formula: "V₁ = (C₂ × V₂) / C₁",
      };
    }

    if (!c2Value) {
      if (!v2Value) return null;
      const value =
        (c1Value * toLiters(v1Value, v1Unit)) / toLiters(v2Value, v2Unit);
      return {
        label: "Final concentration (C₂)",
        value,
        unit: "M",
        formula: "C₂ = (C₁ × V₁) / V₂",
      };
    }

    if (!v2Value) {
      const liters =
        (c1Value * toLiters(v1Value, v1Unit)) / c2Value;
      return {
        label: "Final volume (V₂)",
        value: liters * 1_000,
        unit: "mL",
        formula: "V₂ = (C₁ × V₁) / C₂",
      };
    }

    return null;
  }, [
    mode,
    mass,
    massUnit,
    molecularWeight,
    volume,
    volumeUnit,
    targetMolarity,
    c1,
    v1,
    v1Unit,
    c2,
    v2,
    v2Unit,
  ]);

  const activeMode = modes.find((item) => item.id === mode)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {modes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === item.id
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="text-sm leading-6 text-slate-500">{activeMode.description}</p>

      {mode === "molarity" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Mass"
            value={mass}
            onChange={setMass}
            placeholder="e.g. 5.85"
            unit={massUnit}
            onUnitChange={(value) => setMassUnit(value as MassUnit)}
            unitOptions={[
              { value: "g", label: "g" },
              { value: "mg", label: "mg" },
            ]}
          />
          <Field
            label="Molecular weight"
            value={molecularWeight}
            onChange={setMolecularWeight}
            placeholder="e.g. 58.44"
            unit="g/mol"
          />
          <Field
            label="Volume"
            value={volume}
            onChange={setVolume}
            placeholder="e.g. 500"
            unit={volumeUnit}
            onUnitChange={(value) => setVolumeUnit(value as VolumeUnit)}
            unitOptions={[
              { value: "uL", label: "µL" },
              { value: "mL", label: "mL" },
              { value: "L", label: "L" },
            ]}
          />
        </div>
      )}

      {mode === "mass" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Target molarity"
            value={targetMolarity}
            onChange={setTargetMolarity}
            placeholder="e.g. 0.1"
            unit="M"
          />
          <Field
            label="Molecular weight"
            value={molecularWeight}
            onChange={setMolecularWeight}
            placeholder="e.g. 58.44"
            unit="g/mol"
          />
          <Field
            label="Volume"
            value={volume}
            onChange={setVolume}
            placeholder="e.g. 500"
            unit={volumeUnit}
            onUnitChange={(value) => setVolumeUnit(value as VolumeUnit)}
            unitOptions={[
              { value: "uL", label: "µL" },
              { value: "mL", label: "mL" },
              { value: "L", label: "L" },
            ]}
          />
        </div>
      )}

      {mode === "dilution" && (
        <div className="space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Leave one field blank to solve for it
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Stock concentration (C₁)"
              value={c1}
              onChange={setC1}
              placeholder="e.g. 1"
              unit="M"
            />
            <Field
              label="Stock volume (V₁)"
              value={v1}
              onChange={setV1}
              placeholder="e.g. 10"
              unit={v1Unit}
              onUnitChange={(value) => setV1Unit(value as VolumeUnit)}
              unitOptions={[
                { value: "uL", label: "µL" },
                { value: "mL", label: "mL" },
                { value: "L", label: "L" },
              ]}
            />
            <Field
              label="Final concentration (C₂)"
              value={c2}
              onChange={setC2}
              placeholder="e.g. 0.1"
              unit="M"
            />
            <Field
              label="Final volume (V₂)"
              value={v2}
              onChange={setV2}
              placeholder="e.g. 100"
              unit={v2Unit}
              onUnitChange={(value) => setV2Unit(value as VolumeUnit)}
              unitOptions={[
                { value: "uL", label: "µL" },
                { value: "mL", label: "mL" },
                { value: "L", label: "L" },
              ]}
            />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
        {result ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Result
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {formatNumber(result.value)}{" "}
              <span className="text-lg text-slate-500">{result.unit}</span>
            </p>
            {result.alt && (
              <p className="mt-1 text-sm text-slate-500">
                {result.alt.label}: {formatNumber(result.alt.value)}{" "}
                {result.alt.unit}
              </p>
            )}
            <p className="mt-3 text-sm text-slate-500">{result.formula}</p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Result
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Enter valid positive values to see the calculated result.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
