import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";
import { STAGES, stageCounts, TOP_REGIONS } from "@/lib/agents/prospect-score";
import {
  addProspectAction, importCsvAction, setProspectStageAction,
  deleteProspectAction, addReferrerAction, draftOutreachForProspectAction,
} from "@/modules/admin/prospect-actions";

export const metadata: Metadata = { title: "Admin · Founding Ranch Pipeline" };
export const dynamic = "force-dynamic";

const SIGNALS: [string, string][] = [
  ["sells_cattle", "Sells cattle"], ["sells_beef", "Sells freezer beef"],
  ["weak_website", "Weak/no website"], ["active_social", "Active on FB/IG"],
  ["uses_messenger", "Leads via Messenger/text"], ["runs_auctions", "Runs auctions"],
  ["good_photos", "Good photos"], ["owner_operated", "Owner-operated"],
];

function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

export default async function FoundingProspectsPage() {
  const supabase = await createClient();
  const [prospects, referrers] = await Promise.all([
    supabase.from("founding_prospects").select("*").order("fit_score", { ascending: false }).order("created_at", { ascending: false }).limit(300),
    supabase.from("prospect_referrers").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  const rows = prospects.data ?? [];
  const counts = stageCounts(rows);
  const contacted = counts.contacted + counts.responded + counts.onboarding + counts.active + counts.inactive;
  const responded = counts.responded + counts.onboarding + counts.active + counts.inactive;
  const replyRate = contacted ? Math.round((responded / contacted) * 100) : null;
  const activeRate = responded ? Math.round((counts.active / responded) * 100) : null;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Founding Ranch Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real prospects only — from your lists, referrals, and approved public sources. Scored, deduped, stage-tracked. Outreach is drafted for your approval; nothing is sent automatically.
          </p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/admin/agents">← Control Center</Link></Button>
      </div>

      {/* Pipeline funnel */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {STAGES.map((s) => (
          <Card key={s} className="p-3 text-center">
            <p className="text-2xl font-bold">{counts[s]}</p>
            <p className="text-xs capitalize text-muted-foreground">{s}</p>
          </Card>
        ))}
      </div>
      <p className="mb-8 text-sm text-muted-foreground">
        {rows.length} prospect(s){replyRate != null ? ` · reply rate ${replyRate}%` : ""}{activeRate != null ? ` · responded→active ${activeRate}%` : ""}.
        Conversion is measured on real outcomes — no vanity counts.
      </p>

      {/* Import + manual entry */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Import CSV</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">
              Paste rows matching <code>docs/growth/prospects-template.csv</code>. Scored + deduped on import. Use only data you&apos;re allowed to use.
            </p>
            <form action={importCsvAction} className="space-y-2">
              <Textarea name="csv" rows={6} placeholder="business_name,state,sells_beef,uses_messenger,...&#10;Elk Ridge Beef,CO,yes,yes,..." className="font-mono text-xs" />
              <Button type="submit" size="sm">Import &amp; score</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Add a prospect</CardTitle></CardHeader>
          <CardContent>
            <form action={addProspectAction} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input name="business_name" placeholder="Ranch / business name *" required className="col-span-2" />
                <Input name="contact_name" placeholder="Owner / contact" />
                <Input name="state" placeholder="State (CO, WY…)" />
                <Input name="phone" placeholder="Phone" />
                <Input name="email" placeholder="Email" />
                <Input name="website" placeholder="Website" />
                <Input name="social_url" placeholder="Public FB/IG URL" />
                <Input name="what_they_sell" placeholder="What they sell" className="col-span-2" />
                <Input name="source_url" placeholder="Source URL (where you found them)" className="col-span-2" />
              </div>
              <div className="grid grid-cols-2 gap-1 py-1 text-xs">
                {SIGNALS.map(([k, label]) => (
                  <label key={k} className="flex items-center gap-1.5"><input type="checkbox" name={k} className="size-3.5" />{label}</label>
                ))}
              </div>
              <Button type="submit" size="sm">Add &amp; score</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Prospects */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Prospects (top fit first)</h2>
      <div className="mb-8 grid gap-2">
        {rows.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No prospects yet. Import a CSV or add one above. Priority geography with zero inventory today: <strong>{TOP_REGIONS.join(", ")}</strong>.
          </Card>
        )}
        {rows.map((p) => (
          <Card key={p.id} className="flex flex-col gap-2 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={p.fit_score >= 8 ? "success" : p.fit_score >= 5 ? "secondary" : "outline"}>fit {p.fit_score}</Badge>
              <span className="font-medium">{p.business_name}</span>
              <span className="text-muted-foreground">{[p.contact_name, p.county, p.state].filter(Boolean).join(" · ")}</span>
              <Badge variant="outline" className="ml-auto capitalize">{p.stage}</Badge>
            </div>
            {p.what_they_sell && <p className="text-xs text-muted-foreground">{p.what_they_sell}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <form action={setProspectStageAction} className="flex items-center gap-1">
                <Hidden name="id" value={p.id} />
                <Select name="stage" defaultValue={p.stage} className="h-8 text-xs">
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Button type="submit" size="sm" variant="ghost" className="h-8">Set stage</Button>
              </form>
              {["storefront", "leads", "beef", "auction", "founding"].map((angle) => (
                <form key={angle} action={draftOutreachForProspectAction}>
                  <Hidden name="id" value={p.id} /><Hidden name="angle" value={angle} /><Hidden name="channel" value="social_dm" />
                  <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">Draft: {angle}</Button>
                </form>
              ))}
              <form action={deleteProspectAction} className="ml-auto">
                <Hidden name="id" value={p.id} />
                <Button type="submit" size="sm" variant="ghost" className="h-8 text-destructive">Delete</Button>
              </form>
            </div>
          </Card>
        ))}
      </div>

      {/* Referrers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Referral sources</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <form action={addReferrerAction} className="grid grid-cols-2 gap-2">
              <Input name="name" placeholder="Referrer name *" required />
              <Select name="type" className="h-10"><option value="rancher">Rancher</option><option value="auction">Auction</option><option value="beef_buyer">Beef buyer</option><option value="partner">Partner</option><option value="other">Other</option></Select>
              <Input name="contact" placeholder="Contact" />
              <Input name="reward_note" placeholder="Reward / note" />
              <Button type="submit" size="sm" className="col-span-2 w-fit">Add referrer</Button>
            </form>
            <div className="grid gap-1">
              {(referrers.data ?? []).map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span>{r.name} <Badge variant="outline" className="ml-1">{r.type}</Badge></span>
                  <span className="text-xs text-muted-foreground">{r.contact}</span>
                </div>
              ))}
              {(referrers.data ?? []).length === 0 && <p className="text-xs text-muted-foreground">No referral sources yet.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/30 bg-accent/5">
          <CardHeader><CardTitle className="text-base">Founding Ranch program</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="grid gap-1.5">
              <li>• Early access + free, hands-on manual onboarding (we set them up).</li>
              <li>• Direct founder support; feedback partnership.</li>
              <li>• Lifetime &quot;Founding Rancher&quot; discount (confirm before any billing change).</li>
              <li>• Stages: discovered → reviewed → approved → contacted → responded → onboarding → active.</li>
              <li>• Liquidity priority: freezer-beef sellers first, then seedstock/bulls, then cow-calf, then small auctions — in {TOP_REGIONS.join("/")}.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
