import { describe, expect, it } from "vitest";

import {
  routeFinding,
  overflowFinding,
  linkFinding,
  summarize,
  worstSeverity,
  renderReport,
  severityRank,
} from "../../../agents/lib/checks.mjs";

describe("ops agent checks", () => {
  it("flags non-200 public routes by severity", () => {
    expect(routeFinding({ path: "/", status: 200, kind: "public" })).toBeNull();
    expect(routeFinding({ path: "/", status: 500, kind: "public" })?.severity).toBe("critical");
    expect(routeFinding({ path: "/beef", status: 404, kind: "public" })?.severity).toBe("high");
  });

  it("accepts 200 or redirect for auth routes, flags 500", () => {
    expect(routeFinding({ path: "/dashboard", status: 307, kind: "auth" })).toBeNull();
    expect(routeFinding({ path: "/dashboard", status: 200, kind: "auth" })).toBeNull();
    expect(routeFinding({ path: "/dashboard", status: 500, kind: "auth" })?.severity).toBe("critical");
  });

  it("ignores sub-3px overflow, flags larger", () => {
    expect(overflowFinding({ route: "/x", width: 360, overflowPx: 2 })).toBeNull();
    expect(overflowFinding({ route: "/x", width: 360, overflowPx: 18 })?.severity).toBe("low");
    expect(overflowFinding({ route: "/x", width: 768, overflowPx: 63 })?.severity).toBe("medium");
  });

  it("flags broken links only on 4xx/5xx", () => {
    expect(linkFinding({ from: "/", href: "/beef", status: 200 })).toBeNull();
    expect(linkFinding({ from: "/", href: "/nope", status: 404 })?.severity).toBe("medium");
    expect(linkFinding({ from: "/", href: "/boom", status: 500 })?.severity).toBe("high");
  });

  it("summarizes and ranks severity", () => {
    const findings = [{ severity: "low" }, { severity: "critical" }, { severity: "low" }];
    expect(summarize(findings)).toMatchObject({ low: 2, critical: 1 });
    expect(worstSeverity(findings)).toBe("critical");
    expect(worstSeverity([])).toBeNull();
    expect(severityRank("critical")).toBeGreaterThan(severityRank("low"));
  });

  it("renders a clean report when there are no findings", () => {
    const md = renderReport({ startedAt: "t0", finishedAt: "t1", baseUrl: "https://x", checksRun: 10, findings: [] });
    expect(md).toContain("All clear");
    expect(md).toContain("Checks run: 10");
  });

  it("renders findings sorted worst-first", () => {
    const md = renderReport({
      startedAt: "t0", finishedAt: null, baseUrl: "https://x", checksRun: 3,
      findings: [
        { severity: "low", area: "mobile", title: "minor", route: "/a" },
        { severity: "critical", area: "route", title: "down", route: "/b" },
      ],
    });
    expect(md.indexOf("down")).toBeLessThan(md.indexOf("minor"));
  });
});
