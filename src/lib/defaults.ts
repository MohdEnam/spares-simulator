import { afrFromMtbf } from "./sparesModel";

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
}

export const DEFAULTS: FormState = {
  drives: { fleetSize: 500, afrPct: 1.36, leadTimeWeeks: 12, targetFillPct: 95, unitCost: 1079.99 },
  psus: { fleetSize: 400, mtbfHours: 500000, leadTimeWeeks: 8, targetFillPct: 95, unitCost: 531.16 },
  optics: { fleetSize: 1000, afrPct: 2.0, leadTimeWeeks: 16, targetFillPct: 95, pricing: "generic" },
};

export const psuAfr = (mtbfHours: number) => afrFromMtbf(mtbfHours);
