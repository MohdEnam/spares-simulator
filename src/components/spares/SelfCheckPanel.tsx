import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { runSelfCheck } from "@/lib/selfCheck";

export function SelfCheckPanel() {
  const [open, setOpen] = useState(false);
  const lines = runSelfCheck();
  const allPass = lines.every((l) => l.pass);

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          Model self-check
        </span>
        <span
          className={
            "rounded-full px-2.5 py-0.5 text-xs font-semibold " +
            (allPass
              ? "bg-success text-success-foreground"
              : "bg-destructive text-destructive-foreground")
          }
        >
          {allPass ? "ALL PASS" : `${lines.filter((l) => !l.pass).length} FAIL`}
        </span>
      </button>
      {open && (
        <div className="border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 font-semibold">Assertion</th>
                <th className="px-4 py-2 text-right font-semibold">Expected</th>
                <th className="px-4 py-2 text-right font-semibold">Actual</th>
                <th className="px-4 py-2 text-right font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.label} className="border-t border-border/70">
                  <td className="px-4 py-2">{l.label}</td>
                  <td className="px-4 py-2 text-right font-mono">{l.expected}</td>
                  <td className="px-4 py-2 text-right font-mono">{l.actual}</td>
                  <td
                    className={
                      "px-4 py-2 text-right font-mono font-semibold " +
                      (l.pass ? "text-success" : "text-destructive")
                    }
                  >
                    {l.pass ? "PASS" : "FAIL"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-muted-foreground">
            Runs every reference assertion against the default inputs, in the browser.
          </p>
        </div>
      )}
    </section>
  );
}
