import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/spares/NumberField";
import { ResultsTable, type NamedResult } from "@/components/spares/ResultsTable";
import {
  GpuSparingUnitComparison,
  OpticsPriceComparison,
  OpticsSensitivity,
  PoissonVsNormal,
} from "@/components/spares/Comparisons";
import { SimulationPanel } from "@/components/spares/SimulationPanel";
import { SelfCheckPanel } from "@/components/spares/SelfCheckPanel";
import { DEFAULTS, GPU_AFR, OPTICS_PRICES, gpuParams, psuAfr, type FormState } from "@/lib/defaults";
import { boardAfr, computePart, gpuPartInputs, validatePart, type PartInputs } from "@/lib/sparesModel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Data Center Spares Sizing Simulator" },
      {
        name: "description",
        content:
          "Size spare drives, PSUs and optics for a data center fleet with a Poisson base-stock model, capital view and a seeded weekly simulation.",
      },
      { property: "og:title", content: "Data Center Spares Sizing Simulator" },
      {
        property: "og:description",
        content:
          "Poisson base-stock spares sizing for drives, PSUs and 800G optics, with fill rates, capital and a seeded 1,000-year simulation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CARD_CLASS = "rounded-lg border border-border bg-card p-5 shadow-sm";

function Index() {
  const [rawForm, setForm] = useState<FormState>(DEFAULTS);
  // Fill any section missing from older saved state (e.g. after a live reload) with defaults.
  const form: FormState = { ...DEFAULTS, ...rawForm };

  const psuAfrValue = psuAfr(form.psus.mtbfHours);
  const opticsCost = OPTICS_PRICES[form.optics.pricing];

  const gpuP = gpuParams(form.gpus);
  const inputs: { Drives: PartInputs; PSUs: PartInputs; Optics: PartInputs; GPUs: PartInputs } = useMemo(
    () => ({
      Drives: {
        fleetSize: form.drives.fleetSize,
        afr: form.drives.afrPct / 100,
        leadTimeWeeks: form.drives.leadTimeWeeks,
        targetFillRate: form.drives.targetFillPct / 100,
        unitCost: form.drives.unitCost,
      },
      PSUs: {
        fleetSize: form.psus.fleetSize,
        afr: psuAfrValue,
        leadTimeWeeks: form.psus.leadTimeWeeks,
        targetFillRate: form.psus.targetFillPct / 100,
        unitCost: form.psus.unitCost,
      },
      Optics: {
        fleetSize: form.optics.fleetSize,
        afr: form.optics.afrPct / 100,
        leadTimeWeeks: form.optics.leadTimeWeeks,
        targetFillRate: form.optics.targetFillPct / 100,
        unitCost: opticsCost,
      },
      GPUs: gpuPartInputs(gpuParams(form.gpus), form.gpus.unit),
    }),
    [form, psuAfrValue, opticsCost],
  );

  const issues = {
    Drives: validatePart(inputs.Drives),
    PSUs: validatePart({ ...inputs.PSUs, mtbfHours: form.psus.mtbfHours }),
    Optics: validatePart(inputs.Optics),
    GPUs: [
      ...validatePart(inputs.GPUs),
      ...(form.gpus.gpusPerBoard >= 1 ? [] : [{ field: "gpusPerBoard", message: "GPUs per board must be at least 1" }]),
    ],
  };
  const err = (cls: keyof typeof issues, field: string) =>
    issues[cls].find((i) => i.field === field)?.message;
  const valid = Object.values(issues).every((l) => l.length === 0);

  const drivesResult = computePart(inputs.Drives);
  const psusResult = computePart(inputs.PSUs);
  const opticsResult = computePart(inputs.Optics);
  const gpusResult = computePart(inputs.GPUs);
  const rows: NamedResult[] = [
    { name: "Drives (HDD)", result: drivesResult },
    { name: "PSUs", result: psusResult },
    { name: "Optics (800G)", result: opticsResult },
    { name: "GPUs (H100 SXM)", result: gpusResult },
  ];

  const costs = {
    "Drives (HDD)": form.drives.unitCost,
    PSUs: form.psus.unitCost,
    "Optics (800G)": opticsCost,
    "GPUs (H100 SXM)": inputs.GPUs.unitCost,
  };
  const targets = {
    "Drives (HDD)": form.drives.targetFillPct / 100,
    PSUs: form.psus.targetFillPct / 100,
    "Optics (800G)": form.optics.targetFillPct / 100,
    "GPUs (H100 SXM)": form.gpus.targetFillPct / 100,
  };

  const set = <K extends keyof FormState>(key: K, patch: Partial<FormState[K]>) =>
    setForm((f) => ({ ...f, [key]: { ...f[key], ...patch } }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Poisson base-stock model
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Data Center Spares Sizing Simulator
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Size on-site spares for drives, power supplies and optics. Stock levels are set so a
            failure finds a spare on the shelf at your target fill rate under one-for-one
            replenishment.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-6 py-10">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Inputs
            </h2>
            <Button variant="outline" size="sm" onClick={() => setForm(DEFAULTS)}>
              <RotateCcw /> Reset to defaults
            </Button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className={CARD_CLASS}>
              <h3 className="mb-4 font-semibold">Drives (HDD)</h3>
              <div className="space-y-3">
                <NumberField
                  label="Fleet size"
                  value={form.drives.fleetSize}
                  onChange={(v) => set("drives", { fleetSize: v })}
                  error={err("Drives", "fleetSize")}
                />
                <NumberField
                  label="Annual failure rate"
                  suffix="%"
                  step={0.01}
                  value={form.drives.afrPct}
                  onChange={(v) => set("drives", { afrPct: v })}
                  source="Backblaze Drive Stats 2025"
                  error={err("Drives", "afr")}
                />
                <NumberField
                  label="Lead time"
                  suffix="weeks"
                  value={form.drives.leadTimeWeeks}
                  onChange={(v) => set("drives", { leadTimeWeeks: v })}
                  error={err("Drives", "leadTimeWeeks")}
                />
                <NumberField
                  label="Target fill rate"
                  suffix="%"
                  step={0.1}
                  value={form.drives.targetFillPct}
                  onChange={(v) => set("drives", { targetFillPct: v })}
                  error={err("Drives", "targetFillRate")}
                />
                <NumberField
                  label="Unit cost"
                  suffix="$"
                  step={0.01}
                  value={form.drives.unitCost}
                  onChange={(v) => set("drives", { unitCost: v })}
                  error={err("Drives", "unitCost")}
                />
              </div>
            </div>

            <div className={CARD_CLASS}>
              <h3 className="mb-4 font-semibold">PSUs</h3>
              <div className="space-y-3">
                <NumberField
                  label="Fleet size"
                  value={form.psus.fleetSize}
                  onChange={(v) => set("psus", { fleetSize: v })}
                  error={err("PSUs", "fleetSize")}
                />
                <NumberField
                  label="MTBF"
                  suffix="hours"
                  step={1000}
                  value={form.psus.mtbfHours}
                  onChange={(v) => set("psus", { mtbfHours: v })}
                  source="Artesyn CSU2000AP datasheet"
                  error={err("PSUs", "mtbfHours")}
                />
                <div className="space-y-1">
                  <label className="flex items-baseline justify-between text-xs font-medium">
                    <span>Annual failure rate</span>
                    <span className="text-muted-foreground">computed</span>
                  </label>
                  <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 font-mono text-sm text-muted-foreground">
                    {Number.isFinite(psuAfrValue) ? (psuAfrValue * 100).toFixed(2) + "%" : "—"}
                  </div>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    Derived from MTBF: 1 − e^(−8760 / MTBF)
                  </p>
                </div>
                <NumberField
                  label="Lead time"
                  suffix="weeks"
                  value={form.psus.leadTimeWeeks}
                  onChange={(v) => set("psus", { leadTimeWeeks: v })}
                  error={err("PSUs", "leadTimeWeeks")}
                />
                <NumberField
                  label="Target fill rate"
                  suffix="%"
                  step={0.1}
                  value={form.psus.targetFillPct}
                  onChange={(v) => set("psus", { targetFillPct: v })}
                  error={err("PSUs", "targetFillRate")}
                />
                <NumberField
                  label="Unit cost"
                  suffix="$"
                  step={0.01}
                  value={form.psus.unitCost}
                  onChange={(v) => set("psus", { unitCost: v })}
                  error={err("PSUs", "unitCost")}
                />
              </div>
            </div>

            <div className={CARD_CLASS}>
              <h3 className="mb-4 font-semibold">Optics (800G transceivers)</h3>
              <div className="space-y-3">
                <NumberField
                  label="Fleet size"
                  value={form.optics.fleetSize}
                  onChange={(v) => set("optics", { fleetSize: v })}
                  error={err("Optics", "fleetSize")}
                />
                <NumberField
                  label="Annual failure rate"
                  suffix="%"
                  step={0.1}
                  value={form.optics.afrPct}
                  onChange={(v) => set("optics", { afrPct: v })}
                  source="Planner assumption (unsourced)"
                  sourceTone="warning"
                  error={err("Optics", "afr")}
                />
                <NumberField
                  label="Lead time"
                  suffix="weeks"
                  value={form.optics.leadTimeWeeks}
                  onChange={(v) => set("optics", { leadTimeWeeks: v })}
                  error={err("Optics", "leadTimeWeeks")}
                />
                <NumberField
                  label="Target fill rate"
                  suffix="%"
                  step={0.1}
                  value={form.optics.targetFillPct}
                  onChange={(v) => set("optics", { targetFillPct: v })}
                  error={err("Optics", "targetFillRate")}
                />
                <div className="space-y-1">
                  <label className="block text-xs font-medium">Unit cost</label>
                  <div className="flex gap-2">
                    {(["generic", "branded"] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => set("optics", { pricing: k })}
                        className={
                          "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors " +
                          (form.optics.pricing === k
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-card hover:bg-accent")
                        }
                      >
                        {k === "generic" ? "Generic" : "Branded"}
                        <span className="ml-1 font-mono">
                          ${OPTICS_PRICES[k].toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    Prices checked 2026-09-24
                  </p>
                </div>
              </div>
            </div>


            <div className={CARD_CLASS}>
              <h3 className="mb-4 font-semibold">GPUs (H100 SXM)</h3>
              <div className="space-y-3">
                <NumberField
                  label="GPUs installed"
                  value={form.gpus.gpusInstalled}
                  onChange={(v) => set("gpus", { gpusInstalled: v })}
                  source={`= ${(form.gpus.gpusInstalled / (form.gpus.gpusPerBoard || 1)).toLocaleString("en-US", { maximumFractionDigits: 2 })} HGX boards`}
                  error={err("GPUs", "fleetSize")}
                />
                <div className="space-y-1">
                  <label className="block text-xs font-medium">Sparing unit</label>
                  <div className="flex gap-2">
                    {(["module", "board"] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => set("gpus", { unit: k })}
                        className={
                          "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors " +
                          (form.gpus.unit === k
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-card hover:bg-accent")
                        }
                      >
                        {k === "module" ? "Module" : "Board"}
                      </button>
                    ))}
                  </div>
                  <p className="font-mono text-[11px] leading-tight text-muted-foreground">
                    Unit cost{" "}
                    {"$" + inputs.GPUs.unitCost.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    {form.gpus.unit === "module" ? ` (board price / ${form.gpus.gpusPerBoard} - proxy)` : ""}
                  </p>
                  {form.gpus.unit === "board" && (
                    <p className="font-mono text-[11px] leading-tight text-muted-foreground">
                      {(boardAfr(GPU_AFR, form.gpus.gpusPerBoard) * 100).toFixed(2)}% per board per year
                    </p>
                  )}
                </div>
                <NumberField
                  label="GPUs per HGX board"
                  value={form.gpus.gpusPerBoard}
                  onChange={(v) => set("gpus", { gpusPerBoard: v })}
                  error={err("GPUs", "gpusPerBoard")}
                />
                <NumberField
                  label="HGX H100 8-GPU board price"
                  suffix="$"
                  step={100}
                  value={form.gpus.boardPrice}
                  onChange={(v) => set("gpus", { boardPrice: v })}
                  source="Network Outlet list price, checked 2026-09-25"
                  error={err("GPUs", "unitCost")}
                />
                <div className="space-y-1">
                  <label className="flex items-baseline justify-between text-xs font-medium">
                    <span>Per-GPU AFR</span>
                    <span className="text-muted-foreground">computed</span>
                  </label>
                  <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 font-mono text-sm text-muted-foreground">
                    {(GPU_AFR * 100).toFixed(2)}%
                  </div>
                  <p className="text-[11px] leading-tight text-warning">
                    Derived from Meta Llama 3 run: (148 + 72) / 16,384 GPUs × 365 / 54 days. Interruption rate - likely an upper bound for physical replacements.
                  </p>
                </div>
                <NumberField
                  label="Lead time"
                  suffix="weeks"
                  value={form.gpus.leadTimeWeeks}
                  onChange={(v) => set("gpus", { leadTimeWeeks: v })}
                  error={err("GPUs", "leadTimeWeeks")}
                />
                <NumberField
                  label="Target fill rate"
                  suffix="%"
                  step={0.1}
                  value={form.gpus.targetFillPct}
                  onChange={(v) => set("gpus", { targetFillPct: v })}
                  error={err("GPUs", "targetFillRate")}
                />
              </div>
            </div>
          </div>
        </section>

        {!valid ? (
          <div className="rounded-lg border border-destructive bg-destructive/5 p-5">
            <p className="text-sm font-semibold text-destructive">
              Fix the highlighted inputs to see results
            </p>
            <ul className="mt-2 space-y-1 text-sm text-destructive">
              {Object.entries(issues).flatMap(([cls, list]) =>
                list.map((i) => (
                  <li key={cls + i.field}>
                    {cls}: {i.message}
                  </li>
                )),
              )}
            </ul>
          </div>
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Results
              </h2>
              <ResultsTable rows={rows} />
            </section>

            <PoissonVsNormal rows={rows} costs={costs} targets={targets} />

            <OpticsPriceComparison
              drives={drivesResult}
              psus={psusResult}
              gpus={gpusResult}
              opticsStock={opticsResult.stock}
            />

            <OpticsSensitivity optics={inputs.Optics} />

            <GpuSparingUnitComparison params={gpuP} />

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Simulation
              </h2>
              <SimulationPanel
                classes={[
                  { name: "Drives (HDD)", input: inputs.Drives, result: drivesResult },
                  { name: "PSUs", input: inputs.PSUs, result: psusResult },
                  { name: "Optics (800G)", input: inputs.Optics, result: opticsResult },
                  { name: "GPUs (H100 SXM)", input: inputs.GPUs, result: gpusResult },
                ]}
              />
            </section>

            <SelfCheckPanel />
          </>
        )}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-muted-foreground">
          Fleet sizes and lead times are sample values. Prices checked 2026-09-24/25. Optics AFR is an
          unsourced planner assumption. GPU AFR is derived from interruption data and is likely an upper bound.
        </div>
      </footer>
    </div>
  );
}
