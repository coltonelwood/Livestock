import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { cn, formatUtc } from "@/lib/utils";
import { AGENTS, agentLabel } from "@/lib/agents/registry";
import { SAFETY_RULES } from "@/lib/agents/safety";
import {
  setTaskStatusAction,
  setOutreachStatusAction,
  setContentStatusAction,
  setFindingStatusAction,
  setAgentPausedAction,
  setSystemPausedAction,
} from "@/modules/admin/agent-actions";
import { recordFeedbackAction } from "@/modules/admin/memory-actions";
import { overallLiquidity, buildLiquidityMap } from "../../../../agents/lib/metrics-core.mjs";

const parseState = (loc: string | null) => {
  const tail = String(loc ?? "").split(",").pop()?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(tail) ? tail : "??";
};

export const metadata: Metadata = { title: "Admin · Agent Control Center" };
export const dynamic = "force-dynamic";

const fmt = formatUtc;

export default async function AgentControlCenterPage() {
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [runs, tasks, outreach, content, findings, prefs, sysPref,
    storefronts, listings, products, auctions, leads, paidOrders, prospects, outboundSent,
    listingLocs, ranchLocs] = await Promise.all([
    supabase.from("agent_runs").select("*").order("started_at", { ascending: false }).limit(20),
    supabase.from("agent_tasks").select("*").eq("status", "proposed").order("created_at", { ascending: false }).limit(50),
    supabase.from("outreach_drafts").select("*").eq("status", "pending_approval").order("created_at", { ascending: false }).limit(50),
    supabase.from("content_drafts").select("*").eq("status", "pending_approval").order("created_at", { ascending: false }).limit(50),
    supabase.from("qa_findings").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50),
    supabase.from("agent_preferences").select("agent, value").eq("key", "paused"),
    supabase.from("agent_preferences").select("value").eq("key", "paused:all").maybeSingle(),
    supabase.from("ranch_profiles").select("id", head).eq("is_public", true),
    supabase.from("livestock_listings").select("id", head).eq("status", "active"),
    supabase.from("meat_products").select("id", head).eq("status", "active"),
    supabase.from("auctions").select("id", head).in("status", ["live", "scheduled"]),
    supabase.from("leads").select("id", head),
    supabase.from("orders").select("id", head).eq("status", "paid"),
    supabase.from("founding_prospects").select("id", head),
    supabase.from("outbound_messages").select("id", head).eq("status", "sent"),
    supabase.from("livestock_listings").select("location").eq("status", "active").limit(1000),
    supabase.from("ranch_profiles").select("location").eq("is_public", true).limit(500),
  ]);
  const pausedAgents = new Set((prefs.data ?? []).filter((p) => String(p.value) === "true").map((p) => p.agent));
  const systemPaused = String(sysPref.data?.value ?? "") === "true";

  const totals = { storefronts: storefronts.count ?? 0, listings: listings.count ?? 0, products: products.count ?? 0, auctions: auctions.count ?? 0 };
  const liquidity = overallLiquidity(totals);
  const kpis = [
    { label: "Storefronts", value: totals.storefronts }, { label: "Listings", value: totals.listings },
    { label: "Beef products", value: totals.products }, { label: "Auctions", value: totals.auctions },
    { label: "Leads", value: leads.count ?? 0 }, { label: "Paid orders", value: paidOrders.count ?? 0 },
    { label: "Prospects", value: prospects.count ?? 0 }, { label: "Outreach sent", value: outboundSent.count ?? 0 },
  ];
  const regionRows = [
    ...(listingLocs.data ?? []).map((l) => ({ region: parseState(l.location), listings: 1 })),
    ...(ranchLocs.data ?? []).map((r) => ({ region: parseState(r.location), storefronts: 1 })),
  ];
  const heat = buildLiquidityMap(regionRows);
  const statusColor: Record<string, string> = {
    "priority-gap": "bg-destructive/15 text-destructive", empty: "bg-secondary text-muted-foreground",
    thin: "bg-amber-100 text-amber-800", building: "bg-emerald-50 text-emerald-700", healthy: "bg-emerald-100 text-emerald-800",
  };
  const runRows = runs.data ?? [];
  const latestByAgent = new Map<string, (typeof runRows)[number]>();
  for (const r of runRows) if (!latestByAgent.has(r.agent)) latestByAgent.set(r.agent, r);

  const pendingCount =
    (tasks.data?.length ?? 0) + (outreach.data?.length ?? 0) + (content.data?.length ?? 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Control Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Supervised AI operations team. Agents propose; nothing risky happens without your approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={pendingCount ? "warning" : "secondary"}>
            {pendingCount} awaiting approval
          </Badge>
          <Button asChild variant="outline" size="sm"><Link href="/admin/agents/discovery">Discovery →</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/admin/agents/prospects">Founding Pipeline →</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/admin/agents/outreach">Outreach Ops →</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/admin/agents/memory">Memory &amp; Learning →</Link></Button>
        </div>
      </div>

      {/* System kill-switch */}
      <Card className={systemPaused ? "mb-6 border-destructive bg-destructive/10" : "mb-6"}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium">{systemPaused ? "🛑 System PAUSED — all agents idle" : "System active"}</p>
            <p className="text-xs text-muted-foreground">One switch stops/starts every agent across the stack.</p>
          </div>
          <form action={setSystemPausedAction}>
            <input type="hidden" name="paused" value={systemPaused ? "false" : "true"} />
            <Button type="submit" size="sm" variant={systemPaused ? "outline" : "destructive"}>
              {systemPaused ? "Resume all agents" : "Pause all agents"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Marketplace KPIs */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Marketplace</h2>
        <Badge variant={liquidity.score >= 60 ? "success" : liquidity.score >= 30 ? "warning" : "outline"}>
          liquidity {liquidity.score}/100
        </Badge>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {kpis.map((k) => (
          <Card key={k.label} className="p-3 text-center">
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </Card>
        ))}
      </div>
      <p className="mb-6 text-xs text-muted-foreground">
        Gaps to MVP supply: +{liquidity.breakdown.storefronts.gap} storefronts · +{liquidity.breakdown.listings.gap} listings · +{liquidity.breakdown.products.gap} beef · +{liquidity.breakdown.auctions.gap} auctions. All figures are live DB counts.
      </p>

      {/* Liquidity heatmap */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Liquidity heatmap (by region)</h2>
      <div className="mb-8 flex flex-wrap gap-2">
        {heat.map((r) => (
          <span key={r.region} className={cn("rounded-md px-2.5 py-1.5 text-xs font-medium", statusColor[r.status] ?? "bg-secondary")}>
            {r.region} · {r.density} <span className="opacity-70">({r.status})</span>
          </span>
        ))}
      </div>

      {/* Agents */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Agents</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a) => {
          const last = latestByAgent.get(a.name);
          const paused = pausedAgents.has(a.name);
          return (
            <Card key={a.name} className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{a.label}</p>
                <div className="flex items-center gap-1.5">
                  {paused && <Badge variant="destructive">paused</Badge>}
                  <Badge variant={a.status === "live" ? "success" : "outline"}>{a.status}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{a.purpose}</p>
              <div className="mt-auto flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {a.schedule}{last && ` · last ${last.status}`}
                </p>
                <form action={setAgentPausedAction}>
                  <input type="hidden" name="agent" value={a.name} />
                  <input type="hidden" name="paused" value={paused ? "false" : "true"} />
                  <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    {paused ? "Resume" : "Pause"}
                  </Button>
                </form>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Approvals queue */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Approvals queue</h2>
      <div className="mb-8 space-y-3">
        {pendingCount === 0 && (
          <p className="text-sm text-muted-foreground">Nothing waiting on you. 🤠</p>
        )}

        {(tasks.data ?? []).map((t) => (
          <Card key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">{t.title}</p>
              <p className="text-sm text-muted-foreground">
                {agentLabel(t.agent)} task · {t.priority}{t.detail ? ` — ${t.detail}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <ApproveForm action={setTaskStatusAction} id={t.id} value="approved" label="Approve" />
              <ApproveForm action={setTaskStatusAction} id={t.id} value="rejected" label="Reject" variant="ghost" />
            </div>
          </Card>
        ))}

        {(outreach.data ?? []).map((o) => (
          <Card key={o.id} className="flex flex-col gap-3 p-4">
            <Badge variant="secondary" className="w-fit">Outreach · {o.channel}</Badge>
            {o.subject && <p className="font-medium">{o.subject}</p>}
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{o.body}</p>
            <div className="flex gap-2">
              <ApproveForm action={setOutreachStatusAction} id={o.id} value="approved" label="Approve (won't auto-send)" />
              <ApproveForm action={setOutreachStatusAction} id={o.id} value="rejected" label="Reject" variant="ghost" />
            </div>
          </Card>
        ))}

        {(content.data ?? []).map((c) => (
          <Card key={c.id} className="flex flex-col gap-3 p-4">
            <Badge variant="secondary" className="w-fit">Content · {c.platform} · {c.kind}</Badge>
            {c.title && <p className="font-medium">{c.title}</p>}
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{c.body}</p>
            <div className="flex gap-2">
              <ApproveForm action={setContentStatusAction} id={c.id} value="approved" label="Approve" />
              <ApproveForm action={setContentStatusAction} id={c.id} value="rejected" label="Reject" variant="ghost" />
            </div>
          </Card>
        ))}
      </div>

      {/* Open QA findings */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        Open QA findings ({findings.data?.length ?? 0})
      </h2>
      <div className="mb-8 grid gap-2">
        {(findings.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No open findings.</p>
        )}
        {(findings.data ?? []).map((f) => (
          <Card key={f.id} className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Badge variant={f.severity === "critical" || f.severity === "high" ? "destructive" : "outline"}>
                {f.severity}
              </Badge>
              <span className="ml-2 font-medium">{f.title}</span>
              <span className="ml-1 text-muted-foreground">{f.route ?? ""}</span>
            </div>
            <div className="flex shrink-0 gap-2">
              <ApproveForm action={setFindingStatusAction} id={f.id} value="resolved" label="Resolve" />
              <ApproveForm action={setFindingStatusAction} id={f.id} value="ignored" label="Ignore" variant="ghost" />
            </div>
          </Card>
        ))}
      </div>

      {/* Recent runs */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recent runs</h2>
      <div className="mb-8 grid gap-1.5">
        {runRows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No runs recorded yet. Runs appear here once the scheduled workflows execute (see /agents).
          </p>
        )}
        {runRows.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <span><span className="font-medium">{agentLabel(r.agent)}</span> · {r.trigger}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.summary ?? ""}</span>
            <Badge variant={r.status === "success" ? "success" : r.status === "failed" ? "destructive" : "outline"}>
              {r.status}
            </Badge>
            {/* "Was this useful?" — feedback feeds future retrieval ranking. */}
            <span className="text-xs text-muted-foreground">Useful?</span>
            <form action={recordFeedbackAction}>
              <input type="hidden" name="target_type" value="run" /><input type="hidden" name="target_id" value={r.id} />
              <input type="hidden" name="agent" value={r.agent} /><input type="hidden" name="rating" value="useful" />
              <Button type="submit" size="sm" variant="ghost" className="h-7 px-2">👍</Button>
            </form>
            <form action={recordFeedbackAction}>
              <input type="hidden" name="target_type" value="run" /><input type="hidden" name="target_id" value={r.id} />
              <input type="hidden" name="agent" value={r.agent} /><input type="hidden" name="rating" value="not_useful" />
              <Button type="submit" size="sm" variant="ghost" className="h-7 px-2">👎</Button>
            </form>
            <span className="shrink-0 text-xs text-muted-foreground">{fmt(r.started_at)}</span>
          </Card>
        ))}
      </div>

      {/* Safety */}
      <Card className="border-accent/30 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-base">Safety guarantees</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            {SAFETY_RULES.map((rule) => (
              <li key={rule} className="flex gap-2"><span className="text-primary">✓</span>{rule}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

function ApproveForm({
  action,
  id,
  value,
  label,
  variant = "outline",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  value: string;
  label: string;
  variant?: "outline" | "ghost";
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={value} />
      <Button type="submit" size="sm" variant={variant}>{label}</Button>
    </form>
  );
}
