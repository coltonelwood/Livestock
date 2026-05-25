import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { chatComplete, type ChatTurn } from "@/lib/ai/claude";
import {
  buildSystemPrompt,
  DEFAULT_GREETING,
  extractContact,
} from "@/lib/ai/receptionist";
import { enforce } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { entitlementsForOrg } from "@/modules/billing/entitlements";

export const runtime = "nodejs";

const bodySchema = z.object({
  organizationId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(2000),
  visitorName: z.string().trim().max(160).optional(),
});

const MAX_MESSAGES_PER_CONVERSATION = 40;

export async function POST(request: NextRequest) {
  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { organizationId, message, visitorName } = parsed;

  // Durable rate limiting. Authenticated org members hitting the dashboard test
  // panel get a generous, fail-open limit; anonymous storefront visitors get a
  // strict, FAIL-CLOSED limit (this endpoint costs model tokens).
  const ip = clientIp(request.headers);
  let authedUserId: string | null = null;
  {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (membership) authedUserId = user.id;
    }
  }

  const gate = authedUserId
    ? await enforce(
        [{ name: "authedChat", identifier: `${authedUserId}:${organizationId}` }],
        { failOpen: true },
      )
    : await enforce(
        [
          { name: "publicChat", identifier: ip },
          { name: "orgChat", identifier: organizationId },
        ],
        { failOpen: false },
      );

  if (!gate.allowed) {
    return NextResponse.json(
      {
        reply:
          "You've sent a lot of messages in a short time. Please wait a minute and try again — or reach out by phone or email.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((gate.retryAfterMs ?? 60_000) / 1000).toString(),
        },
      },
    );
  }

  const admin = createAdminClient();

  // Confirm the org exists (prevents writing conversations for random ids).
  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();
  if (!org) {
    return NextResponse.json({ error: "Unknown business." }, { status: 404 });
  }

  const [{ data: agent }, { data: profile }] = await Promise.all([
    admin
      .from("ai_agents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("ranch_profiles")
      .select("display_name, bio, location, phone, email, faq")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  // Resolve or create the conversation (web chat channel only).
  let conversationId = parsed.conversationId ?? null;
  if (conversationId) {
    const { data: convo } = await admin
      .from("conversations")
      .select("id, organization_id, lead_id")
      .eq("id", conversationId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!convo) conversationId = null;
  }
  if (!conversationId) {
    const { data: created } = await admin
      .from("conversations")
      .insert({
        organization_id: organizationId,
        agent_id: agent?.id ?? null,
        channel: "web_chat",
        status: "open",
        visitor_name: visitorName ?? null,
      })
      .select("id")
      .single();
    conversationId = created?.id ?? null;
  }
  if (!conversationId) {
    return NextResponse.json({ error: "Could not start chat." }, { status: 500 });
  }

  // Abuse guard: cap conversation length (durable, unlike in-memory limits).
  const { count } = await admin
    .from("conversation_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);
  if ((count ?? 0) >= MAX_MESSAGES_PER_CONVERSATION) {
    return NextResponse.json(
      {
        conversationId,
        reply:
          "Thanks for all the detail! I've passed this along — someone from the ranch will follow up with you directly.",
      },
      { status: 200 },
    );
  }

  await admin.from("conversation_messages").insert({
    conversation_id: conversationId,
    organization_id: organizationId,
    role: "visitor",
    content: message,
  });

  // Recent history for context.
  const { data: history } = await admin
    .from("conversation_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(24);

  const turns: ChatTurn[] = (history ?? [])
    .filter((m) => m.role === "visitor" || m.role === "assistant" || m.role === "agent")
    .map((m) => ({
      role: m.role === "visitor" ? "user" : "assistant",
      content: m.content,
    }));

  // Advanced AI (custom qualification script) is a Pro+ entitlement.
  const entitlements = await entitlementsForOrg(admin, organizationId);

  const system = buildSystemPrompt({
    orgName: org.name,
    profile: profile ?? null,
    agent: agent ?? null,
    advancedAI: entitlements.advancedAI,
  });

  let result;
  try {
    result = await chatComplete(system, turns);
  } catch {
    return NextResponse.json(
      {
        conversationId,
        reply:
          agent?.greeting ||
          "Thanks for reaching out! Our team will follow up with you shortly.",
      },
      { status: 200 },
    );
  }

  await admin.from("conversation_messages").insert({
    conversation_id: conversationId,
    organization_id: organizationId,
    role: "assistant",
    content: result.text,
  });

  await admin.from("ai_interactions").insert({
    organization_id: organizationId,
    agent_id: agent?.id ?? null,
    conversation_id: conversationId,
    model: result.model,
    prompt_tokens: result.inputTokens,
    completion_tokens: result.outputTokens,
    latency_ms: result.latencyMs,
  });

  // Lead capture: if the visitor has shared contact info, ensure a lead exists.
  await maybeCaptureLead(admin, {
    organizationId,
    conversationId,
    visitorName: visitorName ?? null,
    visitorMessages: (history ?? [])
      .filter((m) => m.role === "visitor")
      .map((m) => m.content),
  });

  return NextResponse.json({ conversationId, reply: result.text });
}

async function maybeCaptureLead(
  admin: ReturnType<typeof createAdminClient>,
  args: {
    organizationId: string;
    conversationId: string;
    visitorName: string | null;
    visitorMessages: string[];
  },
) {
  const { data: convo } = await admin
    .from("conversations")
    .select("lead_id, visitor_contact")
    .eq("id", args.conversationId)
    .maybeSingle();
  if (convo?.lead_id) return; // already captured

  const joined = args.visitorMessages.join("\n");
  const { email, phone } = extractContact(joined);
  if (!email && !phone && !args.visitorName) return;

  const { data: lead } = await admin
    .from("leads")
    .insert({
      organization_id: args.organizationId,
      conversation_id: args.conversationId,
      source: "web_chat",
      status: "new",
      name: args.visitorName,
      email,
      phone,
      summary: args.visitorMessages[0]?.slice(0, 500) ?? null,
    })
    .select("id")
    .single();

  if (lead) {
    await admin
      .from("conversations")
      .update({ lead_id: lead.id, visitor_contact: email ?? phone })
      .eq("id", args.conversationId);
  }
}

// Allow simple no-arg GET for health checks / greeting.
export async function GET() {
  return NextResponse.json({ greeting: DEFAULT_GREETING });
}
