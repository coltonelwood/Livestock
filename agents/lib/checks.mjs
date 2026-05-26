// Pure helpers for the Ops Agent — no I/O, unit-tested in checks.test.mjs.

export const SEVERITY_ORDER = ["info", "low", "medium", "high", "critical"];

export function severityRank(sev) {
  const i = SEVERITY_ORDER.indexOf(sev);
  return i < 0 ? 0 : i;
}

/**
 * Classify an HTTP route probe into a finding (or null if healthy).
 * - public routes must be 200.
 * - auth-gated routes must be 200 (authed) or a 3xx redirect to login (anon).
 */
export function routeFinding({ path, status, kind }) {
  if (kind === "public") {
    if (status === 200) return null;
    return {
      severity: status >= 500 ? "critical" : "high",
      area: "route",
      route: path,
      title: `Public route ${path} returned ${status}`,
      detail: `Expected 200 for an anonymous visitor; got ${status}.`,
    };
  }
  // auth-gated
  if (status === 200 || (status >= 300 && status < 400)) return null;
  return {
    severity: status >= 500 ? "critical" : "high",
    area: "route",
    route: path,
    title: `Dashboard route ${path} returned ${status}`,
    detail: `Expected 200 or a redirect to login; got ${status}.`,
  };
}

export function overflowFinding({ route, width, overflowPx }) {
  if (overflowPx <= 2) return null;
  return {
    severity: overflowPx > 40 ? "medium" : "low",
    area: "mobile",
    route,
    title: `Horizontal overflow on ${route} at ${width}px (${overflowPx}px)`,
    detail: `Page scrolls horizontally at ${width}px — breaks one-handed mobile use.`,
  };
}

export function linkFinding({ from, href, status }) {
  if (status < 400) return null;
  return {
    severity: status >= 500 ? "high" : "medium",
    area: "link",
    route: from,
    title: `Broken link ${href} (${status})`,
    detail: `Linked from ${from}; target returned ${status}.`,
  };
}

export function summarize(findings) {
  const by = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of findings) by[f.severity] = (by[f.severity] ?? 0) + 1;
  return by;
}

/** Worst severity present, or null when clean. */
export function worstSeverity(findings) {
  return findings.reduce(
    (worst, f) => (severityRank(f.severity) > severityRank(worst ?? "info") ? f.severity : worst),
    null,
  );
}

export function renderReport({ startedAt, finishedAt, baseUrl, checksRun, findings }) {
  const by = summarize(findings);
  const worst = worstSeverity(findings);
  const headline = findings.length === 0
    ? "All clear — no issues detected."
    : `${findings.length} finding(s) — worst: ${worst}.`;
  const lines = [];
  lines.push(`# OpenRange Ops Agent — daily QA report`);
  lines.push("");
  lines.push(`- Target: ${baseUrl}`);
  lines.push(`- Started: ${startedAt}`);
  if (finishedAt) lines.push(`- Finished: ${finishedAt}`);
  lines.push(`- Checks run: ${checksRun}`);
  lines.push(`- Result: **${headline}**`);
  lines.push(`- Severity: critical ${by.critical} · high ${by.high} · medium ${by.medium} · low ${by.low} · info ${by.info}`);
  lines.push("");
  if (findings.length) {
    lines.push(`## Findings`);
    const sorted = [...findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
    for (const f of sorted) {
      lines.push(`- **[${f.severity}] ${f.area}** — ${f.title}${f.route ? ` (${f.route})` : ""}`);
      if (f.detail) lines.push(`  - ${f.detail}`);
      if (f.screenshot_url) lines.push(`  - screenshot: ${f.screenshot_url}`);
    }
  }
  return lines.join("\n");
}
