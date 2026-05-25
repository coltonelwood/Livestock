import { z } from "zod";

export const agentSchema = z.object({
  greeting: z.string().trim().max(500).optional().transform((v) => v || null),
  system_prompt: z.string().trim().max(4000).optional().transform((v) => v || null),
  qualification_questions: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  is_active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export const profileSchema = z.object({
  display_name: z.string().trim().max(160).optional().transform((v) => v || null),
  bio: z.string().trim().max(2000).optional().transform((v) => v || null),
  location: z.string().trim().max(160).optional().transform((v) => v || null),
  phone: z.string().trim().max(40).optional().transform((v) => v || null),
  email: z.string().trim().max(160).optional().transform((v) => v || null),
  is_public: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  // FAQ entered one per line as "question :: answer".
  faq: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split("\n")
        .map((line) => line.split("::"))
        .filter((parts) => parts.length >= 2 && parts[0].trim() && parts[1].trim())
        .map((parts) => ({
          question: parts[0].trim(),
          answer: parts.slice(1).join("::").trim(),
        }))
        .slice(0, 50),
    ),
});

export type ReceptionistActionState = { error?: string; saved?: boolean };
