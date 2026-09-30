"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { BrandLockup } from "@/components/brand/BrandMark";
import { createClient } from "@/lib/supabase/client";

interface LoginScreenProps {
  redirectTo?: string;
}

/** Login: the project's pitch (left, as on the landing) + the sign-in form (right), backed by
 *  Supabase auth. The session persists on its own, so there is no remember-me toggle. */
export function LoginScreen({ redirectTo = "/dashboard" }: LoginScreenProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Email addresses are case-insensitive: send one canonical form, whatever was typed
    // (normalized on submit, not while typing, so the text never shifts under the caret).
    // The password is sent as typed.
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Enter your email and password to continue.");
      return;
    }
    setError("");
    setPending(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setPending(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="bg-canvas text-ink flex min-h-screen flex-col lg:flex-row">
      <div className="bg-panel-solid border-hairline relative flex min-w-0 flex-1 flex-col justify-between overflow-hidden px-6 pt-9 pb-10 lg:basis-[52%] lg:px-11">
        <div
          className="pointer-events-none absolute -top-[140px] -left-[100px] h-[460px] w-[460px] rounded-full"
          style={{ background: "radial-gradient(circle, var(--glow-1), transparent 70%)" }}
        />

        <Link href="/" className="relative self-start no-underline">
          <BrandLockup />
        </Link>

        <div className="relative my-12 max-w-[460px] lg:my-0">
          <p className="text-ink-3 mb-4 font-mono text-[11px] tracking-[1.4px]">
            UTS CAPSTONE · PROJECT 08-01
          </p>
          <h1
            className="font-barlow mb-4 text-[34px] leading-[1.15] font-bold"
            style={{ textWrap: "pretty" }}
          >
            Ask your camera archive a question. Get the moment, not the tape.
          </h1>
          <p
            className="text-ink-2 font-barlow text-[15px] leading-[1.6]"
            style={{ textWrap: "pretty" }}
          >
            Query multi-camera CCTV footage in natural language. Every answer points to the exact
            moments behind it, with the camera, the time and the confidence of each match.
          </p>
        </div>

        <div className="text-ink-3 relative flex flex-wrap gap-[26px] font-mono text-[12px]">
          <span>Pre-recorded footage only</span>
          <span>MEVA research dataset</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center px-8 py-10 lg:basis-[48%]">
        <div className="font-barlow w-full max-w-[376px]">
          <h2 className="mb-1.5 text-[24px] font-bold">Sign in</h2>
          <p className="text-ink-2 mb-7 text-[14px]">
            Use your project account to open the query workspace.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="login-email"
                className="text-ink-2 mb-[7px] block font-mono text-[12px] tracking-[0.8px]"
              >
                EMAIL
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                // Mobile keyboards capitalize the first letter; an email shouldn't be.
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="you@example.com"
                className="border-hairline-strong bg-panel-solid text-ink h-12 w-full rounded-[10px] border px-3.5 text-[14px]"
              />
            </div>

            <div>
              <div className="mb-[7px] flex items-baseline justify-between gap-2.5">
                <label
                  htmlFor="login-pass"
                  className="text-ink-2 font-mono text-[12px] tracking-[0.8px]"
                >
                  PASSWORD
                </label>
                {/* No password-reset flow exists yet — kept as inert text rather than a
                    dead link to a route that does not exist. */}
                <span className="text-ink-3 text-[12px]" aria-disabled="true">
                  Forgot?
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  id="login-pass"
                  type={reveal ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="••••••••••"
                  className="border-hairline-strong bg-panel-solid text-ink h-12 w-full rounded-[10px] border pr-[74px] pl-3.5 text-[14px]"
                />
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  className="text-accent-strong absolute right-1.5 h-9 px-3 text-[12px]"
                >
                  {reveal ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="surface-action h-[50px] w-full rounded-[11px] text-[15px] font-semibold disabled:opacity-60"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>

            {error ? (
              <p
                className="border-accent-line text-accent-strong rounded-[9px] border px-3 py-2.5 text-[13px]"
                style={{ background: "var(--accent-soft)" }}
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </form>

          <p
            className="text-ink-3 mt-[26px] text-[12px] leading-[1.6]"
            style={{ textWrap: "pretty" }}
          >
            A research prototype by a UTS capstone team (Master of Data Science and Innovation),
            searching pre-recorded footage from the MEVA research dataset.
          </p>
        </div>
      </div>
    </div>
  );
}
