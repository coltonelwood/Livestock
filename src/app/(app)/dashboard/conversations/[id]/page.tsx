import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireOrg();
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("id", id)
    .maybeSingle();

  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/conversations"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All conversations
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          {conversation.visitor_name || conversation.visitor_contact || "Website visitor"}
        </h1>
        <div className="flex items-center gap-2">
          {conversation.lead_id && (
            <Link href="/dashboard/leads">
              <Badge variant="success">View lead</Badge>
            </Link>
          )}
          <Badge variant="secondary">{conversation.channel.replace("_", " ")}</Badge>
        </div>
      </div>

      <div className="space-y-3">
        {(messages ?? []).map((m) => {
          const fromVisitor = m.role === "visitor";
          return (
            <div key={m.id} className={cn("flex", fromVisitor ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  fromVisitor ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={cn("mt-1 text-[10px] opacity-70")}>
                  {m.role} · {new Date(m.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          );
        })}
        {(!messages || messages.length === 0) && (
          <p className="text-sm text-muted-foreground">No messages.</p>
        )}
      </div>
    </div>
  );
}
