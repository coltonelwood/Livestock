// Compliant public-source discovery helpers. Pure parsing + a robots-aware
// fetch. Extracts ONLY what is literally published on a page the operator chose
// — never fabricates contacts, never bypasses robots.txt or logins.

/** Minimal robots.txt check for the `*` user-agent. Conservative: if a path is
 * Disallowed (and not covered by a longer Allow), return false. */
export function robotsAllows(robotsTxt, path) {
  if (!robotsTxt) return true; // no robots.txt => allowed
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
  let inStar = false;
  const rules = [];
  for (const line of lines) {
    const m = line.match(/^(user-agent|allow|disallow)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, k, vRaw] = m;
    const key = k.toLowerCase();
    const v = vRaw.trim();
    if (key === "user-agent") { inStar = v === "*"; continue; }
    if (!inStar) continue;
    if (key === "allow" && v) rules.push({ allow: true, path: v });
    if (key === "disallow" && v) rules.push({ allow: false, path: v });
  }
  // Longest matching rule wins (standard robots precedence).
  let best = null;
  for (const r of rules) {
    if (path.startsWith(r.path)) { if (!best || r.path.length > best.path.length) best = r; }
  }
  return best ? best.allow : true;
}

const RE = {
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  phone: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  fb: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9._/-]+/i,
  ig: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._/-]+/i,
};
const STATE_ABBR = ["CO","WY","UT","OK","MT","TX","KS","NE","SD","NM","ID","NV","AZ","ND","IA","MO","AR"];
const STATE_NAMES = { colorado:"CO", wyoming:"WY", utah:"UT", oklahoma:"OK", montana:"MT", texas:"TX", kansas:"KS", nebraska:"NE", "south dakota":"SD" };

function stripTags(html) {
  return String(html ?? "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
}

/** Extract a structured prospect candidate from page HTML. Only real, on-page
 * data — blanks stay blank (never invented). Returns signal booleans for scoring. */
export function extractSignals(html, url = "") {
  const text = stripTags(html);
  const low = text.toLowerCase();
  const emails = [...new Set((html.match(RE.email) || []).filter((e) => !/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(e) && !/(example|sentry|wixpress|\.png)/i.test(e)))];
  const phones = [...new Set((text.match(RE.phone) || []))];
  const imgCount = (html.match(/<img\b/gi) || []).length;

  // Business name from <title> / og:site_name.
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || html.match(/og:site_name"[^>]*content="([^"]+)"/i)?.[1] || "").replace(/\s+/g, " ").trim();

  // State: explicit abbr token or a state name.
  let state = null;
  const abbrHit = (text.match(/\b([A-Z]{2})\b\s*\d{5}/) || [])[1]; // "CO 80202"
  if (abbrHit && STATE_ABBR.includes(abbrHit)) state = abbrHit;
  if (!state) for (const [name, ab] of Object.entries(STATE_NAMES)) if (low.includes(name)) { state = ab; break; }

  const has = (re) => re.test(low);
  return {
    business_name: title.split(/[|\-–—·]/)[0].trim() || null,
    email: emails[0] ?? null,
    phone: phones[0] ?? null,
    social_url: (html.match(RE.fb)?.[0] || html.match(RE.ig)?.[0] || null),
    state,
    website: url || null,
    sells_beef: has(/freezer beef|beef box|quarter (?:beef|of beef)|half (?:beef|of beef)|whole beef|grass[- ]?fed beef|beef for sale|beef bundle|hanging weight/),
    sells_cattle: has(/bulls? for sale|heifers|replacement (?:heifers|females)|cattle for sale|cow[- ]?calf|seedstock|bred (?:cows|heifers)|feeder (?:cattle|steers)/),
    runs_auctions: has(/\bauction\b|production sale|annual sale|sale day|online sale/),
    good_photos: imgCount >= 6,
    owner_operated: has(/family (?:owned|run|operated)|since \d{4}|fourth[- ]generation|generations? of/),
    // Heuristic only — flag a likely-weak site (no responsive meta or very thin).
    weak_website: !/name=["']viewport["']/i.test(html) || text.replace(/\s+/g, " ").length < 600,
    found_emails: emails.length,
  };
}

/** Fetch a single operator-chosen URL IF robots allows, then extract. No crawl,
 * no following links, size + time capped. Returns {blocked} or the candidate. */
export async function fetchAndExtract(url, { timeoutMs = 15000, maxBytes = 800_000 } = {}) {
  let u;
  try { u = new URL(url); } catch { return { error: "invalid_url" }; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "bad_protocol" };
  // robots.txt first.
  let robots = "";
  try {
    const r = await fetch(`${u.origin}/robots.txt`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) robots = (await r.text()).slice(0, 100_000);
  } catch { /* no robots => allowed */ }
  if (!robotsAllows(robots, u.pathname)) return { blocked: "robots" };
  try {
    const res = await fetch(u.href, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "OpenRange-ResearchBot/1.0 (+founding-ranch discovery; respects robots.txt)" },
    });
    if (!res.ok) return { error: `http_${res.status}` };
    const html = (await res.text()).slice(0, maxBytes);
    return { candidate: extractSignals(html, u.href) };
  } catch (e) {
    return { error: String(e).slice(0, 120) };
  }
}
