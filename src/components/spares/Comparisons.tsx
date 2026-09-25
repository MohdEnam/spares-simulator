import { OPTICS_PRICES } from "@/lib/defaults";
import {
  leadTimeDemand,
  poissonCdf,
  recommendedStock,
  type PartInputs,
  type PartResult,
} from "@/lib/sparesModel";
import type { NamedResult } from "./ResultsTable";

const money = (v: number) =>
  "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v: number) => (v * 100).toFixed(2) + "%";

function SectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </h3>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function PoissonVsNormal({
  rows,
  costs,
  targets,
}: {
  rows: NamedResult[];
  costs: Record<string, number>;
  targets: Record<string, number>;
}) {
  return (
    <section>
      <SectionTitle note="The normal approximation is shown for comparison only; the Poisson result is the recommendation.">
        Poisson vs normal approximation
      </SectionTitle>
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Part class</th>
              <th className="px-4 py-3 text-right font-semibold">Poisson S</th>
              <th className="px-4 py-3 text-right font-semibold">Normal S</th>
              <th className="px-4 py-3 text-right font-semibold">Δ units</th>
              <th className="px-4 py-3 text-right font-semibold">Δ capital</th>
              <th className="px-4 py-3 font-semibold">Verdict</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map(({ name, result }) => {
              const cost = costs[name] ?? 0;
              const dUnits = result.normalStock - result.stock;
              const dCapital = dUnits * cost;
              const understocks = result.normalFillRate < (targets[name] ?? 0);
              return (
                <tr key={name} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 font-sans font-medium">{name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">{result.stock}</td>
                  <td className="px-4 py-3 text-right">{result.normalStock}</td>
                  <td className="px-4 py-3 text-right">{dUnits > 0 ? `+${dUnits}` : dUnits}</td>
                  <td className="px-4 py-3 text-right">{money(dCapital)}</td>
                  <td className="px-4 py-3 font-sans text-xs">
                    {understocks ? (
                      <span className="rounded-full bg-destructive px-2 py-0.5 font-semibold text-destructive-foreground">
                        Normal understocks — true fill rate {pct(result.normalFillRate)}
                      </span>
                    ) : dUnits > 0 ? (
                      <span className="text-muted-foreground">
                        Normal overstocks by {dUnits} unit{dUnits === 1 ? "" : "s"} (
                        {money(dCapital)})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Same stock level</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function OpticsPriceComparison({
  drives,
  psus,
  opticsStock,
}: {
  drives: PartResult;
  psus: PartResult;
  opticsStock: number;
}) {
  const rows = (["generic", "branded"] as const).map((k) => {
    const opticsCapital = opticsStock * OPTICS_PRICES[k];
    return {
      key: k,
      label: k === "generic" ? `Generic (${money(OPTICS_PRICES.generic)})` : `Branded (${money(OPTICS_PRICES.branded)})`,
      driveOptics: drives.capital + opticsCapital,
      all: drives.capital + opticsCapital + psus.capital,
    };
  });
  const diffDriveOptics = rows[1].driveOptics - rows[0].driveOptics;
  const diffAll = rows[1].all - rows[0].all;

  return (
    <section>
      <SectionTitle>Optics price comparison</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.key} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {r.label}
            </p>
            <dl className="mt-3 space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <dt className="font-sans text-muted-foreground">Drives + optics</dt>
                <dd>{money(r.driveOptics)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-sans text-muted-foreground">All classes</dt>
                <dd>{money(r.all)}</dd>
              </div>
            </dl>
          </div>
        ))}
        <div className="rounded-lg border border-accent bg-accent/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
            Difference (branded − generic)
          </p>
          <dl className="mt-3 space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <dt className="font-sans text-muted-foreground">Drives + optics</dt>
              <dd>+{money(diffDriveOptics)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-sans text-muted-foreground">All classes</dt>
              <dd>+{money(diffAll)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

export function OpticsSensitivity({ optics }: { optics: PartInputs }) {
  const rows = [0.01, 0.02, 0.04].map((afr) => {
    const lambda = leadTimeDemand(optics.fleetSize, afr, optics.leadTimeWeeks);
    const s = recommendedStock(lambda, optics.targetFillRate);
    return {
      afr,
      lambda,
      s,
      fill: poissonCdf(s - 1, lambda),
      generic: s * OPTICS_PRICES.generic,
      branded: s * OPTICS_PRICES.branded,
    };
  });

  return (
    <section>
      <SectionTitle note="Optics failure rate is an unsourced planner assumption, so it is worth stress-testing.">
        Optics failure-rate sensitivity
      </SectionTitle>
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Assumed AFR</th>
              <th className="px-4 py-3 text-right font-semibold">λ</th>
              <th className="px-4 py-3 text-right font-semibold">Recommended S</th>
              <th className="px-4 py-3 text-right font-semibold">Capital @ generic</th>
              <th className="px-4 py-3 text-right font-semibold">Capital @ branded</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((r) => (
              <tr key={r.afr} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3">{(r.afr * 100).toFixed(0)}%</td>
                <td className="px-4 py-3 text-right">{r.lambda.toFixed(4)}</td>
                <td className="px-4 py-3 text-right font-semibold text-primary">{r.s}</td>
                <td className="px-4 py-3 text-right">{money(r.generic)}</td>
                <td className="px-4 py-3 text-right">{money(r.branded)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
