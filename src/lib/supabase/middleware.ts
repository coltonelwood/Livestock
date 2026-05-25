import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/db/types";

/**
 * Refreshes the Supabase auth session on every request and gates the
 * authenticated app + admin areas.
 *
 * Defensive by design: middleware runs on (almost) every request, so an
 * uncaught throw here returns a site-wide 500 (MIDDLEWARE_INVOCATION_FAILED).
 * If Supabase env is missing/invalid, or the auth check itself fails, we DON'T
 * crash the edge — public pages still render, and protected routes fall back to
 * the login redirect.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/admin");

  // Resolve env without throwing. If Supabase isn't configured, let requests
  // through (pages that truly need it surface their own errors).
  let env: ReturnType<typeof publicEnv>;
  try {
    env = publicEnv();
  } catch {
    return response;
  }

  let user = null;
  try {
    const supabase = createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(
            cookiesToSet: { name: string; value: string; options: CookieOptions }[],
          ) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // getUser() must run before any redirect logic so the session cookie is
    // refreshed on the response.
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    // Auth backend unreachable / misconfigured — treat as signed out rather
    // than 500-ing every route.
    user = null;
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
