"use client";

import {
  AlignLeft,
  Bookmark,
  Layers,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandLockup, BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

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
  { href: "/settings", label: "Settings", icon: Settings, match: ["/settings"] },
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

/** localStorage key for the collapsed/expanded choice. */
const COLLAPSED_STORAGE_KEY = "cctvai.sidebar";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // Starts expanded to match the server render; the stored choice applies after mount.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "collapsed");
    } catch {
      // Storage unavailable: stay expanded.
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "collapsed" : "expanded");
      } catch {
        // Private mode: the choice still applies for this session.
      }
      return next;
    });
  };

  /** Collapsed rows keep their label for screen readers and show it as a tooltip. */
  const label = (text: string) => <span className={cn(collapsed && "sr-only")}>{text}</span>;

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      aria-label="Main menu"
      data-collapsed={collapsed}
      className={cn(
        "surface-sidebar border-hairline relative z-10 flex shrink-0 flex-col border-r py-5 transition-[width] duration-200",
        collapsed ? "w-[72px] px-3" : "w-[232px] px-4",
      )}
    >
      <div
        className={cn(
          "mb-7 flex gap-2",
          collapsed ? "flex-col items-center" : "items-center justify-between",
        )}
      >
        {collapsed ? (
          <Link href="/dashboard" aria-label="CCTV AI Assistant" className="no-underline">
            <BrandMark size={30} className="text-brand" />
          </Link>
        ) : (
          <Link href="/dashboard" className="min-w-0 px-1.5 no-underline">
            <BrandLockup />
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand menu" : "Collapse menu"}
          className="text-ink-3 hover:text-ink hover:bg-accent-soft flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150"
        >
          {collapsed ? (
            <PanelLeftOpen size={17} strokeWidth={2} aria-hidden />
          ) : (
            <PanelLeftClose size={17} strokeWidth={2} aria-hidden />
          )}
        </button>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.match.some((prefix) => pathname.startsWith(prefix));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                ROW,
                collapsed && "justify-center px-1.5",
                "transition-colors duration-150",
                active ? `bg-accent-soft ${LABEL_ACTIVE}` : LABEL_RESTING,
              )}
            >
              <span
                className={cn(CIRCLE, active ? "surface-action shadow-action" : "glass-card-flat")}
              >
                <Icon size={17} strokeWidth={2} aria-hidden />
              </span>
              {label(item.label)}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="border-hairline flex flex-col gap-0.5 border-t pt-3.5">
        {collapsed ? null : (
          <p className="text-ink-3 truncate font-mono text-[11px]">{userEmail ?? "—"}</p>
        )}
        <button
          type="button"
          onClick={signOut}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "text-flag border-flag/45 bg-flag/10 hover:bg-flag/20 hover:border-flag flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border py-2 font-sans text-[13px] font-semibold transition-colors duration-150",
            collapsed ? "px-0" : "mt-3 px-3",
          )}
        >
          <LogOut size={15} strokeWidth={2.2} aria-hidden />
          {label("Sign out")}
        </button>
      </div>
    </aside>
  );
}
