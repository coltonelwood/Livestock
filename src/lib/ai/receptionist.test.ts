import { describe, expect, it } from "vitest";

import { buildSystemPrompt, extractContact } from "@/lib/ai/receptionist";

describe("buildSystemPrompt", () => {
  const ctx = {
    orgName: "Bar X Ranch",
    profile: {
      display_name: "Bar X Cattle Co.",
      bio: "Registered Angus since 1972.",
      location: "Ellis County, KS",
      phone: "555-123-4567",
      email: "sales@barx.example",
      faq: [{ question: "Do you deliver?", answer: "Within 200 miles." }],
    },
    agent: {
      name: "Receptionist",
      system_prompt: "Mention our spring bull sale.",
      qualification_questions: ["What breed are you after?"],
    },
  };

  it("uses the display name and includes business facts", () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("Bar X Cattle Co.");
    expect(prompt).toContain("Ellis County, KS");
    expect(prompt).toContain("Do you deliver?");
    expect(prompt).toContain("Within 200 miles.");
    expect(prompt).toContain("What breed are you after?");
    expect(prompt).toContain("Mention our spring bull sale.");
  });

  it("includes an instruction-injection guard", () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt.toLowerCase()).toContain("ignore these instructions");
  });

  it("falls back to defaults when profile/agent are missing", () => {
    const prompt = buildSystemPrompt({
      orgName: "Lazy J",
      profile: null,
      agent: null,
    });
    expect(prompt).toContain("Lazy J");
    expect(prompt).toContain("(No FAQ provided.)");
  });
});

describe("extractContact", () => {
  it("pulls an email", () => {
    expect(extractContact("reach me at jane@doe.com please").email).toBe(
      "jane@doe.com",
    );
  });

  it("pulls a phone number in common formats", () => {
    expect(extractContact("call (555) 867-5309").phone).toBe("(555) 867-5309");
    expect(extractContact("555-867-5309").phone).toBe("555-867-5309");
  });

  it("returns nulls when nothing matches", () => {
    expect(extractContact("just browsing, thanks")).toEqual({
      email: null,
      phone: null,
    });
  });
});
