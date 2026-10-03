import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Sign out, posted by the Sidebar's form. Done here rather than in the browser: the
 * browser client's `signOut()` waits on its auth lock, a token refresh and Supabase's
 * `/logout`, and the button stayed stuck whenever one of them hung. Here the response
 * clears the session cookies and redirects, and the browser's full navigation also
 * drops the previous user's in-memory state (results, chats).
 *
 * `scope: "local"` ends this browser's session only, without a round trip to Supabase.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const failed = await supabase.auth
    .signOut({ scope: "local" })
    .then(({ error }) => !!error)
    .catch(() => true);

  // 303: the browser follows the form's POST with a GET.
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  if (failed) {
    // The session may still be in its cookies: drop them, or /login bounces back in.
    for (const { name } of request.cookies.getAll()) {
      if (name.startsWith("sb-")) response.cookies.delete(name);
    }
  }
  return response;
}
