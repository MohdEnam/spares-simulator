export const WEEKS_PER_YEAR = 52;
export const HOURS_PER_YEAR = 8760;
export const MAX_STOCK_SEARCH = 1000;

export interface PartInputs {
  fleetSize: number;
  afr: number; // decimal
  leadTimeWeeks: number;
  targetFillRate: number; // decimal
  unitCost: number;
}

export function afrFromMtbf(mtbfHours: number): number {
  return 1 - Math.exp(-HOURS_PER_YEAR / mtbfHours);
}

export function expectedFailuresPerYear(fleetSize: number, afr: number): number {
  return fleetSize * afr;
}

export function leadTimeDemand(
  fleetSize: number,
  afr: number,
  leadTimeWeeks: number,
): number {
  return (expectedFailuresPerYear(fleetSize, afr) * leadTimeWeeks) / WEEKS_PER_YEAR;
}

export function poissonCdf(k: number, lambda: number): number {
  if (k < 0) return 0;
  const n = Math.floor(k);
  let term = Math.exp(-lambda);
  let sum = term;
  for (let i = 1; i <= n; i++) {
    term = (term * lambda) / i;
    sum += term;
  }
  return Math.min(sum, 1);
}

/** Smallest S >= 1 with poissonCdf(S - 1, lambda) >= targetFillRate */
export function recommendedStock(lambda: number, targetFillRate: number): number {
  for (let s = 1; s <= MAX_STOCK_SEARCH; s++) {
    if (poissonCdf(s - 1, lambda) >= targetFillRate) return s;
  }
  return MAX_STOCK_SEARCH;
}

/** Smallest S with poissonCdf(S, lambda) >= level (cycle-service basis) */
export function stockForCycleServiceLevel(lambda: number, level: number): number {
  for (let s = 0; s <= MAX_STOCK_SEARCH; s++) {
    if (poissonCdf(s, lambda) >= level) return Math.max(1, s);
  }
  return MAX_STOCK_SEARCH;
}

/** Acklam's rational approximation of the inverse standard normal CDF. */
export function inverseStandardNormal(p: number): number {
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ] as const;
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ] as const;
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ] as const;
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ] as const;
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

export function normalStock(lambda: number, targetFillRate: number): number {
  const z = inverseStandardNormal(targetFillRate);
  return Math.max(1, Math.ceil(lambda + z * Math.sqrt(lambda)) + 1);
}

export interface PartResult {
  expectedFailuresPerYear: number;
  lambda: number;
  stock: number;
  reorderPoint: number;
  safetyStock: number;
  achievedFillRate: number;
  cycleServiceLevel: number;
  capital: number;
  normalStock: number;
  normalFillRate: number;
}

export function computePart(input: PartInputs): PartResult {
  const failures = expectedFailuresPerYear(input.fleetSize, input.afr);
  const lambda = leadTimeDemand(input.fleetSize, input.afr, input.leadTimeWeeks);
  const s = recommendedStock(lambda, input.targetFillRate);
  const sNormal = normalStock(lambda, input.targetFillRate);
  return {
    expectedFailuresPerYear: failures,
    lambda,
    stock: s,
    reorderPoint: s - 1,
    safetyStock: s - lambda,
    achievedFillRate: poissonCdf(s - 1, lambda),
    cycleServiceLevel: poissonCdf(s, lambda),
    capital: s * input.unitCost,
    normalStock: sNormal,
    normalFillRate: poissonCdf(sNormal - 1, lambda),
  };
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validatePart(
  input: PartInputs & { mtbfHours?: number },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!(input.fleetSize > 0)) issues.push({ field: "fleetSize", message: "Fleet size must be greater than 0" });
  if (!(input.leadTimeWeeks > 0)) issues.push({ field: "leadTimeWeeks", message: "Lead time must be greater than 0" });
  if (input.mtbfHours !== undefined && !(input.mtbfHours > 0))
    issues.push({ field: "mtbfHours", message: "MTBF must be greater than 0" });
  if (!(input.targetFillRate >= 0.5 && input.targetFillRate <= 0.999))
    issues.push({ field: "targetFillRate", message: "Target fill rate must be between 50% and 99.9%" });
  if (!(input.afr > 0)) issues.push({ field: "afr", message: "Annual failure rate must be greater than 0" });
  if (!(input.unitCost >= 0)) issues.push({ field: "unitCost", message: "Unit cost cannot be negative" });
  return issues;
}

/* ---------------- simulation ---------------- */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Knuth's method — fine for small lambda. */
export function poissonSample(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

export interface SimResult {
  totalFailures: number;
  filled: number;
  stockouts: number;
  fillRate: number;
  minOnHand: number;
  weeksWithStockout: number;
  onHandSeries: number[];
}

export function simulate(
  input: PartInputs,
  stock: number,
  weeks: number,
  seed: number,
  warmupWeeks = 0,
  recordSeries = true,
): SimResult {
  const rng = mulberry32(seed);
  const weeklyRate = (input.fleetSize * input.afr) / WEEKS_PER_YEAR;
  const lead = Math.max(1, Math.round(input.leadTimeWeeks));
  let onHand = stock;
  let backorders = 0;
  const arrivals = new Map<number, number>();
  const series: number[] = [];
  let totalFailures = 0;
  let filled = 0;
  let stockouts = 0;
  let minOnHand = stock;
  let weeksWithStockout = 0;

  for (let w = 0; w < weeks; w++) {
    const due = arrivals.get(w) ?? 0;
    if (due) {
      arrivals.delete(w);
      let incoming = due;
      while (backorders > 0 && incoming > 0) {
        backorders--;
        incoming--;
      }
      onHand += incoming;
    }
    const failures = poissonSample(weeklyRate, rng);
    let weekStockout = false;
    for (let f = 0; f < failures; f++) {
      const counting = w >= warmupWeeks;
      if (counting) totalFailures++;
      if (onHand > 0) {
        onHand--;
        if (counting) filled++;
      } else {
        backorders++;
        weekStockout = true;
        if (counting) stockouts++;
      }
      const arriveAt = w + lead;
      arrivals.set(arriveAt, (arrivals.get(arriveAt) ?? 0) + 1);
    }
    if (w >= warmupWeeks) {
      if (onHand < minOnHand) minOnHand = onHand;
      if (weekStockout) weeksWithStockout++;
    }
    if (recordSeries) series.push(onHand);
  }

  return {
    totalFailures,
    filled,
    stockouts,
    fillRate: totalFailures > 0 ? filled / totalFailures : 1,
    minOnHand,
    weeksWithStockout,
    onHandSeries: series,
  };
}
