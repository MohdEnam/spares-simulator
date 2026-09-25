import { describe, expect, it } from "vitest";
import { runSelfCheck } from "./selfCheck";

describe("spares model (Excel reference values)", () => {
  const lines = runSelfCheck();
  for (const line of lines) {
    it(`${line.label} = ${line.expected}`, () => {
      expect(line.actual, `expected ${line.expected}, got ${line.actual}`).toBe(
        line.pass ? line.actual : `FAIL (${line.actual})`,
      );
      expect(line.pass).toBe(true);
    });
  }

  it("all assertions pass", () => {
    expect(lines.every((l) => l.pass)).toBe(true);
  });
});
