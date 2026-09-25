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
import { classSeed, simulate, simulateScenarios, type ScenarioSummary, type PartInputs, type PartResult, type SimResult } from "@/lib/sparesModel";

export interface SimClass {
  name: string;
  input: PartInputs;
  result: PartResult;
}

const pct = (v: number) => (v * 100).toFixed(2) + "%";
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function SimulationPanel({ classes }: { classes: SimClass[] }) {
  const [seed, setSeed] = useState(11);
  const [year, setYear] = useState<{ name: string; sim: SimResult }[] | null>(null);
  const [long, setLong] = useState<{ name: string; sum: ScenarioSummary }[] | null>(null);
  const [horizon, setHorizon] = useState(1);
  const [busy, setBusy] = useState(false);

  const runYear = () => {
    setYear(
      classes.map((c, i) => ({
        name: c.name,
        sim: simulate(c.input, c.result.stock, 52, classSeed(seed, i)),
      })),
    );
  };

  const runLong = () => {
    setBusy(true);
    setTimeout(() => {
      setLong(
        classes.map((c, i) => ({
          name: c.name,
          sum: simulateScenarios(c.input, c.result.stock, c.input.targetFillRate, horizon, 1000, seed, i),
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
          {busy ? "Running…" : "Run 1,000 scenarios"}
        </Button>
        <div className="space-y-1">
          <label className="block text-xs font-medium">Horizon</label>
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value={1}>1 year</option>
            <option value={3}>3 years</option>
            <option value={5}>5 years</option>
          </select>
        </div>
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
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Part class</th>
                  <th className="px-4 py-3 text-right font-semibold">Avg simulated fill rate</th>
                  <th className="px-4 py-3 text-right font-semibold">Model achieved fill rate</th>
                  <th className="px-4 py-3 text-right font-semibold">Scenario-years meeting target</th>
                  <th className="px-4 py-3 text-right font-semibold">Worst scenario-year</th>
                  <th className="px-4 py-3 text-right font-semibold">Avg stockouts / yr</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {long.map(({ name, sum }, i) => (
                  <tr key={name} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 font-sans font-medium">{name}</td>
                    <td className="px-4 py-3 text-right">{pct(sum.avgFillRate)}</td>
                    <td className="px-4 py-3 text-right">{pct(classes[i]?.result.achievedFillRate ?? 0)}</td>
                    <td className="px-4 py-3 text-right">{(sum.pctYearsMeetingTarget * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right">{pct(sum.worstYearFillRate)}</td>
                    <td className="px-4 py-3 text-right">{sum.avgStockoutsPerYear.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Each scenario is one data center over the chosen horizon. Averages land within about 1 point of the model; the spread shows how often a single year misses target.
          </p>
        </div>
      )}
    </section>
  );
}
