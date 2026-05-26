// Send-safety engine for Tier-2 outreach. Pure — no I/O — unit-tested. Every
// outbound message passes through this before it can be sent. Defaults to
// HOLDING for approval whenever anything looks risky.

const PROHIBITED = [
  /\bact now\b/i, /\blimited time\b/i, /\bguaranteed?\b/i, /\brisk[-\s]?free\b/i,
  /\b100%\s*free\b/i, /\bmake money\b/i, /\bonce in a lifetime\b/i, /\bdon'?t miss\b/i,
  /\burgent\b/i, /\bbuy now\b/i, /\bclick here\b/i, /\bwinner\b/i, /\bcongratulations\b/i,
  /\bfree gift\b/i, /\bno (?:cost|catch|obligation) (?:!|whatsoever)/i,
];
const FAKE_TRACTION = [
  /\bjoin\s+\d{2,}/i, /\bthousands of (?:ranches|ranchers|sellers)/i,
  /\btrusted by\s+\d/i, /\b#1\b/i, /\bevery(?:one|body)'s (?:using|on)\b/i,
  /\bfastest[-\s]growing\b/i,
];
const AI_JARGON = [
  /\bleverage\b/i, /\bunlock\b/i, /\brevolutioniz/i, /\bcutting[-\s]edge\b/i,
  /\bseamless\b/i, /\belevate your\b/i, /\bgame[-\s]chang/i, /\bsynerg/i, /\bsupercharge\b/i,
];

function firstName(s) {
  return String(s ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}
function nameTokens(s) {
  return String(s ?? "").toLowerCase().split(/\s+/).filter((t) => t.length > 2);
}

/** Does the message actually reference this specific prospect (anti-template-blast)? */
export function isPersonalized(body, prospect = {}) {
  const text = String(body ?? "").toLowerCase();
  if (text.includes("{{") ) return false; // unfilled placeholder
  const fn = firstName(prospect.contact_name);
  if (fn && text.includes(fn)) return true;
  const tokens = nameTokens(prospect.business_name);
  return tokens.some((t) => text.includes(t));
}

/** Spam-risk 0–100 with reasons. >=40 holds for approval. */
export function spamRiskScore(body, prospect = {}) {
  const reasons = [];
  let score = 0;
  const text = String(body ?? "");
  if (!isPersonalized(text, prospect)) { score += 30; reasons.push("not_personalized"); }
  if (PROHIBITED.some((re) => re.test(text))) { score += 25; reasons.push("prohibited_phrase"); }
  if (FAKE_TRACTION.some((re) => re.test(text))) { score += 25; reasons.push("fake_traction"); }
  if (AI_JARGON.some((re) => re.test(text))) { score += 12; reasons.push("ai_jargon"); }
  const len = text.trim().length;
  if (len < 40) { score += 15; reasons.push("too_short"); }
  if (len > 1200) { score += 10; reasons.push("too_long"); }
  const letters = text.replace(/[^a-z]/gi, "");
  const caps = text.replace(/[^A-Z]/g, "").length;
  if (letters.length > 20 && caps / letters.length > 0.3) { score += 10; reasons.push("shouting"); }
  if ((text.match(/!/g) || []).length > 3) { score += 8; reasons.push("excess_exclamation"); }
  if ((text.match(/https?:\/\//gi) || []).length > 2) { score += 12; reasons.push("too_many_links"); }
  return { score: Math.min(100, score), reasons };
}

export function normalizeContact(contact) {
  return String(contact ?? "").trim().toLowerCase();
}

export function isSuppressed(suppressionSet, contact) {
  return suppressionSet.has(normalizeContact(contact));
}

/**
 * Final gate. Returns { allowed, hold, reasons, spamScore }. `allowed` only
 * when armed AND everything passes; otherwise hold for human approval.
 * `suppressed` contacts are NEVER sent (allowed=false, hold=false).
 * @param {{body?: string, toContact?: string|null, prospect?: any, suppressionSet?: Set<string>, recentBodies?: Set<string>, lastContactedAt?: string|null, cooldownDays?: number, sentToday?: number, dailyCap?: number, armed?: boolean, now?: number}} [opts]
 * @returns {{allowed: boolean, hold: boolean, reasons: string[], spamScore: number}}
 */
export function canSend({
  body, toContact, prospect = {}, suppressionSet = new Set(),
  recentBodies = new Set(), lastContactedAt = null, cooldownDays = 14,
  sentToday = 0, dailyCap = 10, armed = false, now = Date.now(),
}) {
  const { score, reasons: spamReasons } = spamRiskScore(body, prospect);
  const c = normalizeContact(toContact);

  if (!c) return { allowed: false, hold: true, reasons: ["no_contact"], spamScore: score };
  if (isSuppressed(suppressionSet, c)) return { allowed: false, hold: false, reasons: ["suppressed"], spamScore: score };

  const reasons = [];
  if (recentBodies.has(String(body ?? "").trim())) reasons.push("duplicate_send");
  if (lastContactedAt) {
    const days = (now - new Date(lastContactedAt).getTime()) / 86_400_000;
    if (days < cooldownDays) reasons.push("cooldown");
  }
  if (sentToday >= dailyCap) reasons.push("daily_cap_reached");
  if (score >= 40) reasons.push("spam_risk");
  if (!isPersonalized(body, prospect)) reasons.push("not_personalized");

  if (reasons.length) return { allowed: false, hold: true, reasons: [...reasons, ...spamReasons], spamScore: score };
  if (!armed) return { allowed: false, hold: true, reasons: ["not_armed"], spamScore: score };
  return { allowed: true, hold: false, reasons: [], spamScore: score };
}
