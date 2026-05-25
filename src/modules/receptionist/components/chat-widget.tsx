"use client";

import { useActionState, useRef, useState } from "react";
import { Send, Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  captureChatLeadAction,
  type ChatLeadState,
} from "@/modules/receptionist/actions";

type Msg = { role: "visitor" | "assistant"; content: string };

const UNAVAILABLE_MESSAGE =
  "Chat is temporarily unavailable. Please use the contact form or call the seller.";

export function ChatWidget({
  organizationId,
  businessName,
  greeting,
}: {
  organizationId: string;
  businessName: string;
  greeting?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: greeting || `Hi! You're chatting with ${businessName}. How can I help?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const conversationId = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    setMessages((m) => [...m, { role: "visitor", content: text }]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/receptionist/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          conversationId: conversationId.current ?? undefined,
          message: text,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.conversationId) conversationId.current = data.conversationId;
      // 503 + unavailable flag = the service can't run the assistant right now;
      // surface a clear message and drop in the fallback contact form.
      if (res.status === 503 || data.unavailable) setUnavailable(true);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.reply ?? UNAVAILABLE_MESSAGE,
        },
      ]);
    } catch {
      setUnavailable(true);
      setMessages((m) => [...m, { role: "assistant", content: UNAVAILABLE_MESSAGE }]);
    } finally {
      setPending(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
    }
  }

  return (
    <div className="flex h-[28rem] flex-col rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b p-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">{businessName}</p>
          <p className="text-xs text-muted-foreground">Lead Assistant</p>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              m.role === "visitor" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                m.role === "visitor"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              Typing…
            </div>
          </div>
        )}
        {unavailable && (
          <FallbackContactForm organizationId={organizationId} />
        )}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          aria-label="Message"
          disabled={unavailable}
        />
        <Button type="submit" size="icon" disabled={pending || unavailable || !input.trim()}>
          <Send className="size-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}

/** Shown inside the chat when the assistant can't run — captures the lead anyway. */
function FallbackContactForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState<ChatLeadState, FormData>(
    captureChatLeadAction,
    {},
  );

  if (state.success) {
    return (
      <div className="rounded-md border bg-secondary p-3 text-sm" role="status">
        Thanks — your details were sent to the seller. They&apos;ll be in touch soon.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2 rounded-md border bg-background p-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="hidden" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="text-sm font-medium">Leave your details</p>
      <div className="space-y-1">
        <Label htmlFor="fallback-name" className="text-xs">Your name</Label>
        <Input id="fallback-name" name="name" defaultValue={state.values?.name ?? ""} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="fallback-contact" className="text-xs">Phone or email</Label>
        <Input id="fallback-contact" name="contact" defaultValue={state.values?.contact ?? ""} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="fallback-message" className="text-xs">Message (optional)</Label>
        <Textarea
          id="fallback-message"
          name="message"
          rows={2}
          defaultValue={state.values?.message ?? ""}
        />
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" size="sm" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send to seller"}
      </Button>
    </form>
  );
}
