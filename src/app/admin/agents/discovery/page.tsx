import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { formatUtc } from "@/lib/utils";
import { canRunSource } from "../../../../../agents/lib/discovery.mjs";
import {
  approveSourceAction, setSourceEnabledAction, runDiscoveryAction,
  promoteResultAction, rejectResultAction,
} from "@/modules/admin/discovery-actions";

export const metadata: Metadata = { title: "Admin · Discovery Command Center" };
export const dynamic = "force-dynamic";

const fmt = formatUtc;
function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

const BLOCK_REASON: Record<string, string> = {
  no_source: "no source", disabled: "disabled", not_approved: "not approved",
  terms_not_confirmed: "terms not confirmed", rate_limit_exceeded: "daily cap reached", ok: "ready",
};

export default async function DiscoveryCommandCenterPage() {
  const supabase = await createClient();
  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
  const [sources, policies, runs, results, todayRuns] = await Promise.all([
    supabase.from("discovery_sources").select("*").order("created_at", { ascending: true }),
    supabase.from("discovery_source_policies").select("*"),
    supabase.from("discovery_runs").select("*").order("started_at", { ascending: false }).limit(25),
    supabase.from("discovery_results").select("*").eq("included", true).is("prospect_id", null).order("fit_score", { ascending: false }).limit(200),
    supabase.from("discovery_runs").select("source_id").gte("started_at", startOfDay.toISOString()),
  ]);
  const sourceRows = sources.data ?? [];
  const policyRows = policies.data ?? [];
  const runRows = runs.data ?? [];
  const resultRows = results.data ?? [];

  const runsTodayBySource = new Map<string, number>();
  for (const r of todayRuns.data ?? []) {
    if (r.source_id) runsTodayBySource.set(r.source_id, (runsTodayBySource.get(r.source_id) ?? 0) + 1);
  }
  const sourceName = new Map(sourceRows.map((s) => [s.id, s.name]));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discovery Command Center</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Scalable prospect discovery from <strong>official APIs only</strong> (no scraping). A source can run only after you approve it, confirm its terms, enable it, and it&apos;s under its daily cap. Discovery only <strong>stages</strong> findings for review — it never contacts anyone.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/admin/agents/prospects">Founding Pipeline →</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/admin/agents">← Control Center</Link></Button>
        </div>
      </div>

      {/* Sources + governance */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Sources &amp; governance</h2>
      <div className="mb-8 grid gap-3">
        {sourceRows.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No discovery sources configured. Run migration <code>0025_discovery_connectors.sql</code> to seed the Google Places connector.
          </Card>
        )}
        {sourceRows.map((s) => {
          const policy = policyRows.find((p) => p.source_type === s.source_type);
          const runsToday = runsTodayBySource.get(s.id) ?? 0;
          const gov = canRunSource(s, runsToday);
          const queries = Array.isArray((s.config as { queries?: unknown }).queries)
            ? ((s.config as { queries?: string[] }).queries ?? []) : [];
          const defaultQuery = String(queries[0] ?? "");
          return (
            <Card key={s.id} className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{s.name}</span>
                <Badge variant="outline">{s.source_type}</Badge>
                <Badge variant={s.approved_by_admin ? "success" : "outline"}>{s.approved_by_admin ? "approved" : "not approved"}</Badge>
                <Badge variant={s.allowed_by_terms ? "success" : "outline"}>{s.allowed_by_terms ? "terms ok" : "terms unconfirmed"}</Badge>
                <Badge variant={s.enabled ? "success" : "secondary"}>{s.enabled ? "enabled" : "disabled"}</Badge>
                <Badge variant={gov.allowed ? "success" : "warning"} className="ml-auto">
                  {gov.allowed ? "ready to run" : BLOCK_REASON[gov.reason] ?? gov.reason}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>Daily cap: {runsToday}/{s.rate_limit_per_day}</span>
                <span>Last run: {fmt(s.last_run_at)}</span>
                <span>Extractor enrich: {s.enrich_via_extractor ? "on" : "off"}</span>
                {policy?.terms_url && (
                  <a href={policy.terms_url} target="_blank" rel="noopener noreferrer" className="underline">Terms ↗</a>
                )}
              </div>
              {policy && (
                <p className="text-xs text-muted-foreground">
                  Allowed fields: {policy.allowed_fields.join(", ") || "—"}
                </p>
              )}
              {queries.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {queries.length} configured queries · default: <span className="font-mono">{defaultQuery}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                <form action={approveSourceAction}>
                  <Hidden name="id" value={s.id} />
                  <Hidden name="approve" value={s.approved_by_admin ? "false" : "true"} />
                  <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
                    {s.approved_by_admin ? "Revoke approval" : "Approve (terms + robots attested)"}
                  </Button>
                </form>
                <form action={setSourceEnabledAction}>
                  <Hidden name="id" value={s.id} />
                  <Hidden name="enabled" value={s.enabled ? "false" : "true"} />
                  <Button type="submit" size="sm" variant="ghost" className="h-8 text-xs">
                    {s.enabled ? "Disable" : "Enable"}
                  </Button>
                </form>
                <form action={runDiscoveryAction} className="ml-auto flex items-center gap-2">
                  <Hidden name="source_id" value={s.id} />
                  <Input name="query" defaultValue={defaultQuery} placeholder="search query" className="h-8 w-64 text-xs" />
                  <Button type="submit" size="sm" disabled={!gov.allowed} className="h-8 text-xs">Run discovery</Button>
                </form>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Review queue */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        Review queue — staged findings ({resultRows.length})
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Promote moves a finding into the Founding Pipeline at stage <strong>discovered</strong> (enriching from its own website if policy allows). Nothing is contacted.
      </p>
      <div className="mb-8 grid gap-2">
        {resultRows.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No findings awaiting review. Run an approved + enabled source above.
          </Card>
        )}
        {resultRows.map((r) => (
          <Card key={r.id} className="flex flex-col gap-2 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {r.fit_score != null && (
                <Badge variant={r.fit_score >= 8 ? "success" : r.fit_score >= 5 ? "secondary" : "outline"}>fit {r.fit_score}</Badge>
              )}
              <span className="font-medium">{r.business_name}</span>
              <span className="text-muted-foreground">{[r.state, r.phone].filter(Boolean).join(" · ")}</span>
              <Badge variant="outline" className="ml-auto">{r.source}</Badge>
            </div>
            {r.address && <p className="text-xs text-muted-foreground">{r.address}</p>}
            <div className="flex flex-wrap items-center gap-2">
              {r.website && (
                <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-xs underline">{r.website}</a>
              )}
              <form action={promoteResultAction} className="ml-auto">
                <Hidden name="id" value={r.id} />
                <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">Promote to pipeline</Button>
              </form>
              <form action={rejectResultAction}>
                <Hidden name="id" value={r.id} />
                <Button type="submit" size="sm" variant="ghost" className="h-8 text-xs text-destructive">Reject</Button>
              </form>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent runs */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recent runs</h2>
      <div className="grid gap-1.5">
        {runRows.length === 0 && (
          <p className="text-sm text-muted-foreground">No discovery runs yet.</p>
        )}
        {runRows.map((run) => (
          <Card key={run.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <span className="font-medium">{sourceName.get(run.source_id ?? "") ?? "—"}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {run.query ?? ""}
              {run.status === "success" && ` · ${run.staged} staged / ${run.duplicates_removed} dup / ${run.rejected} rejected (${run.high_fit} high-fit)`}
              {run.error && ` · ${run.error}`}
            </span>
            <Badge variant={run.status === "success" ? "success" : run.status === "blocked" ? "warning" : run.status === "failed" ? "destructive" : "outline"}>
              {run.status}
            </Badge>
            <span className="shrink-0 text-xs text-muted-foreground">{fmt(run.started_at)}</span>
          </Card>
        ))}
      </div>
    </>
  );
}
