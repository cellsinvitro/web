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

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

function getYDomain(points: DataPoint[], fit: FitResult) {
  const observedYs = points.map((p) => p.response);
  const dataMin = Math.min(...observedYs, fit.params.bottom);
  const dataMax = Math.max(...observedYs, fit.params.top);
  const ySpan = Math.max(dataMax - dataMin, 1);
  const yPad = ySpan * 0.06;
  return { yMin: dataMin - yPad, yMax: dataMax + yPad };
}

function DoseResponseChart({
  points,
  fit,
  width = 640,
  height = 240,
  className = "aspect-[8/3] h-auto w-full",
}: {
  points: DataPoint[];
  fit: FitResult;
  width?: number;
  height?: number;
  className?: string;
}) {
  const large = width > 700;
  const pad = { top: 16, right: 20, bottom: 36, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const positiveX = points.map((p) => p.concentration).filter((x) => x > 0);
  const xMin = Math.min(...positiveX) / 3;
  const xMax = Math.max(...positiveX) * 3;
  const { yMin, yMax } = getYDomain(points, fit);

  const xScale = (x: number) =>
    pad.left + (Math.log10(x) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin)) * plotW;
  const yScale = (y: number) =>
    pad.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  const curve = generateCurvePoints(fit.params, xMin, xMax, 80);
  const curvePath = curve
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.x).toFixed(1)} ${yScale(p.y).toFixed(1)}`)
    .join(" ");

  const ic50X = xScale(fit.params.ic50);
  const ic50Y = yScale((fit.params.top + fit.params.bottom) / 2);

  const xTicks = [xMin, xMin * 10, xMin * 100, xMax].filter(
    (v, i, arr) => arr.indexOf(v) === i && v > 0
  );

  const tickClass = large ? "fill-slate-400 text-xs" : "fill-slate-400 text-[10px]";
  const axisClass = large ? "fill-slate-600 text-sm font-medium" : "fill-slate-600 text-[11px] font-medium";
  const labelClass = large ? "fill-slate-500 text-xs" : "fill-slate-500 text-[10px]";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="Dose-response curve with fitted 4PL model"
    >
      <rect
        x={pad.left}
        y={pad.top}
        width={plotW}
        height={plotH}
        fill="#f8fafc"
        rx="8"
      />

      {[0, 0.5, 1].map((t) => {
        const y = yMin + t * (yMax - yMin);
        return (
          <g key={t}>
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
        );
      })}

      {xTicks.map((x) => (
        <text
          key={x}
          x={xScale(x)}
          y={height - 14}
          textAnchor="middle"
          className={tickClass}
        >
          {formatSci(x)}
        </text>
      ))}

      <text
        x={pad.left + plotW / 2}
        y={height - 4}
        textAnchor="middle"
        className={axisClass}
      >
        Concentration
      </text>

      <path d={curvePath} fill="none" stroke="#0f172a" strokeWidth={large ? 2.5 : 2} />

      <line
        x1={ic50X}
        y1={pad.top}
        x2={ic50X}
        y2={pad.top + plotH}
        stroke="#94a3b8"
        strokeDasharray="5 4"
        strokeWidth="1"
      />
      <circle cx={ic50X} cy={ic50Y} r={large ? 5 : 4} fill="#0f172a" />
      <text
        x={ic50X + 6}
        y={pad.top + 14}
        className={labelClass}
      >
        IC₅₀
      </text>

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
    </svg>
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
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Dose–response curve
            </p>
            <p className="mt-1 text-sm text-slate-500">
              IC₅₀ = {formatSci(fit.params.ic50)}
            </p>
          </div>
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
        <DoseResponseChart
          points={points}
          fit={fit}
          width={960}
          height={360}
          className="aspect-[8/3] h-auto w-full"
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

  function handleCalculate() {
    if (!processedPoints) return;
    const result = fitFourPL(processedPoints);
    setFitResult(result);
  }

  const equation = fitResult
    ? `Y = ${formatSci(fitResult.params.bottom)} + (${formatSci(fitResult.params.top)} − ${formatSci(fitResult.params.bottom)}) / (1 + (X / ${formatSci(fitResult.params.ic50)})${formatSci(fitResult.params.hill)})`
    : null;

  return (
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
            Paste or type concentration and response values. Use tabs, commas, or
            spaces between columns. Multiple response columns are averaged with
            error bars.
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
            placeholder={"Concentration\tResponse 1\tResponse 2\n0.01\t95\t94\n..."}
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
              {preview.points.length} row{preview.points.length !== 1 ? "s" : ""} detected — press
              &ldquo;Process data&rdquo; to continue.
            </p>
          )}
        </section>

        {processedPoints && (
          <section>
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                2
              </span>
              <h3 className="text-sm font-semibold text-slate-950">Processed data</h3>
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
                    <th className="px-3 py-2.5 font-medium text-slate-600">Concentration</th>
                    <th className="px-3 py-2.5 font-medium text-slate-600">Mean response</th>
                    <th className="px-3 py-2.5 font-medium text-slate-600">Replicates</th>
                    <th className="px-3 py-2.5 font-medium text-slate-600">SEM</th>
                  </tr>
                </thead>
                <tbody>
                  {processedPoints.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
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
              className="mt-4 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Calculate IC₅₀
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

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    IC₅₀
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                    {formatSci(fitResult.params.ic50)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Hill
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

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Dose–response curve
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Response vs concentration (log scale)
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">Click to enlarge</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChartExpanded(true)}
                  className="mt-3 block w-full cursor-zoom-in rounded-xl transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  aria-label="Enlarge dose-response curve"
                >
                  <DoseResponseChart points={processedPoints} fit={fitResult} />
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
                          <tr key={i} className="border-t border-slate-100 font-mono text-slate-700">
                            <td className="py-1 pr-3">{formatSci(point.concentration)}</td>
                            <td className="py-1 pr-3">{formatSci(point.response)}</td>
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
                <p className="text-sm font-medium text-slate-600">Ready to calculate</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Press &ldquo;Calculate IC₅₀&rdquo; on the left to fit the curve and view results here.
                </p>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
