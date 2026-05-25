import { z } from "zod";

const businessType = z.enum([
  "ranch",
  "breeder",
  "auction_house",
  "hauler",
  "processor",
  "vet_feed_store",
]);

export const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Enter a business name").max(120),
  businessType,
  location: z.string().trim().max(160).optional(),
});

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "ranch";
}

export type OrgActionState = { error?: string };
