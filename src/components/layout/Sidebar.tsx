"use client";

import { FileBarChart, Home, Settings, Star, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { investigatorName } from "@/data/precincts";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/lib/store";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Routes that should also light this item up. */
  match: string[];
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "New Query",
    icon: Home,
    match: ["/dashboard", "/results", "/clips"],
  },
  { href: "/saved", label: "Saved Queries", icon: Star, match: ["/saved"] },
  { href: "/reports", label: "Reports", icon: FileBarChart, match: ["/reports"] },
  { href: "/pipeline", label: "Pipeline", icon: Workflow, match: ["/pipeline"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const selectedPrecinct = useAppStore((state) => state.selectedPrecinct);
  const setOpenModal = useAppStore((state) => state.setOpenModal);

  return (
    <aside className="flex w-[232px] shrink-0 flex-col bg-[rgba(11,28,77,0.85)] px-4 py-5 shadow-[4px_0_30px_rgba(11,28,77,0.15)] backdrop-blur-[20px]">
      <Link
        href="/dashboard"
        className="mb-7 flex items-center gap-2.5 rounded-lg px-2 py-1 no-underline"
      >
        <span
          aria-hidden
          className="bg-mark-gradient flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white"
        >
          ✦
        </span>
        <span className="flex flex-col leading-[1.1]">
          <span className="text-[15px] font-bold tracking-[0.2px] text-white">CCTV AI</span>
          <span className="text-nav-accent font-mono text-[9px] tracking-[1.2px]">ASSISTANT</span>
        </span>
      </Link>

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active = item.match.some((prefix) => pathname.startsWith(prefix));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-[9px] text-sm font-medium no-underline transition-colors duration-150",
                active
                  ? "bg-white/12 text-white"
                  : "text-nav-fg-strong hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon size={16} aria-hidden />
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpenModal("settings")}
          className="text-nav-fg flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-[9px] text-left text-sm font-medium transition-colors duration-150 hover:bg-white/8 hover:text-white"
        >
          <Settings size={16} aria-hidden />
          Settings
        </button>
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col gap-0.5 border-t border-white/14 pt-3.5">
        <p className="text-nav-fg-strong text-xs font-semibold">{selectedPrecinct}</p>
        <p className="text-nav-fg-faint font-mono text-[11px]">{investigatorName}</p>
      </div>
    </aside>
  );
}
