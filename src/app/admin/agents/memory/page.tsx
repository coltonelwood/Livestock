import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { agentLabel } from "@/lib/agents/registry";
import {
  setMemoryStatusAction, pinMemoryAction, editMemoryAction, deleteMemoryAction,
  setLessonStatusAction, resolvePlaybookUpdateAction, setExperimentDecisionAction,
} from "@/modules/admin/memory-actions";

export const metadata: Metadata = { title: "Admin · Agent Memory & Learning" };
export const dynamic = "force-dynamic";

function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}

export default async function AgentMemoryPage() {
  const supabase = await createClient();
  const [pendingLessons, memories, lessons, playbooks, experiments, metrics] = await Promise.all([
    supabase.from("agent_lessons").select("*").eq("status", "proposed").order("confidence_score", { ascending: false }).limit(50),
    supabase.from("agent_memories").select("*").neq("status", "archived").order("pinned", { ascending: false }).order("confidence_score", { ascending: false }).limit(60),
    supabase.from("agent_lessons").select("*").neq("status", "proposed").order("updated_at", { ascending: false }).limit(20),
    supabase.from("agent_playbooks").select("*").order("title").limit(20),
    supabase.from("agent_experiments").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("agent_performance_metrics").select("*").order("created_at", { ascending: false }).limit(60),
  ]);

  const pendingPlaybooks = (playbooks.data ?? []).filter((p) => p.status === "pending_update" && p.pending_changes);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Memory &amp; Learning</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What the agents have learned. Lessons & playbook changes are authoritative only after you approve them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/admin/agents">← Control Center</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/admin/agents/export" target="_blank">Export audit</Link></Button>
        </div>
      </div>

      {/* Pending approvals */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        Pending lesson approvals ({pendingLessons.data?.length ?? 0})
      </h2>
      <div className="mb-8 grid gap-2">
        {(pendingLessons.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No lessons awaiting review.</p>}
        {(pendingLessons.data ?? []).map((l) => (
          <Card key={l.id} className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Badge variant="outline">{agentLabel(l.agent)} · {l.category}</Badge>
              <span className="ml-2">{l.lesson}</span>
              <span className="ml-1 text-muted-foreground">(seen {l.evidence_count}×, conf {Math.round((l.confidence_score ?? 0) * 100)}%)</span>
            </div>
            <div className="flex shrink-0 gap-2">
              <form action={setLessonStatusAction}><Hidden name="id" value={l.id} /><Hidden name="status" value="approved" /><Button size="sm" variant="outline">Approve → memory</Button></form>
              <form action={setLessonStatusAction}><Hidden name="id" value={l.id} /><Hidden name="status" value="rejected" /><Button size="sm" variant="ghost">Reject</Button></form>
            </div>
          </Card>
        ))}
      </div>

      {/* Playbook change requests */}
      {pendingPlaybooks.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Playbook change requests</h2>
          <div className="mb-8 grid gap-2">
            {pendingPlaybooks.map((p) => (
              <Card key={p.id} className="flex flex-col gap-2 p-4">
                <p className="font-medium">{p.title} <span className="text-xs text-muted-foreground">proposed by {p.proposed_by}</span></p>
                <pre className="overflow-x-auto rounded bg-secondary p-2 text-xs">{JSON.stringify(p.pending_changes, null, 2)}</pre>
                <div className="flex gap-2">
                  <form action={resolvePlaybookUpdateAction}><Hidden name="id" value={p.id} /><Hidden name="decision" value="approve" /><Button size="sm" variant="outline">Approve change</Button></form>
                  <form action={resolvePlaybookUpdateAction}><Hidden name="id" value={p.id} /><Hidden name="decision" value="reject" /><Button size="sm" variant="ghost">Discard</Button></form>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Memories */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Memories ({memories.data?.length ?? 0})</h2>
      <div className="mb-8 grid gap-2">
        {(memories.data ?? []).map((m) => (
          <Card key={m.id} className="flex flex-col gap-2 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {m.pinned && <Badge variant="success">pinned</Badge>}
              <Badge variant="secondary">{m.memory_type}</Badge>
              <Badge variant="outline">{m.scope}{m.agent ? ` · ${agentLabel(m.agent)}` : ""}</Badge>
              <span className="text-xs text-muted-foreground">conf {Math.round((m.confidence_score ?? 0) * 100)}%{m.status !== "active" ? ` · ${m.status}` : ""}</span>
            </div>
            <form action={editMemoryAction} className="flex gap-2">
              <Hidden name="id" value={m.id} />
              <Input name="summary" defaultValue={m.summary} className="h-9 text-sm" />
              <Button size="sm" variant="outline" type="submit">Save</Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <form action={pinMemoryAction}><Hidden name="id" value={m.id} /><Hidden name="pinned" value={String(!m.pinned)} /><Button size="sm" variant="ghost">{m.pinned ? "Unpin" : "Pin"}</Button></form>
              {m.status === "active"
                ? <form action={setMemoryStatusAction}><Hidden name="id" value={m.id} /><Hidden name="status" value="rejected" /><Button size="sm" variant="ghost">Reject</Button></form>
                : <form action={setMemoryStatusAction}><Hidden name="id" value={m.id} /><Hidden name="status" value="active" /><Button size="sm" variant="ghost">Re-activate</Button></form>}
              <form action={deleteMemoryAction}><Hidden name="id" value={m.id} /><Button size="sm" variant="destructive">Delete</Button></form>
            </div>
          </Card>
        ))}
        {(memories.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No memories yet — they accrue as agents run.</p>}
      </div>

      {/* Playbooks */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Playbooks</h2>
      <div className="mb-8 grid gap-2 sm:grid-cols-2">
        {(playbooks.data ?? []).map((p) => (
          <Card key={p.id} className="p-4">
            <p className="font-medium">{p.title} <Badge variant="outline" className="ml-1">v{p.version}</Badge></p>
            <p className="mt-1 text-xs text-muted-foreground">{p.objective}</p>
            {p.steps && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{p.steps}</p>}
          </Card>
        ))}
      </div>

      {/* Experiments */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Experiments</h2>
      <div className="mb-8 grid gap-2">
        {(experiments.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No experiments yet.</p>}
        {(experiments.data ?? []).map((e) => (
          <Card key={e.id} className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Badge variant="outline">{e.status}</Badge>
              {e.requires_spend && <Badge variant="warning" className="ml-1">needs spend approval</Badge>}
              <span className="ml-2 font-medium">{e.name}</span>
              <span className="ml-1 text-muted-foreground">— {e.hypothesis}</span>
            </div>
            <div className="flex shrink-0 gap-2">
              <form action={setExperimentDecisionAction}><Hidden name="id" value={e.id} /><Hidden name="status" value="adopted" /><Button size="sm" variant="outline">Adopt</Button></form>
              <form action={setExperimentDecisionAction}><Hidden name="id" value={e.id} /><Hidden name="status" value="rejected" /><Button size="sm" variant="ghost">Reject</Button></form>
            </div>
          </Card>
        ))}
      </div>

      {/* Performance */}
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Recent performance metrics</h2>
      <div className="grid gap-1.5">
        {(metrics.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No metrics recorded yet.</p>}
        {(metrics.data ?? []).slice(0, 24).map((m) => (
          <Card key={m.id} className="flex items-center justify-between gap-3 p-2.5 text-sm">
            <span><span className="font-medium">{agentLabel(m.agent)}</span> · {m.metric}{m.period ? ` · ${m.period}` : ""}</span>
            <span className="font-mono">{m.value}</span>
          </Card>
        ))}
      </div>
    </>
  );
}
