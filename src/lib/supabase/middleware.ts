import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { GUEST_PARAM, isExpiredGuest } from "@/lib/guestAccess";

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated visitors away from the protected `(app)` route group.
 * `/login` (and any route not under the app shell) stays public.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // `/auth/signout` answers even without a session: it always ends at /login.
  // `/auth/guest` is how a visitor without one gets a guest session.
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/auth/signout" ||
    pathname === "/auth/guest";
  const isAuthOnlyRoute = pathname === "/login";

  // The guest code's expiry also ends the guest sessions it opened: drop the session
  // cookies and explain why on /login. The redirected request carries no session, so it
  // lands on the login page rather than coming back here.
  if (user && isExpiredGuest(user.email)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = `?${GUEST_PARAM}=expired`;
    const expired = NextResponse.redirect(redirectUrl);
    for (const { name } of request.cookies.getAll()) {
      if (name.startsWith("sb-")) expired.cookies.delete(name);
    }
    return expired;
  }

  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthOnlyRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
