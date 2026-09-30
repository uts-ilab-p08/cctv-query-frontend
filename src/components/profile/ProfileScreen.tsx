"use client";

import { Avatar } from "@/components/ui/Avatar";
import { nameFromEmail } from "@/lib/displayName";
import { useCurrentUserEmail } from "@/lib/useCurrentUserEmail";

/** One label/value row of the account details. */
function Detail({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="border-hairline flex items-baseline justify-between gap-6 border-t py-3.5 first:border-t-0">
      <dt className="text-ink-2 shrink-0 text-[13px]">{label}</dt>
      <dd className={`text-ink min-w-0 truncate text-right text-[14px] ${mono ? "font-mono" : ""}`}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

/**
 * The signed-in user's profile: an initials avatar, their name and email. There is no user
 * profile in the backend, so the names are read from the email address (see
 * `nameFromEmail`) and the page says so.
 */
export function ProfileScreen() {
  const { email, loading } = useCurrentUserEmail();
  const name = nameFromEmail(email);

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading profile"
        className="mx-auto flex w-full max-w-[640px] animate-pulse flex-col items-center px-8 pt-14"
      >
        <span className="bg-ink-3/20 mb-5 size-20 rounded-full" />
        <span className="bg-ink-3/20 mb-2.5 h-6 w-48 rounded-full" />
        <span className="bg-ink-3/15 h-3.5 w-56 rounded-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-8 pt-14 pb-16">
      <header className="mb-10 flex flex-col items-center text-center">
        <Avatar initials={name?.initials ?? "?"} size="lg" className="mb-5" />
        <h1 className="text-ink mb-1.5 text-[26px] font-bold">
          {name?.full ?? email ?? "Signed-in user"}
        </h1>
        {email ? <p className="text-ink-2 font-mono text-[13px]">{email}</p> : null}
      </header>

      <section
        aria-labelledby="profile-account"
        className="rounded-card glass-card-flat px-5 pt-4 pb-2"
      >
        <h2
          id="profile-account"
          className="text-ink-3 mb-1 font-mono text-[11px] tracking-[1.2px] uppercase"
        >
          Account
        </h2>
        <dl className="m-0">
          <Detail label="First name" value={name?.first ?? null} />
          <Detail label="Second name" value={name?.second ?? null} />
          <Detail label="Email" value={email} mono />
        </dl>
        <p className="text-ink-3 border-hairline border-t py-3 text-[12px] leading-[1.5]">
          Names are read from your email address (first.second@…).
        </p>
      </section>
    </div>
  );
}
