// Pure reply classifier (rule-based; ready to swap for an LLM later). Maps an
// inbound reply to one of the workflow categories + a rough confidence, and
// suggests the CRM stage + whether the contact should be suppressed.

const RULES = [
  ["spam_bounce", /\b(mailer-daemon|delivery (?:failed|status)|undeliverable|out of office|auto[-\s]?reply|unsubscribe me|remove me)\b/i],
  ["not_interested", /\b(not interested|no thanks?|no thank you|pass\b|stop (?:emailing|contacting)|don'?t (?:contact|email)|take me off)\b/i],
  ["has_solution", /\b(already (?:have|use|using)|we'?re set|got (?:a|our) (?:system|platform|website)|happy with)\b/i],
  ["pricing", /\b(how much|what(?:'s| is) (?:the )?cost|price|pricing|fees?|free\?|what do you charge)\b/i],
  ["wants_demo", /\b(demo|show me|walk me through|hop on a call|set ?up a call|schedule|how does it work)\b/i],
  ["referral", /\b(you should (?:talk|reach out) to|i know (?:a|some) (?:rancher|ranch)|refer|connect you with|my (?:neighbor|buddy|friend))\b/i],
  ["follow_up_later", /\b(later|after (?:calving|branding|sale season|the season)|busy right now|check back|next (?:month|year|spring|fall)|not (?:right )?now)\b/i],
  ["interested", /\b(interested|sounds good|tell me more|i'?m in|let'?s do it|sign me up|yes\b|count me in|love to)\b/i],
  ["question", /\?/],
];

export function classifyReply(text) {
  const t = String(text ?? "");
  for (const [category, re] of RULES) {
    if (re.test(t)) return { category: String(category), confidence: category === "question" ? 0.5 : 0.75 };
  }
  return { category: "question", confidence: 0.3 };
}

/** Suggested next CRM stage + suppression for a classification. */
export function replyAction(category) {
  switch (category) {
    case "interested":
    case "wants_demo": return { stage: "responded", suppress: false };
    case "referral": return { stage: "responded", suppress: false };
    case "pricing":
    case "question":
    case "follow_up_later": return { stage: "responded", suppress: false };
    case "not_interested":
    case "has_solution": return { stage: "inactive", suppress: true }; // respect their no
    case "spam_bounce": return { stage: null, suppress: true };
    default: return { stage: "responded", suppress: false };
  }
}
