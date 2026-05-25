import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { aiEnv } from "@/lib/env";

let client: Anthropic | null = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: aiEnv().ANTHROPIC_API_KEY });
  }
  return client;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

/**
 * Single-shot chat completion for the receptionist. `system` is fully
 * assembled server-side; `messages` carry only conversation turns. Visitor text
 * is data, never instructions.
 */
export async function chatComplete(
  system: string,
  messages: ChatTurn[],
): Promise<ChatResult> {
  const model = aiEnv().ANTHROPIC_MODEL;
  const started = Date.now();

  const response = await getClient().messages.create({
    model,
    max_tokens: 1024,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return {
    text: text || "Sorry, I didn't catch that — could you say it another way?",
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs: Date.now() - started,
  };
}
