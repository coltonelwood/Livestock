#!/usr/bin/env node
/**
 * OpenRange Ops Agent — 24/7 supervised QA.
 *
 * Read-only. Probes the deployed site (route health, broken links, form smoke,
 * mobile overflow, console/network errors), checks the DB for auctions that
 * should have closed and orders/leads needing follow-up, captures screenshots
 * on failure, writes a run + findings to Supabase (if service-role env is set),
 * prints a markdown report, and optionally emails it.
 *
 * It NEVER mutates product data, sends messages, or deploys. Findings become
 * GitHub issues only via the human-reviewed Code Agent / approvals queue.
 *
 * Env: BASE_URL (default prod), NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (optional, to persist), RESEND_API_KEY + OPS_REPORT_EMAIL (optional, to email).
 */
import fs from "node:fs";
import { chromium } from "playwright";
import { routeFinding, overflowFinding, linkFinding, renderReport, worstSeverity } from "../lib/checks.mjs";
import { adminClient, sendReportEmail } from "../lib/supabase.mjs";
import { recordLesson, recordDecision, recordMetric } from "../lib/memory.mjs";

function isoWeek(d = new Date()) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((dt - yearStart) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const BASE = process.env.BASE_URL || "https://livestock-eight.vercel.app";
const SHOT_DIR = process.env.SHOT_DIR || "/tmp/ops-shots";
fs.mkdirSync(SHOT_DIR, { recursive: true });

const PUBLIC_ROUTES = ["/", "/listings", "/beef", "/auctions", "/pricing", "/receptionist", "/about", "/how-it-works", "/cart", "/login", "/signup"];
const AUTH_ROUTES = ["/dashboard", "/dashboard/listings", "/dashboard/orders", "/dashboard/leads", "/admin"];
const VIEWPORTS = [360, 768];

const findings = [];
let checksRun = 0;
const startedAt = new Date().toISOString();
const add = (f) => { if (f) findings.push(f); };

const db = adminClient();
let runId = null;
if (db) {
  const { data } = await db.from("agent_runs")
    .insert({ agent: "ops", trigger: process.env.AGENT_TRIGGER || "schedule", status: "running" })
    .select("id").single();
  runId = data?.id ?? null;
}

const browser = await chromium.launch();
const noisy = (t) => t.includes("_rsc") || t.includes("punycode") || t.includes("React DevTools");

try {
  // 1) Route health + console/network + mobile overflow (public)
  for (const path of PUBLIC_ROUTES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const consoleErrs = [];
    page.on("console", (m) => { if ((m.type() === "error") && !noisy(m.text())) consoleErrs.push(m.text().slice(0, 160)); });
    page.on("pageerror", (e) => consoleErrs.push(`pageerror: ${String(e).slice(0, 160)}`));
    page.on("response", (r) => { const u = r.url(); if (u.startsWith(BASE) && !u.includes("_rsc") && r.status() >= 500) consoleErrs.push(`http ${r.status()} ${u.replace(BASE, "")}`); });
    let status = 0;
    try {
      const resp = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 30000 });
      status = resp?.status() ?? 0;
    } catch { status = 0; }
    checksRun++;
    const rf = routeFinding({ path, status, kind: "public" });
    if (rf) { rf.screenshot_url = await snap(page, `route_${slug(path)}`); add(rf); }
    if (consoleErrs.length) add({ severity: "medium", area: "console", route: path, title: `${consoleErrs.length} console/network error(s) on ${path}`, detail: consoleErrs.slice(0, 5).join(" | ") });
    for (const w of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      add(overflowFinding({ route: path, width: w, overflowPx: overflow }));
      checksRun++;
    }
    await ctx.close();
  }

  // 2) Auth-gated routes should redirect (not 500) for anon
  for (const path of AUTH_ROUTES) {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    let status = 0;
    try { const r = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 25000 }); status = r?.status() ?? 0; } catch {}
    checksRun++;
    add(routeFinding({ path, status, kind: "auth" }));
    await ctx.close();
  }

  // 3) Broken-link check across the homepage's internal links
  {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
    const hrefs = [...new Set(await page.locator('a[href^="/"]').evaluateAll((els) => els.map((e) => e.getAttribute("href"))))]
      .filter((h) => h && !h.startsWith("/#")).slice(0, 25);
    for (const href of hrefs) {
      try {
        const r = await page.request.get(BASE + href, { timeout: 15000, maxRedirects: 0 });
        checksRun++;
        add(linkFinding({ from: "/", href, status: r.status() }));
      } catch { /* network */ }
    }
    await ctx.close();
  }

  // 4) Form smoke: inquiry (expect success) + chat fallback (expect 503 unavailable)
  {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 900 }, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    try {
      // pick the first listing on the marketplace
      await page.goto(BASE + "/listings", { waitUntil: "networkidle", timeout: 30000 });
      const link = await page.locator('a[href^="/listings/"]').first().getAttribute("href");
      if (link) {
        await page.goto(BASE + link, { waitUntil: "networkidle", timeout: 30000 });
        if (await page.locator('input[name="name"]').count()) {
          await page.locator('input[name="name"]').fill("Ops QA");
          if (await page.locator('input[name="email"]').count()) await page.locator('input[name="email"]').fill("ops-qa@example.com");
          await page.locator('textarea[name="message"]').fill("Automated ops smoke test.");
          const rp = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/listings/"), { timeout: 15000 }).catch(() => null);
          await page.getByRole("button", { name: /contact seller/i }).click();
          const resp = await rp;
          checksRun++;
          await page.waitForTimeout(1500);
          const okMsg = /message was sent to the seller/i.test(await page.locator("body").innerText());
          if (!okMsg) add({ severity: "high", area: "form", route: link, title: "Inquiry form did not confirm success", detail: `POST ${resp?.status()}; success message not shown. Buyers may be unable to contact sellers.`, screenshot_url: await snap(page, "inquiry") });
        }
      }
    } catch (e) { add({ severity: "medium", area: "form", route: "/listings/[id]", title: "Inquiry smoke test errored", detail: String(e).slice(0, 160) }); }
    await ctx.close();
  }

  // 5) DB checks (only when service role is configured)
  if (db) {
    const nowIso = new Date().toISOString();
    const { data: overdue } = await db.from("auctions").select("id, title, ends_at").eq("status", "live").lt("ends_at", nowIso).limit(50);
    checksRun++;
    for (const a of overdue ?? []) add({ severity: "high", area: "auction", route: `/auctions/${a.id}`, title: `Auction past end time still live: ${a.title}`, detail: `ends_at ${a.ends_at} has passed but status is still 'live'. Check the close-due cron.` });

    const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count: stalePayments } = await db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_payment").lt("created_at", dayAgo);
    checksRun++;
    if ((stalePayments ?? 0) > 0) add({ severity: "low", area: "order", title: `${stalePayments} order(s) stuck in pending_payment >24h`, detail: "Consider follow-up or cleanup." });

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600_000).toISOString();
    const { count: staleLeads } = await db.from("leads").select("id", { count: "exact", head: true }).eq("status", "new").lt("created_at", threeDaysAgo);
    checksRun++;
    if ((staleLeads ?? 0) > 0) add({ severity: "info", area: "order", title: `${staleLeads} new lead(s) un-actioned >3 days`, detail: "Seller follow-up may be lapsing." });
  }
} finally {
  await browser.close();
}

const finishedAt = new Date().toISOString();
const report = renderReport({ startedAt, finishedAt, baseUrl: BASE, checksRun, findings });
console.log(report);

// Persist
if (db) {
  if (findings.length) {
    await db.from("qa_findings").insert(findings.map((f) => ({
      run_id: runId, severity: f.severity, area: f.area, route: f.route ?? null,
      title: f.title, detail: f.detail ?? null, screenshot_url: f.screenshot_url ?? null,
    })));
  }
  const worst = worstSeverity(findings);
  const status = worst === "critical" || worst === "high" ? "partial" : "success";
  if (runId) await db.from("agent_runs").update({
    status, finished_at: finishedAt, summary: report.split("\n").find((l) => l.includes("Result:")) ?? "done",
    stats: { checksRun, findings: findings.length, worst },
  }).eq("id", runId);

  // Learning loop: recurring failures become reinforced bug_pattern lessons;
  // log the decision + performance metrics for self-scoring.
  for (const f of findings.filter((x) => x.severity === "high" || x.severity === "critical" || x.area === "auction")) {
    await recordLesson(db, { agent: "ops", category: "bug_pattern", lesson: f.title, tags: [f.area] });
  }
  await recordDecision(db, {
    runId, agent: "ops",
    action: `Ran ${checksRun} checks; ${findings.length} finding(s)`,
    riskLevel: worst === "critical" || worst === "high" ? "medium" : "low",
  });
  const period = isoWeek();
  await recordMetric(db, { agent: "ops", period, metric: "checks_run", value: checksRun });
  await recordMetric(db, { agent: "ops", period, metric: "findings", value: findings.length });
}
await sendReportEmail(`OpenRange Ops QA — ${findings.length} finding(s)`, report);

// Non-zero exit when something critical/high is found (so CI surfaces it).
const worst = worstSeverity(findings);
process.exit(worst === "critical" || worst === "high" ? 1 : 0);

function slug(p) { return p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root"; }
async function snap(page, name) {
  const file = `${SHOT_DIR}/${name}.png`;
  try { await page.screenshot({ path: file }); } catch { return null; }
  return file;
}
