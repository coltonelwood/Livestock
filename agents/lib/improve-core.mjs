// Pure aggregation for the weekly agent self-improvement report. No I/O.

/**
 * Roll per-event records into per-agent tallies.
 * @param {{runs?: any[], findings?: any[], decisions?: any[], feedback?: any[], approvals?: any[]}} [input]
 * @returns {Record<string, {runs:number,failedRuns:number,findings:number,decisions:number,approved:number,rejected:number,useful:number,notUseful:number}>}
 */
export function aggregate({ runs = [], findings = [], decisions = [], feedback = [], approvals = [] } = {}) {
  const per = {};
  const get = (a) => (per[a] ??= { runs: 0, failedRuns: 0, findings: 0, decisions: 0, approved: 0, rejected: 0, useful: 0, notUseful: 0 });
  for (const r of runs) { const g = get(r.agent); g.runs++; if (r.status === "failed") g.failedRuns++; }
  for (const f of findings) get(f._agent ?? "ops").findings++;
  for (const d of decisions) get(d.agent).decisions++;
  for (const fb of feedback) { const g = get(fb.agent ?? "unknown"); if (fb.rating === "useful") g.useful++; else if (fb.rating === "not_useful") g.notUseful++; }
  for (const a of approvals) { const g = get(a.agent ?? "unknown"); if (a.status === "approved" || a.status === "adopted") g.approved++; else if (a.status === "rejected") g.rejected++; }
  return per;
}

/** Self-score → flat metric rows for agent_performance_metrics. */
export function toMetrics(period, per) {
  const rows = [];
  for (const [agent, g] of Object.entries(per)) {
    rows.push(
      { agent, period, metric: "runs", value: g.runs },
      { agent, period, metric: "findings", value: g.findings },
      { agent, period, metric: "approved", value: g.approved },
      { agent, period, metric: "rejected", value: g.rejected },
      { agent, period, metric: "useful_feedback", value: g.useful },
    );
  }
  return rows;
}

export function buildImprovementReport(period, per) {
  const agents = Object.keys(per).sort();
  const lines = [`# OpenRange agents — weekly improvement report (${period})`, ""];
  if (!agents.length) {
    lines.push("No agent activity recorded this period.");
    return { title: `Weekly improvement — ${period}`, body: lines.join("\n"), metrics: [] };
  }
  lines.push("## Per-agent");
  for (const a of agents) {
    const g = per[a];
    const approvalRate = g.approved + g.rejected ? Math.round((g.approved / (g.approved + g.rejected)) * 100) : null;
    lines.push(`- **${a}**: ${g.runs} run(s)${g.failedRuns ? ` (${g.failedRuns} failed)` : ""}, ${g.decisions} decision(s), ${g.findings} finding(s)` +
      (approvalRate != null ? `, ${approvalRate}% of proposals approved` : "") +
      (g.useful + g.notUseful ? `, feedback 👍${g.useful}/👎${g.notUseful}` : ""));
  }
  // Simple, honest call-outs (no fabricated insight).
  const worst = agents.map((a) => [a, per[a]]).filter(([, g]) => g.rejected > g.approved && g.rejected > 0);
  const best = agents.map((a) => [a, per[a]]).filter(([, g]) => g.useful > g.notUseful && g.useful > 0);
  lines.push("", "## Signals");
  lines.push(best.length ? `- Working: ${best.map(([a]) => a).join(", ")} (net-positive feedback).` : "- Working: not enough feedback yet.");
  lines.push(worst.length ? `- Needs attention: ${worst.map(([a]) => a).join(", ")} (more rejections than approvals — review their playbook/instructions).` : "- Needs attention: none flagged.");
  lines.push("- Reminder: approve good lessons in Memory & Learning so they're reused; reject bad ones so they aren't.");
  return { title: `Weekly improvement — ${period}`, body: lines.join("\n"), metrics: toMetrics(period, per) };
}
