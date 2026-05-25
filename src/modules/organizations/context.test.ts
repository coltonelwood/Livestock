import { describe, expect, it } from "vitest";

import { resolveActiveOrg, isOrgAdmin, type Membership } from "@/modules/organizations/context";
import type { Organization } from "@/lib/db/types";

function membership(id: string, role: Membership["role"] = "owner"): Membership {
  return {
    role,
    organization: {
      id,
      name: `Org ${id}`,
      slug: id,
      business_type: "ranch",
      created_by: null,
      created_at: "",
      updated_at: "",
    } as Organization,
  };
}

describe("resolveActiveOrg", () => {
  it("returns null with no memberships (triggers onboarding)", () => {
    expect(resolveActiveOrg([], undefined)).toBeNull();
    expect(resolveActiveOrg([], "anything")).toBeNull();
  });

  it("selects the org named by a valid cookie hint", () => {
    const list = [membership("a"), membership("b")];
    expect(resolveActiveOrg(list, "b")?.organization.id).toBe("b");
  });

  it("falls back to the first membership when the cookie hint is unknown/forged", () => {
    const list = [membership("a"), membership("b")];
    expect(resolveActiveOrg(list, "not-a-member")?.organization.id).toBe("a");
    expect(resolveActiveOrg(list, undefined)?.organization.id).toBe("a");
  });
});

describe("isOrgAdmin", () => {
  it("treats owner and admin as admins", () => {
    expect(isOrgAdmin("owner")).toBe(true);
    expect(isOrgAdmin("admin")).toBe(true);
    expect(isOrgAdmin("member")).toBe(false);
  });
});
