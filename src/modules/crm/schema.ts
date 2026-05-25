import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(160),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: optionalText(40),
  address: optionalText(300),
  notes: optionalText(2000),
});

export const leadSchema = z.object({
  name: optionalText(160),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: optionalText(40),
  summary: optionalText(2000),
  status: z
    .enum(["new", "contacted", "qualified", "won", "lost"])
    .default("new"),
});

export const leadStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]),
});

export const livestockSchema = z.object({
  tag: optionalText(60),
  name: optionalText(120),
  species: z
    .enum(["cattle", "sheep", "goat", "horse", "swine", "poultry", "other"])
    .default("cattle"),
  breed: optionalText(120),
  sex: optionalText(20),
  birth_date: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  weight_lbs: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? Number(v) : null))
    .pipe(z.number().nonnegative().nullable()),
});

export const reminderSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(200),
  due_at: z.string().min(1, "Pick a date"),
  body: optionalText(2000),
});

export const noteSchema = z.object({
  entity_type: z.string().min(1).max(40),
  entity_id: z.string().uuid(),
  body: z.string().trim().min(1, "Write something").max(4000),
});

export type CrmActionState = { error?: string };
