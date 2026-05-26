import { describe, expect, it } from "vitest";

import { aggregate, toMetrics, buildImprovementReport } from "../../../agents/lib/improve-core.mjs";

describe("weekly improvement aggregation", () => {
  const per = aggregate({
    runs: [{ agent: "ops", status: "success" }, { agent: "ops", status: "failed" }, { agent: "growth", status: "success" }],
    findings: [{ _agent: "ops" }, { _agent: "ops" }],
    decisions: [{ agent: "growth" }],
    feedback: [{ agent: "growth", rating: "useful" }, { agent: "growth", rating: "useful" }, { agent: "ops", rating: "not_useful" }],
    approvals: [{ agent: "growth", status: "approved" }, { agent: "growth", status: "rejected" }],
  });

  it("tallies per agent", () => {
    expect(per.ops).toMatchObject({ runs: 2, failedRuns: 1, findings: 2, notUseful: 1 });
    expect(per.growth).toMatchObject({ runs: 1, decisions: 1, useful: 2, approved: 1, rejected: 1 });
  });

  it("emits flat metric rows", () => {
    const rows = toMetrics("2026-W21", per);
    expect(rows.find((r) => r.agent === "ops" && r.metric === "findings")?.value).toBe(2);
    expect(rows.every((r) => r.period === "2026-W21")).toBe(true);
  });

  it("builds a report with per-agent lines and signals", () => {
    const { title, body, metrics } = buildImprovementReport("2026-W21", per);
    expect(title).toContain("2026-W21");
    expect(body).toContain("ops");
    expect(body).toContain("Working:");
    expect(body).toContain("Needs attention:");
    expect(metrics.length).toBeGreaterThan(0);
  });

  it("handles an empty period without fabricating", () => {
    const { body, metrics } = buildImprovementReport("2026-W22", {});
    expect(body).toContain("No agent activity");
    expect(metrics).toHaveLength(0);
  });
});
