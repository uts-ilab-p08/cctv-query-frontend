import { NextResponse, type NextRequest } from "next/server";

import { checkGuestCode, GUEST_PARAM, guestAccessConfig } from "@/lib/guestAccess";
import { createClient } from "@/lib/supabase/server";

/**
 * Signs a visitor into the shared guest account when `?code=` holds the current guest
 * code, then opens the dashboard. The landing's Sign in links point here when it was
 * opened from the showcase QR code (`/?guest=<code>`).
 *
 * The guest password stays on the server: the sign-in happens here, and the session
 * reaches the browser only as Supabase's cookies. Any failure ends on /login, with
 * `?guest=` saying why so the page can explain it.
 */
export async function GET(request: NextRequest) {
  const toLogin = (reason: string) => {
    const url = new URL("/login", request.url);
    url.searchParams.set(GUEST_PARAM, reason);
    return NextResponse.redirect(url);
  };

  const config = guestAccessConfig();
  const check = checkGuestCode(request.nextUrl.searchParams.get("code"), new Date(), config);
  if (check !== "valid" || !config) return toLogin(check === "expired" ? "expired" : "invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth
    .signInWithPassword({ email: config.email, password: config.password })
    .catch((cause: unknown) => ({ error: cause }));
  if (error) return toLogin("unavailable");

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
