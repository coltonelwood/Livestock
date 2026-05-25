import { z } from "zod";

const price = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? Number(v) : null))
  .pipe(z.number().nonnegative().nullable());

export const livestockListingSchema = z.object({
  title: z.string().trim().min(3, "Enter a title").max(160),
  description: z.string().trim().max(4000).optional().transform((v) => v || null),
  species: z
    .enum(["cattle", "sheep", "goat", "horse", "swine", "poultry", "other"])
    .default("cattle"),
  breed: z.string().trim().max(120).optional().transform((v) => v || null),
  quantity: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : 1))
    .pipe(z.number().int().positive()),
  price_usd: price,
  location: z.string().trim().max(160).optional().transform((v) => v || null),
});

export const meatProductSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(160),
  description: z.string().trim().max(4000).optional().transform((v) => v || null),
  product_type: z
    .enum(["quarter", "half", "whole", "retail_cut", "bundle", "other"])
    .default("retail_cut"),
  price_usd: price,
  unit: z.string().trim().max(40).default("each"),
  inventory: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : null))
    .pipe(z.number().int().nonnegative().nullable()),
});

export const inquirySchema = z.object({
  listingType: z.enum(["livestock", "meat"]),
  listingId: z.string().uuid(),
  name: z.string().trim().min(1, "Enter your name").max(160),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  // Honeypot: bots fill hidden fields; humans leave it empty.
  company: z.string().max(0).optional(),
});

export type ListingActionState = { error?: string; saved?: boolean };
export type InquiryState = {
  error?: string;
  success?: boolean;
  // Echoed back on failure so the form doesn't wipe what the buyer typed.
  values?: { name?: string; email?: string; phone?: string; message?: string };
};
