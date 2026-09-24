"use client";

import { AlignLeft, Bookmark, Layers, LogOut, Search, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandLockup } from "@/components/brand/BrandMark";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Routes that should also light this item up. */
  match: string[];
}

/** SPEC §9 icon mapping. */
const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/dashboard",
    label: "Search",
    icon: Search,
    match: ["/dashboard", "/results", "/clips"],
  },
  { href: "/saved", label: "Saved Queries", icon: Bookmark, match: ["/saved"] },
  { href: "/reports", label: "Reports", icon: AlignLeft, match: ["/reports"] },
  { href: "/pipeline", label: "Annotation Pipeline", icon: Layers, match: ["/pipeline"] },
];

/** SPEC §1 — a pill row holding a 32px circle, with the label outside the circle. */
const ROW = "rounded-full flex items-center gap-[11px] py-1.5 pr-3.5 pl-1.5 text-sm no-underline";
const CIRCLE = "flex size-8 shrink-0 items-center justify-center rounded-full";

/**
 * Nav labels drop the violet cast the shared ink tokens carry (#f2f0fa / #a9a3c9):
 * the active row reads pure white, the resting ones a neutral white-grey. Both
 * flip with the theme, so the light sidebar stays legible.
 */
const LABEL_ACTIVE = "text-[var(--nav-ink-active)] font-bold";
const LABEL_RESTING = "text-[var(--nav-ink)] hover:text-[var(--nav-ink-active)]";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const precinct = useAppStore((state) => state.precinct);
  const openSettings = useAppStore((state) => state.openSettings);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="surface-sidebar border-hairline relative z-10 flex w-[232px] shrink-0 flex-col border-r px-4 py-5">
      <Link href="/dashboard" className="mb-7 px-1.5 no-underline">
        <BrandLockup />
      </Link>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.match.some((prefix) => pathname.startsWith(prefix));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                ROW,
                "transition-colors duration-150",
                active ? `bg-accent-soft ${LABEL_ACTIVE}` : LABEL_RESTING,
              )}
            >
              <span
                className={cn(CIRCLE, active ? "surface-action shadow-action" : "glass-card-flat")}
              >
                <Icon size={17} strokeWidth={2} aria-hidden />
              </span>
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={openSettings}
          className={cn(ROW, LABEL_RESTING, "cursor-pointer text-left")}
        >
          <span className={cn(CIRCLE, "glass-card-flat")}>
            <Settings size={17} strokeWidth={2} aria-hidden />
          </span>
          Settings
        </button>
      </nav>

      <div className="flex-1" />

      <div className="border-hairline flex flex-col gap-0.5 border-t pt-3.5">
        <p className="text-ink-2 font-mono text-[11px]">{precinct}</p>
        <p className="text-ink-3 truncate font-mono text-[11px]">{userEmail ?? "—"}</p>
        <button
          type="button"
          onClick={signOut}
          className="text-ink-3 hover:text-ink-2 mt-1.5 flex cursor-pointer items-center gap-1.5 text-left font-mono text-[11px]"
        >
          <LogOut size={13} strokeWidth={2} aria-hidden />
          Sign out
        </button>
      </div>
    </aside>
  );
}
