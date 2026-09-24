"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { BrandLockup } from "@/components/brand/BrandMark";
import { createClient } from "@/lib/supabase/client";

interface LoginScreenProps {
  redirectTo?: string;
}

/** Login: narrative panel (left) + precinct-credentials form (right), backed by Supabase auth. */
export function LoginScreen({ redirectTo = "/dashboard" }: LoginScreenProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      setError("Enter your badge email and password to continue.");
      return;
    }
    setError("");
    setPending(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

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
      <div className="bg-video-stage relative flex min-w-0 flex-1 flex-col justify-between overflow-hidden px-6 pt-9 pb-10 lg:basis-[52%] lg:px-11">
        <div
          className="pointer-events-none absolute -top-[140px] -left-[100px] h-[460px] w-[460px] rounded-full"
          style={{ background: "radial-gradient(circle, var(--glow-1), transparent 70%)" }}
        />

        <Link href="/" className="relative self-start no-underline">
          <BrandLockup />
        </Link>

        <div className="relative my-12 max-w-[460px] lg:my-0">
          <p className="text-ink-3 mb-4 font-mono text-[11px] tracking-[1.4px]">
            INVESTIGATIVE VIDEO SEARCH
          </p>
          <h1
            className="font-barlow mb-4 text-[34px] leading-[1.15] font-bold"
            style={{ textWrap: "pretty" }}
          >
            Ask your archive a question. Get the moment, not the tape.
          </h1>
          <p
            className="text-ink-2 font-barlow text-[15px] leading-[1.6]"
            style={{ textWrap: "pretty" }}
          >
            Natural-language queries across indexed footage from every camera in the precinct — with
            the timestamp, the feed, and the confidence behind each match.
          </p>
        </div>

        <div className="text-ink-3 relative flex flex-wrap gap-[26px] font-mono text-[12px]">
          <span>8 cameras indexed</span>
          <span>Archived footage · audit-logged access</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center px-8 py-10 lg:basis-[48%]">
        <div className="font-barlow w-full max-w-[376px]">
          <h2 className="mb-1.5 text-[24px] font-bold">Sign in</h2>
          <p className="text-ink-2 mb-7 text-[14px]">Use your precinct credentials.</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="login-email"
                className="text-ink-2 mb-[7px] block font-mono text-[12px] tracking-[0.8px]"
              >
                BADGE EMAIL
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="l.ortiz@precinct.gov"
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
              type="button"
              onClick={() => setRemember((r) => !r)}
              aria-pressed={remember}
              className="flex min-h-[44px] items-center gap-[9px] self-start"
            >
              <span
                className={
                  remember
                    ? "surface-action flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-transparent"
                    : "border-hairline-strong flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border"
                }
              >
                {remember ? "✓" : ""}
              </span>
              <span className="text-ink-2 text-[13px]">Trust this terminal</span>
            </button>

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
            Every search and playback is recorded against your badge ID. Access to archived footage
            is governed by your precinct&apos;s retention policy.
          </p>
        </div>
      </div>
    </div>
  );
}
