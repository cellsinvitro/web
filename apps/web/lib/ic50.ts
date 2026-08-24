export type DataPoint = {
  concentration: number;
  response: number;
  responses?: number[];
  sem?: number;
};

export type FourPLParams = {
  bottom: number;
  top: number;
  ic50: number;
  hill: number;
};

export type FitResult = {
  params: FourPLParams;
  rSquared: number;
  residuals: number[];
};

export function fourPL(x: number, params: FourPLParams): number {
  const { bottom, top, ic50, hill } = params;
  if (x <= 0) return top;
  return bottom + (top - bottom) / (1 + Math.pow(x / ic50, hill));
}

export function parseDataInput(raw: string): {
  points: DataPoint[];
  errors: string[];
} {
  const errors: string[] = [];
  const lines = raw
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { points: [], errors: ["Enter at least one row of data."] };
  }

  const points: DataPoint[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i]!
      .split(/[\t,;]+|\s{2,}/)
      .map((c) => c.trim())
      .filter(Boolean);

    if (cols.length < 2) {
      errors.push(`Row ${i + 1}: need concentration and at least one response value.`);
      continue;
    }

    const concentration = Number.parseFloat(cols[0]!);
    if (!Number.isFinite(concentration) || concentration < 0) {
      errors.push(`Row ${i + 1}: invalid concentration "${cols[0]}".`);
      continue;
    }

    const responses: number[] = [];
    for (let j = 1; j < cols.length; j++) {
      const value = Number.parseFloat(cols[j]!);
      if (!Number.isFinite(value)) {
        errors.push(`Row ${i + 1}: invalid response "${cols[j]}".`);
      } else {
        responses.push(value);
      }
    }

    if (responses.length === 0) continue;

    const mean = responses.reduce((a, b) => a + b, 0) / responses.length;
    const sem =
      responses.length > 1
        ? Math.sqrt(
            responses.reduce((sum, r) => sum + (r - mean) ** 2, 0) /
              (responses.length * (responses.length - 1))
          )
        : undefined;

    points.push({
      concentration,
      response: mean,
      responses,
      sem,
    });
  }

  points.sort((a, b) => a.concentration - b.concentration);

  if (points.length < 4) {
    errors.push("At least 4 valid data points are required for curve fitting.");
  }

  return { points, errors };
}

function sumSquaredError(
  points: DataPoint[],
  bottom: number,
  top: number,
  logIc50: number,
  logHill: number
): number {
  const ic50 = Math.exp(logIc50);
  const hill = Math.exp(logHill);
  const params = { bottom, top, ic50, hill };

  return points.reduce((sum, point) => {
    const predicted = fourPL(point.concentration, params);
    return sum + (point.response - predicted) ** 2;
  }, 0);
}

function nelderMead(
  fn: (params: number[]) => number,
  start: number[],
  maxIter = 8000,
  tol = 1e-10
): number[] {
  const n = start.length;
  const simplex: number[][] = [start.slice()];
  const step = 0.05;

  for (let i = 0; i < n; i++) {
    const point = start.slice();
    point[i] = point[i]! + (point[i]! === 0 ? step : point[i]! * step);
    simplex.push(point);
  }

  const alpha = 1;
  const gamma = 2;
  const rho = 0.5;
  const sigma = 0.5;

  const values = simplex.map((p) => fn(p));

  for (let iter = 0; iter < maxIter; iter++) {
    const order = values
      .map((v, i) => ({ v, i }))
      .sort((a, b) => a.v - b.v)
      .map((x) => x.i);

    const best = order[0]!;
    const worst = order[n]!;
    const secondWorst = order[n - 1]!;

    const range = Math.max(...values) - Math.min(...values);
    if (range < tol) break;

    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      if (i === worst) continue;
      for (let j = 0; j < n; j++) {
        centroid[j]! += simplex[i]![j]!;
      }
    }
    for (let j = 0; j < n; j++) centroid[j]! /= n;

    const reflected = centroid.map((c, j) => c + alpha * (c - simplex[worst]![j]!));
    const fReflected = fn(reflected);

    if (fReflected < values[best]! && fReflected < values[secondWorst]!) {
      const expanded = centroid.map((c, j) => c + gamma * (reflected[j]! - c));
      const fExpanded = fn(expanded);
      if (fExpanded < fReflected) {
        simplex[worst] = expanded;
        values[worst] = fExpanded;
      } else {
        simplex[worst] = reflected;
        values[worst] = fReflected;
      }
    } else if (fReflected < values[secondWorst]!) {
      simplex[worst] = reflected;
      values[worst] = fReflected;
    } else {
      const contracted = centroid.map((c, j) => c + rho * (simplex[worst]![j]! - c));
      const fContracted = fn(contracted);
      if (fContracted < values[worst]!) {
        simplex[worst] = contracted;
        values[worst] = fContracted;
      } else {
        for (let i = 0; i <= n; i++) {
          if (i === best) continue;
          simplex[i] = simplex[best]!.map((b, j) => b + sigma * (simplex[i]![j]! - b));
          values[i] = fn(simplex[i]!);
        }
      }
    }
  }

  let bestIdx = 0;
  for (let i = 1; i <= n; i++) {
    if (values[i]! < values[bestIdx]!) bestIdx = i;
  }
  return simplex[bestIdx]!;
}

function initialGuess(points: DataPoint[]): FourPLParams {
  const ys = points.map((p) => p.response);
  const xs = points.map((p) => p.concentration).filter((x) => x > 0);

  const bottom = Math.min(...ys);
  const top = Math.max(...ys);
  const mid = (top + bottom) / 2;

  let ic50 = xs.length > 0 ? xs[Math.floor(xs.length / 2)]! : 1;
  let bestDist = Infinity;
  for (const point of points) {
    if (point.concentration <= 0) continue;
    const dist = Math.abs(point.response - mid);
    if (dist < bestDist) {
      bestDist = dist;
      ic50 = point.concentration;
    }
  }

  return { bottom, top, ic50: Math.max(ic50, 1e-12), hill: 1 };
}

export function fitFourPL(points: DataPoint[]): FitResult | null {
  if (points.length < 4) return null;

  const guess = initialGuess(points);
  const starts: FourPLParams[] = [
    guess,
    { ...guess, hill: 0.5 },
    { ...guess, hill: 2 },
    { bottom: 0, top: guess.top, ic50: guess.ic50, hill: 1 },
  ];

  let bestParams = guess;
  let bestSSE = Infinity;

  for (const start of starts) {
    const result = nelderMead(
      (p) =>
        sumSquaredError(points, p[0]!, p[1]!, p[2]!, p[3]!),
      [start.bottom, start.top, Math.log(start.ic50), Math.log(start.hill)]
    );

    const params: FourPLParams = {
      bottom: result[0]!,
      top: result[1]!,
      ic50: Math.exp(result[2]!),
      hill: Math.exp(result[3]!),
    };

    const sse = points.reduce((sum, point) => {
      const predicted = fourPL(point.concentration, params);
      return sum + (point.response - predicted) ** 2;
    }, 0);

    if (sse < bestSSE) {
      bestSSE = sse;
      bestParams = params;
    }
  }

  const meanY = points.reduce((s, p) => s + p.response, 0) / points.length;
  const ssTot = points.reduce((s, p) => s + (p.response - meanY) ** 2, 0);
  const rSquared = ssTot > 0 ? 1 - bestSSE / ssTot : 0;

  const residuals = points.map(
    (p) => p.response - fourPL(p.concentration, bestParams)
  );

  return { params: bestParams, rSquared, residuals };
}

export function formatSci(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 10_000 || (abs < 0.001 && abs > 0)) {
    return value.toExponential(digits);
  }
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export function generateCurvePoints(
  params: FourPLParams,
  xMin: number,
  xMax: number,
  count = 100
): { x: number; y: number }[] {
  const logMin = Math.log10(Math.max(xMin, 1e-12));
  const logMax = Math.log10(Math.max(xMax, 1e-12));
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= count; i++) {
    const logX = logMin + (i / count) * (logMax - logMin);
    const x = Math.pow(10, logX);
    points.push({ x, y: fourPL(x, params) });
  }

  return points;
}
