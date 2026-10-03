"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DataPoint,
  type FitResult,
  fitFourPL,
  formatSci,
  fourPL,
  generateCurvePoints,
  parseDataInput,
} from "@/lib/ic50";
import { consumeToolUse } from "@/lib/api";

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function getYDomain(points: DataPoint[], fit: FitResult) {
  const observedYs = points.map((p) => p.response);
  const dataMin = Math.min(...observedYs, fit.params.bottom);
  const dataMax = Math.max(...observedYs, fit.params.top);

  // Fixed 0-100 default range unless data goes below 0 or above 100
  const yMin = dataMin >= 0 ? 0 : Math.floor(dataMin / 10) * 10;
  const yMax = dataMax <= 100 ? 100 : Math.ceil(dataMax / 10) * 10;
  return { yMin, yMax };
}

function getLogTicks(xMin: number, xMax: number): number[] {
  const minExp = Math.floor(Math.log10(xMin));
  const maxExp = Math.ceil(Math.log10(xMax));
  const ticks: number[] = [];

  for (let exp = minExp; exp <= maxExp; exp++) {
    const val = Math.pow(10, exp);
    if (val >= xMin * 0.95 && val <= xMax * 1.05) {
      ticks.push(val);
    }
  }

  if (ticks.length < 3) {
    const detailTicks: number[] = [];
    for (let exp = minExp; exp <= maxExp; exp++) {
      [1, 2, 5].forEach((m) => {
        const val = m * Math.pow(10, exp);
        if (val >= xMin * 0.95 && val <= xMax * 1.05) {
          detailTicks.push(val);
        }
      });
    }
    return detailTicks.length > 0
      ? Array.from(new Set(detailTicks)).sort((a, b) => a - b)
      : ticks;
  }

  return ticks;
}


function DoseResponseChart({
  points,
  fit,
  svgId = "ic50-dose-response-chart",
  width = 640,
  height = 260,
  className = "aspect-[8/3.2] h-auto w-full",
}: {
  points: DataPoint[];
  fit: FitResult;
  svgId?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const large = width > 700;
  const pad = { top: 20, right: 24, bottom: 44, left: 68 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const positiveX = points.map((p) => p.concentration).filter((x) => x > 0);
  const minConc = Math.min(...positiveX);
  const maxConc = Math.max(...positiveX);

  const targetIc50 = fit.interpolatedIc50 ?? fit.params.ic50;

  const xMin = Math.min(minConc / 1.5, targetIc50 / 1.5);
  const xMax = Math.max(maxConc * 1.5, targetIc50 * 1.5);
  const { yMin, yMax } = getYDomain(points, fit);

  const xScale = (x: number) =>
    pad.left +
    ((Math.log10(Math.max(x, 1e-12)) - Math.log10(xMin)) /
      (Math.log10(xMax) - Math.log10(xMin))) *
      plotW;
  const yScale = (y: number) =>
    pad.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  const curve = generateCurvePoints(fit.params, xMin, xMax, 100);
  const curvePath = curve
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${xScale(p.x).toFixed(1)} ${yScale(p.y).toFixed(1)}`
    )
    .join(" ");

  const targetY =
    fit.interpolatedIc50 !== undefined && fit.interpolatedIc50 !== null
      ? 50
      : fourPL(targetIc50, fit.params);
  const ic50X = xScale(targetIc50);
  const ic50Y = yScale(targetY);

  // Y axis ticks: standard 0, 20, 40, 60, 80, 100 or divided range
  const yTicks =
    yMin === 0 && yMax === 100
      ? [0, 20, 40, 60, 80, 100]
      : Array.from({ length: 5 }, (_, i) => yMin + (i * (yMax - yMin)) / 4);

  // Uniform Log Ticks for X axis
  const xTicks = getLogTicks(xMin, xMax);

  const tickClass = large ? "fill-slate-400 text-xs" : "fill-slate-400 text-[10px]";
  const axisClass = large
    ? "fill-slate-600 text-xs font-semibold"
    : "fill-slate-600 text-[11px] font-semibold";
  const labelClass = large
    ? "fill-amber-900 text-xs font-bold"
    : "fill-amber-900 text-[10px] font-bold";

  // Position badge safely away from graph edge & curve collision
  const badgeWidth = 112;
  const badgeX = Math.min(
    Math.max(ic50X - badgeWidth / 2, pad.left + 4),
    pad.left + plotW - badgeWidth - 4
  );
  const badgeY = Math.max(ic50Y - 26, pad.top + 6);

  return (
    <svg
      id={svgId}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="Dose-response curve with fitted 4PL model"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x={pad.left}
        y={pad.top}
        width={plotW}
        height={plotH}
        fill="#f8fafc"
        rx="8"
      />

      {/* Y-axis gridlines & tick labels */}
      {yTicks.map((y) => (
        <g key={y}>
          <line
            x1={pad.left}
            y1={yScale(y)}
            x2={pad.left + plotW}
            y2={yScale(y)}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
          <text
            x={pad.left - 8}
            y={yScale(y) + 4}
            textAnchor="end"
            className={tickClass}
          >
            {formatSci(y, 1)}
          </text>
        </g>
      ))}

      {/* Vertical Y-axis label */}
      <text
        transform={`rotate(-90, 18, ${pad.top + plotH / 2})`}
        x={18}
        y={pad.top + plotH / 2}
        textAnchor="middle"
        className={axisClass}
      >
        % Growth Inhibition
      </text>

      {/* X-axis tick values (Logarithmic scale) */}
      {xTicks.map((x) => (
        <g key={x}>
          <line
            x1={xScale(x)}
            y1={pad.top + plotH}
            x2={xScale(x)}
            y2={pad.top + plotH + 4}
            stroke="#cbd5e1"
          />
          <text
            x={xScale(x)}
            y={height - 18}
            textAnchor="middle"
            className={tickClass}
          >
            {formatSci(x)}
          </text>
        </g>
      ))}

      {/* X-axis title */}
      <text
        x={pad.left + plotW / 2}
        y={height - 4}
        textAnchor="middle"
        className={axisClass}
      >
        Concentration (Log Scale)
      </text>

      {/* Fitted 4PL Curve */}
      <path
        d={curvePath}
        fill="none"
        stroke="#0f172a"
        strokeWidth={large ? 2.5 : 2}
      />

      {/* IC50 50% guide lines */}
      <line
        x1={pad.left}
        y1={ic50Y}
        x2={ic50X}
        y2={ic50Y}
        stroke="#f59e0b"
        strokeDasharray="4 3"
        strokeWidth="1.5"
      />
      <line
        x1={ic50X}
        y1={ic50Y}
        x2={ic50X}
        y2={pad.top + plotH}
        stroke="#f59e0b"
        strokeDasharray="4 3"
        strokeWidth="1.5"
      />
      <circle
        cx={ic50X}
        cy={ic50Y}
        r={large ? 5 : 4}
        fill="#f59e0b"
        stroke="#fff"
        strokeWidth="2"
      />

      {/* Non-overlapping IC50 Label Badge */}
      <g transform={`translate(${badgeX}, ${badgeY})`}>
        <rect
          x="0"
          y="0"
          width={badgeWidth}
          height="20"
          rx="6"
          fill="#ffffff"
          stroke="#f59e0b"
          strokeWidth="1.5"
        />
        <text
          x={badgeWidth / 2}
          y="13"
          textAnchor="middle"
          className={labelClass}
        >
          IC₅₀: {formatSci(targetIc50)}
        </text>
      </g>

      {/* Experimental Data Points */}
      {points.map((point, i) => {
        if (point.concentration <= 0) return null;
        const cx = xScale(point.concentration);
        const cy = yScale(point.response);
        const err = point.sem;

        return (
          <g key={i}>
            {err !== undefined && err > 0 && (
              <line
                x1={cx}
                y1={yScale(point.response - err)}
                x2={cx}
                y2={yScale(point.response + err)}
                stroke="#64748b"
                strokeWidth="1.5"
              />
            )}
            <circle
              cx={cx}
              cy={cy}
              r={large ? 6 : 5}
              fill="#fff"
              stroke="#0f172a"
              strokeWidth={large ? 2.5 : 2}
            />
          </g>
        );
      })}

      {/* Watermark in bottom right corner */}
      <g transform={`translate(${pad.left + plotW - 10}, ${pad.top + plotH - 10})`}>
        <rect
          x="-154"
          y="-14"
          width="156"
          height="16"
          rx="4"
          fill="#ffffff"
          fillOpacity="0.9"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <text
          x="-6"
          y="-2"
          textAnchor="end"
          className="fill-slate-600 text-[9px] font-semibold tracking-tight"
        >
          Cellsinvitro.com/tools/IC50
        </text>
      </g>
    </svg>
  );
}

function IC50MethodCitationCards() {
  const [copied, setCopied] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  const citationText =
    "CellsInVitro IC50 Calculator. CellsInVitro Lifesciences Pvt. Ltd. Version 1.0. Available at: https://cellsinvitro.com/tools/ic50";
  const templateText =
    "Dose-response curve fitting and IC₅₀ values were determined using the CellsInVitro IC50 Calculator (https://cellsinvitro.com/tools/ic50) using four-parameter logistic (4PL) non-linear regression.";

  const handleCopy = () => {
    navigator.clipboard.writeText(citationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-10 space-y-4">
      {/* 2-Card Grid tailored to CellsInVitro theme (How to Cite first, Version after) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: How to Cite (FIRST) */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 flex flex-col justify-between shadow-2xs">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-slate-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-sm font-bold text-slate-900">How to Cite</h3>
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5 font-mono text-[11px] leading-5 text-slate-800 select-all break-all sm:break-words [overflow-wrap:anywhere] shadow-2xs">
              {citationText}
            </div>
            <div className="mt-3.5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 shadow-2xs"
              >
                {copied ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 text-emerald-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="h-3.5 w-3.5 text-slate-300"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M7 3.5A1.5 1.5 0 018.5 2h5A1.5 1.5 0 0115 3.5v1A1.5 1.5 0 0113.5 6h-5A1.5 1.5 0 017 4.5v-1z" />
                      <path d="M6 4.5H4.5A1.5 1.5 0 003 6v10.5A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H14v1.5a3 3 0 01-3 3h-2a3 3 0 01-3-3V4.5z" />
                    </svg>
                    <span>Copy Citation</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowTemplate(!showTemplate)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 decoration-slate-300 transition-colors"
              >
                {showTemplate ? "Hide manuscript template" : "Show methods template"}
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Version & Release Details (SECOND) */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-slate-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-sm font-bold text-slate-900">Version & Release Info</h3>
              </div>
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-800">
                v1.0
              </span>
            </div>
            <p className="mt-3.5 text-xs leading-6 text-slate-600">
              Calculations support laboratory assay planning, documentation, and SOP verification against manufacturer specifications.
            </p>
            <div className="mt-4 border-t border-slate-200/80 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span><strong>Release Date:</strong> March 22, 2026</span>
              <span><strong>Publisher:</strong> CellsInVitro Lifesciences</span>
            </div>
          </div>
        </div>
      </div>

      {showTemplate && (
        <div className="min-w-0 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-950 transition-all">
          <p className="font-semibold text-blue-900">Manuscript Methods Template Snippet:</p>
          <p className="mt-1 font-mono text-[11px] leading-5 text-blue-900 bg-white/80 p-2.5 rounded-xl border border-blue-200 select-all break-all sm:break-words [overflow-wrap:anywhere]">
            {templateText}
          </p>
        </div>
      )}
    </div>
  );
}

function ChartLightbox({
  points,
  fit,
  onClose,
}: {
  points: DataPoint[];
  fit: FitResult;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged dose-response curve"
    >
      <div
        className="relative w-full max-w-5xl rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Dose–response curve
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              IC₅₀ = {formatSci(fit.params.ic50)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              aria-label="Close enlarged chart"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>
        <DoseResponseChart
          points={points}
          fit={fit}
          svgId="ic50-dose-response-lightbox"
          width={960}
          height={380}
          className="aspect-[8/3.2] h-auto w-full"
        />
      </div>
    </div>
  );
}

export default function IC50Calculator() {
  const [rawInput, setRawInput] = useState("");
  const [processedPoints, setProcessedPoints] = useState<DataPoint[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fitResult, setFitResult] = useState<FitResult | null>(null);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const preview = useMemo(() => parseDataInput(rawInput), [rawInput]);

  function handleProcessData() {
    const { points, errors } = parseDataInput(rawInput);
    setParseErrors(errors);
    if (errors.length === 0 && points.length >= 4) {
      setProcessedPoints(points);
      setFitResult(null);
      setChartExpanded(false);
    } else {
      setProcessedPoints(null);
      setFitResult(null);
    }
  }

  async function handleCalculate() {
    if (!processedPoints || isCalculating) return;
    setIsCalculating(true);
    try {
      await consumeToolUse("ic50");
      const result = fitFourPL(processedPoints);
      setFitResult(result);
    } catch (error) {
      setParseErrors([
        error instanceof Error ? error.message : "Tool usage limit reached",
      ]);
    } finally {
      setIsCalculating(false);
    }
  }

  const equation = fitResult
    ? `Y = ${formatSci(fitResult.params.bottom)} + (${formatSci(fitResult.params.top)} − ${formatSci(fitResult.params.bottom)}) / (1 + (X / ${formatSci(fitResult.params.ic50)})${formatSci(fitResult.params.hill)})`
    : null;

  return (
    <div className="space-y-8">
      <div
        className={
          processedPoints
            ? "grid gap-8 lg:grid-cols-2 lg:items-start"
            : "space-y-6"
        }
      >
        <div className="min-w-0 space-y-6">
          <section>
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                1
              </span>
              <h3 className="text-sm font-semibold text-slate-950">Data entry</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Paste or type concentration and response values (% growth inhibition).
              Use tabs, commas, or spaces between columns. Multiple response columns
              are averaged with SEM error bars.
            </p>
            <textarea
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                setProcessedPoints(null);
                setFitResult(null);
                setChartExpanded(false);
                setParseErrors([]);
              }}
              rows={6}
              spellCheck={false}
              className={`${inputClassName} mt-4 font-mono text-xs leading-5`}
              placeholder={"Concentration\tResponse 1\tResponse 2\n0.01\t12\t14\n0.1\t28\t30\n1\t52\t54\n10\t84\t86\n100\t96\t98"}
            />
            <button
              type="button"
              onClick={handleProcessData}
              className="mt-4 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Process data
            </button>
            {parseErrors.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-red-600">
                {parseErrors.map((err) => (
                  <li key={err}>• {err}</li>
                ))}
              </ul>
            )}
            {!processedPoints && preview.points.length > 0 && parseErrors.length === 0 && (
              <p className="mt-3 text-xs text-slate-400">
                {preview.points.length} row{preview.points.length !== 1 ? "s" : ""}{" "}
                detected — press &ldquo;Process data&rdquo; to continue.
              </p>
            )}
          </section>

          {processedPoints && (
            <section>
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                  2
                </span>
                <h3 className="text-sm font-semibold text-slate-950">
                  Processed data
                </h3>
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[28%]" />
                    <col className="w-[22%]" />
                    <col className="w-[22%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2.5 font-medium text-slate-600">
                        Concentration
                      </th>
                      <th className="px-3 py-2.5 font-medium text-slate-600">
                        Mean response
                      </th>
                      <th className="px-3 py-2.5 font-medium text-slate-600">
                        Replicates
                      </th>
                      <th className="px-3 py-2.5 font-medium text-slate-600">
                        SEM
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedPoints.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="truncate px-3 py-2.5 font-mono text-slate-800">
                          {formatSci(row.concentration)}
                        </td>
                        <td className="truncate px-3 py-2.5 font-mono text-slate-800">
                          {formatSci(row.response)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {row.responses?.length ?? 1}
                        </td>
                        <td className="truncate px-3 py-2.5 font-mono text-slate-500">
                          {row.sem !== undefined ? formatSci(row.sem) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={handleCalculate}
                disabled={isCalculating}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-75"
              >
                {isCalculating ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Calculating...</span>
                  </>
                ) : (
                  "Calculate IC₅₀"
                )}
              </button>
            </section>
          )}
        </div>

        {processedPoints && (
          <div className="min-w-0">
            {fitResult ? (
              <section>
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-slate-950">Results</h3>
                </div>

                {/* Extrapolation Scientific Warning Box */}
                {fitResult.isExtrapolated && (
                  <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <svg
                        className="h-5 w-5 shrink-0 text-amber-600 mt-0.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                          Extrapolation Warning (50% Response Not Bracketed)
                        </h4>
                        <p className="mt-1 text-xs leading-5 text-amber-900">
                          Your tested concentrations produced responses ranging from{" "}
                          <strong>{formatSci(fitResult.minObserved)}%</strong> to{" "}
                          <strong>{formatSci(fitResult.maxObserved)}%</strong>, which does not encompass 50% growth inhibition.
                          Calculating IC₅₀ by extrapolating beyond the tested data range is scientifically unrecommended.
                        </p>
                        <p className="mt-2 text-xs font-semibold text-amber-950">
                          🔬 <strong>Recommendation:</strong> Repeat the experiment with a modified concentration range that brackets 50% (from &lt; 50% to &gt; 50%).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {fitResult.interpolatedIc50 !== undefined &&
                  fitResult.interpolatedIc50 !== null && (
                    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 flex items-center justify-between shadow-2xs">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                          IC₅₀ (50% Response / Interpolated)
                        </p>
                        <p className="text-xl font-extrabold tracking-tight text-amber-950 mt-0.5">
                          {formatSci(fitResult.interpolatedIc50)}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-200 px-3 py-1 text-[11px] font-bold text-amber-900">
                        Target 50%
                      </span>
                    </div>
                  )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      4PL IC₅₀
                    </p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                      {formatSci(fitResult.params.ic50)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Hill Slope
                    </p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                      {formatSci(fitResult.params.hill)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Bottom
                    </p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                      {formatSci(fitResult.params.bottom)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Top
                    </p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                      {formatSci(fitResult.params.top)}
                    </p>
                  </div>
                </div>

                {/* Dose Response Chart Card */}
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Dose–response curve
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        % Growth Inhibition vs concentration (log scale)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChartExpanded(true)}
                    className="mt-3 block w-full cursor-zoom-in rounded-xl transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    aria-label="Enlarge dose-response curve"
                  >
                    <DoseResponseChart
                      points={processedPoints}
                      fit={fitResult}
                      svgId="ic50-main-chart"
                    />
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        4PL fit
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        R² = {formatSci(fitResult.rSquared)}
                      </p>
                    </div>
                    <p className="mt-2 font-mono text-xs leading-5 text-slate-600">
                      Y = Bottom + (Top − Bottom) / (1 + (X / IC₅₀)<sup>n</sup>)
                    </p>
                    {equation && (
                      <p className="mt-2 break-all font-mono text-[11px] leading-5 text-slate-500">
                        {equation}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Predicted vs observed
                    </p>
                    <div className="mt-2">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="pb-1.5 pr-3 font-medium">[X]</th>
                            <th className="pb-1.5 pr-3 font-medium">Observed</th>
                            <th className="pb-1.5 font-medium">Predicted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {processedPoints.map((point, i) => (
                            <tr
                              key={i}
                              className="border-t border-slate-100 font-mono text-slate-700"
                            >
                              <td className="py-1 pr-3">
                                {formatSci(point.concentration)}
                              </td>
                              <td className="py-1 pr-3">
                                {formatSci(point.response)}
                              </td>
                              <td className="py-1">
                                {formatSci(fourPL(point.concentration, fitResult.params))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {chartExpanded && (
                  <ChartLightbox
                    points={processedPoints}
                    fit={fitResult}
                    onClose={() => setChartExpanded(false)}
                  />
                )}
              </section>
            ) : (
              <section className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Ready to calculate
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Press &ldquo;Calculate IC₅₀&rdquo; on the left to fit the curve
                    and view results here.
                  </p>
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Redesigned 2-Card Citation & Version Section in CellsInVitro Theme */}
      <IC50MethodCitationCards />
    </div>
  );
}
