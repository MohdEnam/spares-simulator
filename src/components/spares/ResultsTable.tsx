import type { PartResult } from "@/lib/sparesModel";

export interface NamedResult {
  name: string;
  result: PartResult;
}

const num = (v: number, d = 2) =>
  v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (v: number) => "$" + num(v, 2);
const pct = (v: number) => (v * 100).toFixed(2) + "%";

export function ResultsTable({ rows }: { rows: NamedResult[] }) {
  const totalFailures = rows.reduce((s, r) => s + r.result.expectedFailuresPerYear, 0);
  const totalCapital = rows.reduce((s, r) => s + r.result.capital, 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Part class</th>
            <th className="px-4 py-3 text-right font-semibold">Failures/yr</th>
            <th className="px-4 py-3 text-right font-semibold">Lead-time demand λ</th>
            <th className="px-4 py-3 text-right font-semibold">Recommended S</th>
            <th className="px-4 py-3 text-right font-semibold">Reorder point</th>
            <th className="px-4 py-3 text-right font-semibold">Safety stock</th>
            <th className="px-4 py-3 text-right font-semibold">Achieved fill rate</th>
            <th className="px-4 py-3 text-right font-semibold">Cycle service level</th>
            <th className="px-4 py-3 text-right font-semibold">Capital</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/70 last:border-0">
              <td className="px-4 py-3 font-sans font-medium">{r.name}</td>
              <td className="px-4 py-3 text-right">{num(r.result.expectedFailuresPerYear, 2)}</td>
              <td className="px-4 py-3 text-right">{num(r.result.lambda, 4)}</td>
              <td className="px-4 py-3 text-right font-semibold text-primary">{r.result.stock}</td>
              <td className="px-4 py-3 text-right">{r.result.reorderPoint}</td>
              <td className="px-4 py-3 text-right">{num(r.result.safetyStock, 2)}</td>
              <td className="px-4 py-3 text-right">{pct(r.result.achievedFillRate)}</td>
              <td className="px-4 py-3 text-right">{pct(r.result.cycleServiceLevel)}</td>
              <td className="px-4 py-3 text-right">{money(r.result.capital)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-border bg-surface font-semibold">
            <td className="px-4 py-3 font-sans">Total</td>
            <td className="px-4 py-3 text-right">{num(totalFailures, 2)}</td>
            <td className="px-4 py-3 text-right text-muted-foreground">—</td>
            <td className="px-4 py-3 text-right">{rows.reduce((s, r) => s + r.result.stock, 0)}</td>
            <td className="px-4 py-3 text-right text-muted-foreground">—</td>
            <td className="px-4 py-3 text-right text-muted-foreground">—</td>
            <td className="px-4 py-3 text-right text-muted-foreground">—</td>
            <td className="px-4 py-3 text-right text-muted-foreground">—</td>
            <td className="px-4 py-3 text-right">{money(totalCapital)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
