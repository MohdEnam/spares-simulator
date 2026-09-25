export const WEEKS_PER_YEAR = 52;
export const HOURS_PER_YEAR = 8760;

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

const LANCZOS_G = 7;
const LANCZOS_C = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
] as const;

/** Lanczos approximation of ln(Gamma(x)) for x > 0. */
export function lnGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const z = x - 1;
  let a = LANCZOS_C[0];
  const t = z + LANCZOS_G + 0.5;
  for (let i = 1; i < LANCZOS_C.length; i++) a += (LANCZOS_C[i] ?? 0) / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** log P(X = k) for X ~ Poisson(lambda), computed in log space. */
export function poissonLogPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 0 : -Infinity;
  return k * Math.log(lambda) - lambda - lnGamma(k + 1);
}

export function poissonCdf(k: number, lambda: number): number {
  if (k < 0) return 0;
  const n = Math.floor(k);
  let sum = 0;
  for (let i = 0; i <= n; i++) sum += Math.exp(poissonLogPmf(i, lambda));
  return Math.min(sum, 1);
}

/** Upper bound for stock searches: ceil(lambda + 10*sqrt(lambda) + 20). */
export function stockSearchLimit(lambda: number): number {
  return Math.ceil(lambda + 10 * Math.sqrt(Math.max(0, lambda)) + 20);
}

/**
 * Smallest S >= 1 with poissonCdf(S - 1, lambda) >= targetFillRate.
 * One pass, accumulating the pmf. Returns null if none found within the search limit.
 */
export function recommendedStock(lambda: number, targetFillRate: number): number | null {
  const max = stockSearchLimit(lambda);
  let cdf = 0;
  for (let s = 1; s <= max; s++) {
    cdf = Math.min(1, cdf + Math.exp(poissonLogPmf(s - 1, lambda)));
    if (cdf >= targetFillRate) return s;
  }
  return null;
}

/** Smallest S with poissonCdf(S, lambda) >= level (cycle-service basis); null if none found. */
export function stockForCycleServiceLevel(lambda: number, level: number): number | null {
  const max = stockSearchLimit(lambda);
  let cdf = 0;
  for (let s = 0; s <= max; s++) {
    cdf = Math.min(1, cdf + Math.exp(poissonLogPmf(s, lambda)));
    if (cdf >= level) return Math.max(1, s);
  }
  return null;
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
  /** null when no stock level was found within the search limit. */
  stock: number | null;
  reorderPoint: number | null;
  safetyStock: number | null;
  achievedFillRate: number | null;
  cycleServiceLevel: number | null;
  capital: number | null;
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
    reorderPoint: s === null ? null : s - 1,
    safetyStock: s === null ? null : s - lambda,
    achievedFillRate: s === null ? null : poissonCdf(s - 1, lambda),
    cycleServiceLevel: s === null ? null : poissonCdf(s, lambda),
    capital: s === null ? null : s * input.unitCost,
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

/** Independent per-class seed: seed*3 + (classIndex+1). 0=drives, 1=PSUs, 2=optics. */
export function classSeed(seed: number, classIndex: number): number {
  if (classIndex === 3) return gpuClassSeed(seed); // GPUs: seed*3 + 1000003
  return seed * 3 + classIndex + 1;
}

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

/** Knuth's method for one chunk (mean <= 30). */
function knuthSample(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

export const POISSON_SAMPLE_CHUNK = 30;

/** Poisson draw; means above 30 are split into ceil(mean/30) equal Knuth chunks and summed. */
export function poissonSample(lambda: number, rng: () => number): number {
  if (!(lambda > 0)) return 0;
  if (lambda <= POISSON_SAMPLE_CHUNK) return knuthSample(lambda, rng);
  const chunks = Math.ceil(lambda / POISSON_SAMPLE_CHUNK);
  const part = lambda / chunks;
  let total = 0;
  for (let i = 0; i < chunks; i++) total += knuthSample(part, rng);
  return total;
}

export interface SimResult {
  totalFailures: number;
  filled: number;
  stockouts: number;
  fillRate: number;
  minOnHand: number;
  weeksWithStockout: number;
  onHandSeries: number[];
  /** Per counted year (after warm-up): failures and filled-from-shelf. */
  yearlyFailures: number[];
  yearlyFilled: number[];
}

export const SIM_DAYS_PER_YEAR = 364;
export const DAYS_PER_WEEK = 7;

/**
 * Daily-step simulation. `days` and `warmupDays` are in days; on-hand series
 * records the level at the end of each (counted or not) week.
 */
export function simulate(
  input: PartInputs,
  stock: number,
  days: number,
  seed: number,
  warmupDays = 0,
  recordSeries = true,
): SimResult {
  const rng = mulberry32(seed);
  const dailyRate = (input.fleetSize * input.afr) / SIM_DAYS_PER_YEAR;
  const lead = Math.max(1, Math.round(input.leadTimeWeeks * DAYS_PER_WEEK));
  let onHand = stock;
  let backorders = 0;
  const arrivals = new Map<number, number>();
  const series: number[] = [];
  let totalFailures = 0;
  let filled = 0;
  let stockouts = 0;
  let minOnHand = stock;
  let weeksWithStockout = 0;
  let weekStockout = false;
  const yearlyFailures: number[] = [];
  const yearlyFilled: number[] = [];

  for (let d = 0; d < days; d++) {
    const due = arrivals.get(d) ?? 0;
    if (due) {
      arrivals.delete(d);
      let incoming = due;
      while (backorders > 0 && incoming > 0) {
        backorders--;
        incoming--;
      }
      onHand += incoming;
    }
    const counting = d >= warmupDays;
    const yi = Math.floor((d - warmupDays) / SIM_DAYS_PER_YEAR);
    const failures = poissonSample(dailyRate, rng);
    for (let f = 0; f < failures; f++) {
      if (counting) {
        totalFailures++;
        yearlyFailures[yi] = (yearlyFailures[yi] ?? 0) + 1;
      }
      if (onHand > 0) {
        onHand--;
        if (counting) {
          filled++;
          yearlyFilled[yi] = (yearlyFilled[yi] ?? 0) + 1;
        }
      } else {
        backorders++;
        if (counting) {
          stockouts++;
          weekStockout = true;
        }
      }
      const arriveAt = d + lead;
      arrivals.set(arriveAt, (arrivals.get(arriveAt) ?? 0) + 1);
    }
    if (counting && onHand < minOnHand) minOnHand = onHand;
    if ((d + 1) % DAYS_PER_WEEK === 0) {
      if (weekStockout) weeksWithStockout++;
      weekStockout = false;
      if (recordSeries) series.push(onHand);
    }
  }

  return {
    totalFailures,
    filled,
    stockouts,
    fillRate: totalFailures > 0 ? filled / totalFailures : 1,
    minOnHand,
    weeksWithStockout,
    onHandSeries: series,
    yearlyFailures,
    yearlyFilled,
  };
}

export interface ScenarioSummary {
  avgFillRate: number;
  pctYearsMeetingTarget: number;
  worstYearFillRate: number;
  avgStockoutsPerYear: number;
}

/** Seed for scenario i (0-based index i+1 used as offset): seed*1000 + i. */
export function scenarioSeed(seed: number, scenario: number): number {
  return seed * 1000 + scenario;
}

/**
 * Run independent scenarios of `years` each, with a warm-up of the lead time in days
 * (not counted). Scenario i uses classSeed(seed*1000 + i, classIndex).
 */
export function simulateScenarios(
  input: PartInputs,
  stock: number,
  targetFillRate: number,
  years: number,
  scenarios: number,
  seed: number,
  classIndex: number,
): ScenarioSummary {
  const warmup = Math.max(1, Math.round(input.leadTimeWeeks * DAYS_PER_WEEK));
  const weeks = years * SIM_DAYS_PER_YEAR; // days
  let totFail = 0;
  let totFilled = 0;
  let yearsMet = 0;
  let yearCount = 0;
  let worst = 1;
  for (let i = 1; i <= scenarios; i++) {
    const sim = simulate(input, stock, warmup + weeks, classSeed(scenarioSeed(seed, i), classIndex), warmup, false);
    totFail += sim.totalFailures;
    totFilled += sim.filled;
    for (let y = 0; y < years; y++) {
      const f = sim.yearlyFailures[y] ?? 0;
      const fr = f > 0 ? (sim.yearlyFilled[y] ?? 0) / f : 1;
      if (fr >= targetFillRate) yearsMet++;
      if (fr < worst) worst = fr;
      yearCount++;
    }
  }
  return {
    avgFillRate: totFail > 0 ? totFilled / totFail : 1,
    pctYearsMeetingTarget: yearCount > 0 ? yearsMet / yearCount : 1,
    worstYearFillRate: worst,
    avgStockoutsPerYear: yearCount > 0 ? (totFail - totFilled) / yearCount : 0,
  };
}

/* ---------------- GPUs ---------------- */

export const GPU_SIM_SEED_OFFSET = 1000003;

/** Independent GPU stream seed: seed*3 + 1000003. */
export function gpuClassSeed(seed: number): number {
  return seed * 3 + GPU_SIM_SEED_OFFSET;
}

export function gpuAfrFromInterruptions(interruptions: number, clusterGpus: number, days: number): number {
  return ((interruptions / clusterGpus) * 365) / days;
}

/** One GPU failure takes the whole board out. */
export function boardAfr(gpuAfr: number, gpusPerBoard: number): number {
  return 1 - Math.pow(1 - gpuAfr, gpusPerBoard);
}

export type GpuSparingUnit = "module" | "board";

export interface GpuParams {
  gpusInstalled: number;
  gpusPerBoard: number;
  boardPrice: number;
  gpuAfr: number;
  leadTimeWeeks: number;
  targetFillRate: number;
}

export function gpuPartInputs(p: GpuParams, unit: GpuSparingUnit): PartInputs {
  if (unit === "module") {
    return {
      fleetSize: p.gpusInstalled,
      afr: p.gpuAfr,
      leadTimeWeeks: p.leadTimeWeeks,
      targetFillRate: p.targetFillRate,
      unitCost: p.boardPrice / p.gpusPerBoard,
    };
  }
  return {
    fleetSize: p.gpusInstalled / p.gpusPerBoard,
    afr: boardAfr(p.gpuAfr, p.gpusPerBoard),
    leadTimeWeeks: p.leadTimeWeeks,
    targetFillRate: p.targetFillRate,
    unitCost: p.boardPrice,
  };
}

export interface GpuUnitComparison {
  gpuAfr: number;
  moduleStock: number | null;
  moduleCapital: number | null;
  boardAfr: number;
  boardStock: number | null;
  boardCapital: number | null;
}

export function compareGpuSparingUnits(p: GpuParams): GpuUnitComparison {
  const m = computePart(gpuPartInputs(p, "module"));
  const b = computePart(gpuPartInputs(p, "board"));
  return {
    gpuAfr: p.gpuAfr,
    moduleStock: m.stock,
    moduleCapital: m.capital,
    boardAfr: boardAfr(p.gpuAfr, p.gpusPerBoard),
    boardStock: b.stock,
    boardCapital: b.capital,
  };
}
