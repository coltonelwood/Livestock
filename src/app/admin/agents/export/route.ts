import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";

/** Export the agent memory + audit trail as JSON (platform admin only). */
export async function GET() {
  const profile = await getProfile();
  if (!profile || profile.platform_role !== "platform_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const supabase = await createClient();
  const [memories, lessons, decisions, feedback, playbooks, metrics] = await Promise.all([
    supabase.from("agent_memories").select("*").order("created_at", { ascending: false }).limit(1000),
    supabase.from("agent_lessons").select("*").order("created_at", { ascending: false }).limit(1000),
    supabase.from("agent_decisions").select("*").order("created_at", { ascending: false }).limit(1000),
    supabase.from("agent_feedback").select("*").order("created_at", { ascending: false }).limit(1000),
    supabase.from("agent_playbooks").select("*"),
    supabase.from("agent_performance_metrics").select("*").order("created_at", { ascending: false }).limit(1000),
  ]);
  const payload = {
    exported_at: new Date().toISOString(),
    memories: memories.data ?? [],
    lessons: lessons.data ?? [],
    decisions: decisions.data ?? [],
    feedback: feedback.data ?? [],
    playbooks: playbooks.data ?? [],
    performance_metrics: metrics.data ?? [],
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="agent-memory-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
