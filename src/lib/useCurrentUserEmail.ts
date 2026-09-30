"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/** The signed-in user's email (Supabase auth). `loading` until the session is read. */
export function useCurrentUserEmail(): { email: string | null; loading: boolean } {
  const [state, setState] = useState<{ email: string | null; loading: boolean }>({
    email: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setState({ email: data.user?.email ?? null, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ email: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
