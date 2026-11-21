/**
 * Guest access: one shared code, read from the environment, that signs anyone holding it
 * into a shared guest account until it expires. It exists for the showcase QR code, which
 * points at `/?guest=<code>`.
 *
 * Server-only variables (never NEXT_PUBLIC_, so none reach the browser):
 * - GUEST_ACCESS_CODE        the shared code
 * - GUEST_ACCESS_EXPIRES_AT  ISO 8601 date-time with an offset, e.g. 2026-10-22T23:59:00+11:00
 * - GUEST_EMAIL, GUEST_PASSWORD  the Supabase account guests are signed in as
 *
 * Guest access is off unless all four are set and the expiry parses. Kept free of Node
 * APIs, since the middleware (Edge runtime) checks the expiry too.
 */

/** The query parameter that carries the code, on the landing and on /auth/guest. */
export const GUEST_PARAM = "guest";

interface GuestAccessConfig {
  code: string;
  expiresAt: Date;
  email: string;
  password: string;
}

export function guestAccessConfig(env: NodeJS.ProcessEnv = process.env): GuestAccessConfig | null {
  const code = env.GUEST_ACCESS_CODE?.trim();
  const email = env.GUEST_EMAIL?.trim().toLowerCase();
  const password = env.GUEST_PASSWORD;
  const expiresAt = new Date(env.GUEST_ACCESS_EXPIRES_AT ?? "");
  if (!code || !email || !password || Number.isNaN(expiresAt.getTime())) return null;
  return { code, expiresAt, email, password };
}

/** Compares in time independent of where the strings differ, so the code can't be guessed
 *  one character at a time from response timings. */
function sameString(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}

export type GuestCodeCheck = "valid" | "invalid" | "expired" | "disabled";

export function checkGuestCode(
  code: string | null | undefined,
  now = new Date(),
  config = guestAccessConfig(),
): GuestCodeCheck {
  if (!config) return "disabled";
  if (!code || !sameString(code.trim(), config.code)) return "invalid";
  return now < config.expiresAt ? "valid" : "expired";
}

/** True for a signed-in guest whose access has run out: the code's expiry also ends the
 *  sessions it opened, so the shared account isn't usable after the event. */
export function isExpiredGuest(
  email: string | null | undefined,
  now = new Date(),
  config = guestAccessConfig(),
) {
  if (!config || !email || email.toLowerCase() !== config.email) return false;
  return now >= config.expiresAt;
}
