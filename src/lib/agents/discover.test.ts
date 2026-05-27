import { describe, expect, it } from "vitest";

import { robotsAllows, extractSignals } from "../../../agents/lib/discover.mjs";

describe("robots.txt compliance", () => {
  it("allows when no robots / no matching rule", () => {
    expect(robotsAllows("", "/about")).toBe(true);
    expect(robotsAllows("User-agent: *\nDisallow: /private", "/about")).toBe(true);
  });
  it("disallows matched paths, longest rule wins", () => {
    const r = "User-agent: *\nDisallow: /private\nAllow: /private/public";
    expect(robotsAllows(r, "/private/x")).toBe(false);
    expect(robotsAllows(r, "/private/public/page")).toBe(true);
  });
  it("ignores rules for other user-agents", () => {
    expect(robotsAllows("User-agent: BadBot\nDisallow: /", "/anything")).toBe(true);
  });
});

describe("public-page extraction (no fabrication)", () => {
  const html = `
    <html><head><title>Elk Ridge Beef | Grass-fed Colorado Beef</title>
    <meta name="viewport" content="width=device-width"></head>
    <body>
      <h1>Elk Ridge Beef</h1>
      <p>Family owned since 1998. We sell freezer beef — quarter, half, and whole beef, priced by hanging weight.</p>
      <p>Registered Angus bulls for sale too.</p>
      <a href="https://facebook.com/elkridgebeef">Facebook</a>
      <p>Call us: (970) 555-0142 · sales@elkridgebeef.com · Montrose, CO 81401</p>
      <img src="1.jpg"><img src="2.jpg"><img src="3.jpg"><img src="4.jpg"><img src="5.jpg"><img src="6.jpg">
    </body></html>`;

  it("extracts real on-page contact + signals", () => {
    const s = extractSignals(html, "https://elkridgebeef.com");
    expect(s.business_name).toBe("Elk Ridge Beef");
    expect(s.email).toBe("sales@elkridgebeef.com");
    expect(s.phone?.replace(/\D/g, "")).toContain("9705550142"); // phone digits present
    expect(s.social_url).toContain("facebook.com/elkridgebeef");
    expect(s.state).toBe("CO");
    expect(s.sells_beef).toBe(true);
    expect(s.sells_cattle).toBe(true);
    expect(s.owner_operated).toBe(true);
    expect(s.good_photos).toBe(true);
  });

  it("leaves unknowns blank rather than inventing them", () => {
    const s = extractSignals("<html><head><title>Some Page</title></head><body>hello</body></html>", "https://x.com");
    expect(s.email).toBeNull();
    expect(s.phone).toBeNull();
    expect(s.state).toBeNull();
    expect(s.sells_beef).toBe(false);
    expect(s.weak_website).toBe(true); // thin page heuristic
  });

  it("does not treat image filenames as emails", () => {
    const s = extractSignals("<html><body>logo@2x.png banner@3x.png</body></html>", "https://x.com");
    expect(s.email).toBeNull();
  });
});
