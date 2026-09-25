import { afrFromMtbf, gpuAfrFromInterruptions, type GpuParams, type GpuSparingUnit } from "./sparesModel";

export const OPTICS_PRICES = { generic: 919.0, branded: 4141.54 } as const;
export type OpticsPricing = keyof typeof OPTICS_PRICES;

export interface FormState {
  drives: {
    fleetSize: number;
    afrPct: number;
    leadTimeWeeks: number;
    targetFillPct: number;
    unitCost: number;
  };
  psus: {
    fleetSize: number;
    mtbfHours: number;
    leadTimeWeeks: number;
    targetFillPct: number;
    unitCost: number;
  };
  optics: {
    fleetSize: number;
    afrPct: number;
    leadTimeWeeks: number;
    targetFillPct: number;
    pricing: OpticsPricing;
  };
  gpus: {
    gpusInstalled: number;
    unit: GpuSparingUnit;
    gpusPerBoard: number;
    boardPrice: number;
    leadTimeWeeks: number;
    targetFillPct: number;
  };
}

export const DEFAULTS: FormState = {
  drives: { fleetSize: 500, afrPct: 1.36, leadTimeWeeks: 12, targetFillPct: 95, unitCost: 1079.99 },
  psus: { fleetSize: 400, mtbfHours: 500000, leadTimeWeeks: 8, targetFillPct: 95, unitCost: 531.16 },
  optics: { fleetSize: 1000, afrPct: 2.0, leadTimeWeeks: 16, targetFillPct: 95, pricing: "generic" },
  gpus: { gpusInstalled: 1024, unit: "module", gpusPerBoard: 8, boardPrice: 179000, leadTimeWeeks: 8, targetFillPct: 95 },
};

/** Meta Llama 3 run: 148 faulty GPU + 72 HBM3 interruptions, 16,384 GPUs, 54 days. */
export const GPU_INTERRUPTIONS = 148 + 72;
export const GPU_CLUSTER = 16384;
export const GPU_DAYS = 54;
export const GPU_AFR = gpuAfrFromInterruptions(GPU_INTERRUPTIONS, GPU_CLUSTER, GPU_DAYS);

export const gpuParams = (g: FormState["gpus"]): GpuParams => ({
  gpusInstalled: g.gpusInstalled,
  gpusPerBoard: g.gpusPerBoard,
  boardPrice: g.boardPrice,
  gpuAfr: GPU_AFR,
  leadTimeWeeks: g.leadTimeWeeks,
  targetFillRate: g.targetFillPct / 100,
});

export const psuAfr = (mtbfHours: number) => afrFromMtbf(mtbfHours);
