import { DEFAULTS, GPU_AFR, OPTICS_PRICES, gpuParams, psuAfr } from "./defaults";
import {
  afrFromMtbf,
  boardAfr,
  compareGpuSparingUnits,
  computePart,
  gpuPartInputs,
  leadTimeDemand,
  recommendedStock,
  stockForCycleServiceLevel,
  type PartInputs,
} from "./sparesModel";

export interface CheckLine {
  label: string;
  expected: string;
  actual: string;
  pass: boolean;
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

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

  const allGeneric = driveOpticsGeneric + p.capital + gm.capital;
  const allBranded = driveOpticsBranded + p.capital + gm.capital;
  add("All-classes capital, Module (generic)", "509,883.59", allGeneric.toFixed(2), near(allGeneric, 509883.59, 0.01));
  add("All-classes capital, Module (branded)", "545,331.53", allBranded.toFixed(2), near(allBranded, 545331.53, 0.01));

  return lines;
}
