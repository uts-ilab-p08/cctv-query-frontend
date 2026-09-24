/**
 * Central fetch wrapper for the Surveillance Video Query API. Every API call
 * in the app goes through `apiFetch` so the base URL, auth header, and error
 * handling live in exactly one place.
 *
 * This module must stay importable from Client Components (most callers —
 * see src/lib/api/endpoints.ts consumers), so it only ever reads the
 * browser Supabase client here. Next.js statically analyzes imports across
 * the module graph, so branching on `typeof window` at runtime does NOT
 * keep `next/headers` out of the client bundle if it's imported anywhere in
 * this file — it has to live in a module this file never imports.
 *
 * The one Server Component caller (`/clips/[clipId]/page.tsx`) resolves its
 * own token via `@/lib/supabase/server` and passes it in through `init`'s
 * `authToken` — see `apiFetch`'s `AuthedInit` type below.
 */
import { createClient } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function getBrowserAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface AuthedInit extends RequestInit {
  /** Server Components pass their own resolved token here — see module docstring. */
  authToken?: string | null;
}

export async function apiFetch<T>(path: string, init: AuthedInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set — copy .env.example to .env.local and set it.",
    );
  }

  const { authToken, ...requestInit } = init;
  const token = authToken !== undefined ? authToken : await getBrowserAuthToken();
  const headers = new Headers(requestInit.headers);
  headers.set("Accept", "application/json");
  if (requestInit.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...requestInit, headers });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => body?.detail)
      .catch(() => undefined);
    throw new ApiError(response.status, detail ?? `Request to ${path} failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
