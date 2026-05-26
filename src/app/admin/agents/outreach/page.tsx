import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";
import {
  setAutonomyAction, setOutboundStatusAction, addSuppressionAction,
  logInboundReplyAction, markReplyHandledAction,
} from "@/modules/admin/outreach-actions";

export const metadata: Metadata = { title: "Admin · Outreach Operations" };
export const dynamic = "force-dynamic";

function H({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

export default async function OutreachOpsPage() {
  const supabase = await createClient();
  const [autonomy, outbound, suppression, replies] = await Promise.all([
    supabase.from("agent_autonomy").select("*").order("agent"),
    supabase.from("outbound_messages").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("suppression_list").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("inbound_replies").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  const msgs = outbound.data ?? [];
  const by = (s: string) => msgs.filter((m) => m.status === s);
  const sent = by("sent").length;
  const repliesArr = replies.data ?? [];
  const replyRate = sent ? Math.round((repliesArr.length / sent) * 100) : null;
  const classBreakdown = repliesArr.reduce<Record<string, number>>((a, r) => {
    const k = r.classification ?? "unclassified"; a[k] = (a[k] ?? 0) + 1; return a;
  }, {});

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outreach Operations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Supervised Tier-2 communication. Sending is <strong>disarmed by default</strong> and gated by the send-safety system — nothing goes out blind.
          </p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/admin/agents">← Control Center</Link></Button>
      </div>

      {/* Autonomy / arming */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Autonomy & arming (Tier 2)</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {(autonomy.data ?? []).length === 0 && (
          <Card className="p-4 text-sm text-muted-foreground">No Tier-2 agents configured yet (migration not applied on this environment).</Card>
        )}
        {(autonomy.data ?? []).map((a) => (
          <Card key={a.agent} className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium capitalize">{a.agent}</p>
              <Badge variant={a.outreach_armed ? "warning" : "secondary"}>{a.outreach_armed ? "ARMED" : "disarmed"}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Tier {a.tier} · daily cap {a.daily_send_cap} · cooldown {a.cooldown_days}d</p>
            {!a.outreach_armed && (
              <p className="mt-2 rounded bg-secondary p-2 text-xs text-muted-foreground">
                Disarmed — every message holds for approval. Arming also requires a configured, compliant email provider before anything sends.
              </p>
            )}
            <form action={setAutonomyAction} className="mt-3 flex items-center gap-2">
              <H name="agent" value={a.agent} />
              <H name="outreach_armed" value={a.outreach_armed ? "false" : "true"} />
              <Input name="daily_send_cap" type="number" min="0" max="50" defaultValue={a.daily_send_cap} className="h-8 w-20 text-xs" />
              <Button type="submit" size="sm" variant={a.outreach_armed ? "ghost" : "outline"}>
                {a.outreach_armed ? "Disarm" : "Arm (with cap)"}
              </Button>
            </form>
          </Card>
        ))}
      </div>

      {/* Analytics */}
      <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[["held", by("held").length], ["approved", by("approved").length], ["sent", sent], ["suppressed", by("suppressed").length], ["replies", repliesArr.length]].map(([k, v]) => (
          <Card key={k as string} className="p-3 text-center">
            <p className="text-2xl font-bold">{v as number}</p>
            <p className="text-xs capitalize text-muted-foreground">{k as string}</p>
          </Card>
        ))}
      </div>
      {replyRate != null && <p className="mb-8 text-sm text-muted-foreground">Reply rate {replyRate}% · {Object.entries(classBreakdown).map(([k, n]) => `${k}:${n}`).join(" · ")}</p>}

      {/* Outbound queue + send log */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Outbound queue & send log</h2>
      <div className="mb-8 grid gap-2">
        {msgs.length === 0 && <p className="text-sm text-muted-foreground">No outbound messages. Approve outreach drafts in the Control Center, then enqueue them.</p>}
        {msgs.slice(0, 40).map((m) => (
          <Card key={m.id} className="flex flex-col gap-2 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={m.status === "sent" ? "success" : m.status === "failed" ? "destructive" : m.status === "approved" ? "outline" : "secondary"}>{m.status}</Badge>
              <Badge variant={m.spam_risk >= 40 ? "destructive" : "outline"}>spam {m.spam_risk}</Badge>
              <span className="text-muted-foreground">{m.channel} → {m.to_contact ?? "(no contact)"}</span>
              {m.hold_reason && <span className="text-xs text-muted-foreground">· {m.hold_reason}</span>}
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">{m.body}</p>
            {(m.status === "held" || m.status === "approved") && (
              <div className="flex gap-2">
                {m.status === "held"
                  ? <form action={setOutboundStatusAction}><H name="id" value={m.id} /><H name="status" value="approved" /><Button size="sm" variant="outline">Approve</Button></form>
                  : <form action={setOutboundStatusAction}><H name="id" value={m.id} /><H name="status" value="held" /><Button size="sm" variant="ghost">Hold</Button></form>}
                <form action={setOutboundStatusAction}><H name="id" value={m.id} /><H name="status" value="cancelled" /><Button size="sm" variant="ghost">Cancel</Button></form>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Inbound replies */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Inbound replies</h2>
      <Card className="mb-3 p-4">
        <form action={logInboundReplyAction} className="space-y-2">
          <p className="text-xs text-muted-foreground">Paste a reply to classify it + auto-advance the prospect (suppresses on a clear &quot;no&quot;).</p>
          <div className="grid grid-cols-2 gap-2">
            <Input name="from_contact" placeholder="From (email)" />
            <Input name="prospect_id" placeholder="Prospect ID (optional)" />
          </div>
          <Textarea name="body" rows={2} placeholder="Reply text…" />
          <Button type="submit" size="sm">Classify reply</Button>
        </form>
      </Card>
      <div className="mb-8 grid gap-2">
        {repliesArr.map((r) => (
          <Card key={r.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <div className="min-w-0">
              <Badge variant="outline">{r.classification}</Badge>
              <span className="ml-2 text-muted-foreground">{r.from_contact}</span>
              <p className="line-clamp-1 text-xs text-muted-foreground">{r.body}</p>
            </div>
            {!r.handled && <form action={markReplyHandledAction}><H name="id" value={r.id} /><Button size="sm" variant="ghost">Mark handled</Button></form>}
          </Card>
        ))}
        {repliesArr.length === 0 && <p className="text-sm text-muted-foreground">No replies logged.</p>}
      </div>

      {/* Suppression */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Suppression list (never contacted)</h2>
      <Card className="p-4">
        <form action={addSuppressionAction} className="mb-3 flex gap-2">
          <Input name="contact" placeholder="email to suppress" className="max-w-xs" />
          <Select name="reason" className="h-10 w-40"><option value="opt_out">opt-out</option><option value="manual">manual</option><option value="bounce">bounce</option><option value="complaint">complaint</option><option value="hard_block">hard block</option></Select>
          <Button type="submit" size="sm">Suppress</Button>
        </form>
        <div className="grid gap-1 text-sm">
          {(suppression.data ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between"><span>{s.contact}</span><Badge variant="outline">{s.reason}</Badge></div>
          ))}
          {(suppression.data ?? []).length === 0 && <p className="text-xs text-muted-foreground">No suppressed contacts.</p>}
        </div>
      </Card>
    </>
  );
}
