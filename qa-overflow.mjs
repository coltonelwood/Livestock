import { chromium } from "playwright";
const BASE = "https://livestock-eight.vercel.app";
const EMAIL = "Colton.elwood@icloud.com";
const PASSWORD = "RanchTestd55bffd5!";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.locator('input[name="email"]').fill(EMAIL);
await page.locator('input[name="password"]').fill(PASSWORD);
await Promise.all([page.waitForURL("**/dashboard**", { timeout: 30000 }).catch(()=>{}), page.locator('button[type="submit"]').click()]);
await page.waitForTimeout(1200);

for (const path of ["/dashboard/leads", "/admin"]) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const docOverflow = document.documentElement.scrollWidth - vw;
    const offenders = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute("class") || "").slice(0, 90),
          right: Math.round(r.right),
          width: Math.round(r.width),
        });
      }
    });
    // keep the widest few, dedup-ish
    offenders.sort((a, b) => b.right - a.right);
    return { vw, docOverflow, offenders: offenders.slice(0, 8) };
  });
  console.log(`\n=== ${path} (vw=${info.vw}, overflow=${info.docOverflow}px) ===`);
  for (const o of info.offenders) console.log(`  ${o.tag} right=${o.right} w=${o.width} | ${o.cls}`);
}
await browser.close();
