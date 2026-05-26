import { describe, expect, it } from "vitest";

import { targetFor, parseItems, prepareRows } from "../../../agents/lib/agent-io.mjs";

describe("claude agent IO", () => {
  it("maps draft agents to a single table + safe default status", () => {
    expect(targetFor("growth")).toMatchObject({ table: "outreach_drafts", status: "pending_approval" });
    expect(targetFor("content")).toMatchObject({ table: "content_drafts", status: "pending_approval" });
    expect(targetFor("trust_safety")).toMatchObject({ table: "moderation_queue", status: "pending" });
    expect(() => targetFor("ops")).toThrow();
    expect(() => targetFor("nope")).toThrow();
  });

  it("parses JSON from fenced, prose-wrapped, or raw output", () => {
    expect(parseItems('{"items":[{"a":1}]}')).toHaveLength(1);
    expect(parseItems("```json\n{\"items\":[{\"a\":1},{\"a\":2}]}\n```")).toHaveLength(2);
    expect(parseItems("Here you go:\n{\"items\":[{\"a\":1}]}\nthanks")).toHaveLength(1);
    expect(parseItems("[{\"a\":1}]")).toHaveLength(1);
    expect(parseItems("not json")).toHaveLength(0);
    expect(parseItems("")).toHaveLength(0);
  });

  it("stamps default status + agent and caps the batch", () => {
    const rows = prepareRows("content", [{ body: "x" }, { body: "y", status: "approved" }]);
    expect(rows[0].status).toBe("pending_approval"); // safe default applied
    expect(rows[1].status).toBe("approved"); // explicit kept (still inert until human acts)
    const opt = prepareRows("liquidity", [{ title: "gap" }]);
    expect(opt[0].agent).toBe("liquidity"); // agent stamped for shared tables
    expect(prepareRows("growth", Array.from({ length: 50 }, () => ({ body: "x" })), 25)).toHaveLength(25);
  });
});
