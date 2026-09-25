import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { simulate, type PartInputs, type PartResult, type SimResult } from "@/lib/sparesModel";

export interface SimClass {
  name: string;
  input: PartInputs;
  result: PartResult;
}

const pct = (v: number) => (v * 100).toFixed(2) + "%";
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function SimulationPanel({ classes }: { classes: SimClass[] }) {
  const [seed, setSeed] = useState(42);
  const [year, setYear] = useState<{ name: string; sim: SimResult }[] | null>(null);
  const [long, setLong] = useState<{ name: string; sim: SimResult }[] | null>(null);
  const [busy, setBusy] = useState(false);

  const runYear = () => {
    setYear(
      classes.map((c) => ({
        name: c.name,
        sim: simulate(c.input, c.result.stock, 52, seed),
      })),
    );
  };

  const runLong = () => {
    setBusy(true);
    setTimeout(() => {
      setLong(
        classes.map((c) => ({
          name: c.name,
          sim: simulate(
            c.input,
            c.result.stock,
            52000,
            seed,
            Math.max(1, Math.round(c.input.leadTimeWeeks)),
            false,
          ),
        })),
      );
      setBusy(false);
    }, 0);
  };

  const chartData =
    year &&
    Array.from({ length: 52 }, (_, i) => {
      const row: Record<string, number> = { week: i + 1 };
      for (const y of year) row[y.name] = y.sim.onHandSeries[i] ?? 0;
      return row;
    });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium">Random seed</label>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            className="h-9 w-28 rounded-md border border-input bg-card px-3 font-mono text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Button onClick={runYear}>Simulate a year</Button>
        <Button variant="outline" onClick={runLong} disabled={busy}>
          {busy ? "Running…" : "Run 1,000 years"}
        </Button>
      </div>

      {year && (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Part class</th>
                  <th className="px-4 py-3 text-right font-semibold">Failures</th>
                  <th className="px-4 py-3 text-right font-semibold">Filled from shelf</th>
                  <th className="px-4 py-3 text-right font-semibold">Stockouts</th>
                  <th className="px-4 py-3 text-right font-semibold">Simulated fill rate</th>
                  <th className="px-4 py-3 text-right font-semibold">Lowest on-hand</th>
                  <th className="px-4 py-3 text-right font-semibold">Weeks with a stockout</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {year.map(({ name, sim }) => (
                  <tr key={name} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 font-sans font-medium">{name}</td>
                    <td className="px-4 py-3 text-right">{sim.totalFailures}</td>
                    <td className="px-4 py-3 text-right">{sim.filled}</td>
                    <td className="px-4 py-3 text-right">{sim.stockouts}</td>
                    <td className="px-4 py-3 text-right">{pct(sim.fillRate)}</td>
                    <td className="px-4 py-3 text-right">{sim.minOnHand}</td>
                    <td className="px-4 py-3 text-right">{sim.weeksWithStockout}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold">Weekly on-hand level</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData ?? []}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 12 }}
                    label={{ value: "Week", position: "insideBottom", offset: -2, fontSize: 12 }}
                  />
                  <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {classes.map((c, i) => (
                    <Line
                      key={c.name}
                      type="stepAfter"
                      dataKey={c.name}
                      stroke={COLORS[i % COLORS.length] ?? "var(--chart-1)"}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {long && (
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Part class</th>
                  <th className="px-4 py-3 text-right font-semibold">Model achieved fill rate</th>
                  <th className="px-4 py-3 text-right font-semibold">1,000-year simulated</th>
                  <th className="px-4 py-3 text-right font-semibold">Difference</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {long.map(({ name, sim }, i) => {
                  const model = classes[i]?.result.achievedFillRate ?? 0;
                  const diff = (sim.fillRate - model) * 100;
                  return (
                    <tr key={name} className="border-b border-border/70 last:border-0">
                      <td className="px-4 py-3 font-sans font-medium">{name}</td>
                      <td className="px-4 py-3 text-right">{pct(model)}</td>
                      <td className="px-4 py-3 text-right">{pct(sim.fillRate)}</td>
                      <td className="px-4 py-3 text-right">
                        {diff >= 0 ? "+" : ""}
                        {diff.toFixed(2)} pp
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            The simulation counts failures in whole weeks, so it runs slightly above the model.
          </p>
        </div>
      )}
    </section>
  );
}
