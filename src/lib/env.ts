import { z } from "zod";

/**
 * Environment contract. Validation is lazy (invoked at first use, not at import)
 * so that builds and client bundles don't require server secrets to be present.
 * NEXT_PUBLIC_* values are safe in the browser; everything else is server-only.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

// Server secrets are validated in INDEPENDENT groups so that a missing key for
// one subsystem can't take down an unrelated one. In particular, the database
// service-role client (lead capture, photo upload, webhooks) must keep working
// even if the AI key isn't configured.
const supabaseAdminSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const aiSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
});

let cachedPublic: z.infer<typeof publicSchema> | null = null;
let cachedAdmin: z.infer<typeof supabaseAdminSchema> | null = null;
let cachedAi: z.infer<typeof aiSchema> | null = null;

export function publicEnv() {
  if (cachedPublic) return cachedPublic;
  // Reference vars statically so Next.js inlines them into the client bundle.
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables: ${parsed.error.message}. ` +
        `Copy .env.example to .env.local and fill in Supabase values.`,
    );
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}

/** Validates ONLY the Supabase service-role key (DB/storage admin operations). */
export function supabaseAdminEnv() {
  if (typeof window !== "undefined") {
    throw new Error("supabaseAdminEnv() must not be called in the browser");
  }
  if (cachedAdmin) return cachedAdmin;
  const parsed = supabaseAdminSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Missing SUPABASE_SERVICE_ROLE_KEY. ${parsed.error.message}`,
    );
  }
  cachedAdmin = parsed.data;
  return cachedAdmin;
}

/** Validates ONLY the AI (Anthropic) configuration. */
export function aiEnv() {
  if (typeof window !== "undefined") {
    throw new Error("aiEnv() must not be called in the browser");
  }
  if (cachedAi) return cachedAi;
  const parsed = aiSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid AI environment variables: ${parsed.error.message}.`);
  }
  cachedAi = parsed.data;
  return cachedAi;
}
