import { DEFAULTS, GPU_AFR, OPTICS_PRICES, gpuParams, psuAfr } from "./defaults";
import {
  afrFromMtbf,
  boardAfr,
  compareGpuSparingUnits as compareRaw,
  computePart as computeRaw,
  poissonCdf,
  gpuPartInputs,
  leadTimeDemand,
  recommendedStock as recommendedRaw,
  stockForCycleServiceLevel as cslRaw,
  type PartInputs,
} from "./sparesModel";

export interface CheckLine {
  label: string;
  expected: string;
  actual: string;
  pass: boolean;
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const n = (v: number | null) => (v === null ? NaN : v);
const recommendedStock = (l: number, t: number) => n(recommendedRaw(l, t));
const stockForCycleServiceLevel = (l: number, t: number) => n(cslRaw(l, t));
function computePart(i: PartInputs) {
  const r = computeRaw(i);
  return {
    ...r,
    stock: n(r.stock),
    achievedFillRate: n(r.achievedFillRate),
    cycleServiceLevel: n(r.cycleServiceLevel),
    capital: n(r.capital),
  };
}
function compareGpuSparingUnits(p: Parameters<typeof compareRaw>[0]) {
  const r = compareRaw(p);
  return { ...r, moduleStock: n(r.moduleStock), boardStock: n(r.boardStock) };
}

export function defaultPartInputs() {
  const drives: PartInputs = {
    fleetSize: DEFAULTS.drives.fleetSize,
    afr: DEFAULTS.drives.afrPct / 100,
    leadTimeWeeks: DEFAULTS.drives.leadTimeWeeks,
    targetFillRate: DEFAULTS.drives.targetFillPct / 100,
    unitCost: DEFAULTS.drives.unitCost,
  };
  const psus: PartInputs = {
    fleetSize: DEFAULTS.psus.fleetSize,
    afr: psuAfr(DEFAULTS.psus.mtbfHours),
    leadTimeWeeks: DEFAULTS.psus.leadTimeWeeks,
    targetFillRate: DEFAULTS.psus.targetFillPct / 100,
    unitCost: DEFAULTS.psus.unitCost,
  };
  const optics: PartInputs = {
    fleetSize: DEFAULTS.optics.fleetSize,
    afr: DEFAULTS.optics.afrPct / 100,
    leadTimeWeeks: DEFAULTS.optics.leadTimeWeeks,
    targetFillRate: DEFAULTS.optics.targetFillPct / 100,
    unitCost: OPTICS_PRICES.generic,
  };
  return { drives, psus, optics };
}

export function runSelfCheck(): CheckLine[] {
  const { drives, psus, optics } = defaultPartInputs();
  const d = computePart(drives);
  const p = computePart(psus);
  const o = computePart(optics);
  const lines: CheckLine[] = [];
  const add = (label: string, expected: string, actual: number | string, pass: boolean) =>
    lines.push({ label, expected, actual: String(actual), pass });

  add("Drives expected failures/yr", "6.8", d.expectedFailuresPerYear.toFixed(2), near(d.expectedFailuresPerYear, 6.8, 1e-9));
  add("Drives lambda", "1.5692", d.lambda.toFixed(4), near(d.lambda, 1.5692, 1e-4));
  add("Drives recommended S", "5", d.stock, d.stock === 5);
  add("Drives achieved fill rate", "0.9780", d.achievedFillRate.toFixed(4), near(d.achievedFillRate, 0.978, 1e-4));
  add("Drives cycle service level", "0.9945", d.cycleServiceLevel.toFixed(4), near(d.cycleServiceLevel, 0.9945, 1e-4));

  const dCsl = stockForCycleServiceLevel(d.lambda, 0.95);
  add("Drives S at 95% cycle service level", "4", dCsl, dCsl === 4);

  const mtbfAfr = afrFromMtbf(500000);
  add("afrFromMtbf(500,000)", "0.017367", mtbfAfr.toFixed(6), near(mtbfAfr, 0.017367, 1e-6));

  add("PSUs lambda", "1.0688", p.lambda.toFixed(4), near(p.lambda, 1.0688, 1e-4));
  add("PSUs recommended S", "4", p.stock, p.stock === 4);

  add("Optics lambda", "6.1538", o.lambda.toFixed(4), near(o.lambda, 6.1538, 1e-4));
  add("Optics Poisson S", "11", o.stock, o.stock === 11);
  add("Optics Normal S", "12", o.normalStock, o.normalStock === 12);

  for (const [afrPct, exp] of [
    [1, 7],
    [2, 11],
    [4, 19],
  ] as const) {
    const lam = leadTimeDemand(optics.fleetSize, afrPct / 100, optics.leadTimeWeeks);
    const s = recommendedStock(lam, optics.targetFillRate);
    add(`Optics AFR ${afrPct}% -> S`, String(exp), s, s === exp);
  }

  const driveOpticsGeneric = d.capital + o.stock * OPTICS_PRICES.generic;
  const driveOpticsBranded = d.capital + o.stock * OPTICS_PRICES.branded;
  add("Drive + optics capital (generic)", "15,508.95", driveOpticsGeneric.toFixed(2), near(driveOpticsGeneric, 15508.95, 0.01));
  add("Drive + optics capital (branded)", "50,956.89", driveOpticsBranded.toFixed(2), near(driveOpticsBranded, 50956.89, 0.01));

  const gp = gpuParams(DEFAULTS.gpus);
  add("Per-GPU AFR", "0.090762", GPU_AFR.toFixed(6), near(GPU_AFR, 0.090762, 1e-6));
  const bAfr = boardAfr(GPU_AFR, gp.gpusPerBoard);
  add("Board AFR", "0.532887", bAfr.toFixed(6), near(bAfr, 0.532887, 1e-6));
  const gm = computePart(gpuPartInputs(gp, "module"));
  add("GPU module lambda", "14.2984", gm.lambda.toFixed(4), near(gm.lambda, 14.2984, 1e-4));
  add("GPU module S", "22", gm.stock, gm.stock === 22);
  add("GPU module capital", "492,250", gm.capital.toFixed(2), near(gm.capital, 492250, 0.01));
  const gb = computePart(gpuPartInputs(gp, "board"));
  add("GPU board lambda", "10.4938", gb.lambda.toFixed(4), near(gb.lambda, 10.4938, 1e-4));
  add("GPU board S", "17", gb.stock, gb.stock === 17);
  add("GPU board capital", "3,043,000", gb.capital.toFixed(2), near(gb.capital, 3043000, 0.01));
  for (const [afr, label, mExp, bExp] of [
    [0.02, "2%", 7, 7],
    [0.05, "5%", 14, 12],
    [GPU_AFR, "9.08%", 22, 17],
  ] as const) {
    const c = compareGpuSparingUnits({ ...gp, gpuAfr: afr });
    add(`GPU AFR ${label} -> module S`, String(mExp), c.moduleStock, c.moduleStock === mExp);
    add(`GPU AFR ${label} -> board S`, String(bExp), c.boardStock, c.boardStock === bExp);
  }

  for (const [label, afrPct, per, price, mS, mC, bS, bC] of [
    ["Custom (H100 values)", 9.0762, 8, 179000, 22, 492250, 17, 3043000],
    ["Custom (5%, $300k board)", 5, 8, 300000, 14, 525000, 12, 3600000],
  ] as const) {
    const cp = gpuParams({ ...DEFAULTS.gpus, model: "custom", customAfrPct: afrPct, customGpusPerBoard: per, customBoardPrice: price });
    const cm = computePart(gpuPartInputs(cp, "module"));
    const cb = computePart(gpuPartInputs(cp, "board"));
    add(`${label} module S`, String(mS), cm.stock, cm.stock === mS);
    add(`${label} module capital`, mC.toLocaleString("en-US"), cm.capital.toFixed(2), near(cm.capital, mC, 0.01));
    add(`${label} board S`, String(bS), cb.stock, cb.stock === bS);
    add(`${label} board capital`, bC.toLocaleString("en-US"), cb.capital.toFixed(2), near(cb.capital, bC, 0.01));
  }

  const allGeneric = driveOpticsGeneric + p.capital + gm.capital;
  const allBranded = driveOpticsBranded + p.capital + gm.capital;
  add("All-classes capital, Module (generic)", "509,883.59", allGeneric.toFixed(2), near(allGeneric, 509883.59, 0.01));
  add("All-classes capital, Module (branded)", "545,331.53", allBranded.toFixed(2), near(allBranded, 545331.53, 0.01));

  // Large-fleet checks (log-space Poisson, no fixed search cap)
  const big = gpuParams({ ...DEFAULTS.gpus, model: "h100", gpusInstalled: 100000, leadTimeWeeks: 8, targetFillPct: 95 });
  const bm = computePart(gpuPartInputs(big, "module"));
  add("100k GPUs module lambda", "1396.33", bm.lambda.toFixed(2), near(bm.lambda, 1396.33, 0.01));
  add("100k GPUs module S @95%", "1459", bm.stock, bm.stock === 1459);
  add("100k GPUs module fill rate", "0.9511", bm.achievedFillRate.toFixed(4), near(bm.achievedFillRate, 0.9511, 1e-4));
  const bm999 = computePart({ ...gpuPartInputs(big, "module"), targetFillRate: 0.999 });
  add("100k GPUs module S @99.9%", "1514", bm999.stock, bm999.stock === 1514);
  const bb = computePart(gpuPartInputs(big, "board"));
  add("100k GPUs board lambda", "1024.78", bb.lambda.toFixed(2), near(bb.lambda, 1024.78, 0.01));
  add("100k GPUs board S @95%", "1079", bb.stock, bb.stock === 1079);
  const s740a = recommendedStock(740, 0.95);
  const s740b = recommendedStock(740, 0.999);
  add("lambda 740 -> S @95%", "786", s740a, s740a === 786);
  add("lambda 740 -> S @99.9%", "826", s740b, s740b === 826);
  const cdfBig = poissonCdf(50000, 50000);
  add("poissonCdf(50000, 50000) ~ 0.5", "0.5012", cdfBig.toFixed(4), near(cdfBig, 0.5012, 1e-3));

  return lines;
}
