import Link from "next/link";

import { BrandLockup } from "@/components/brand/BrandMark";

const HERO_CHIPS = [
  { camera: "G328", action: "Vehicle arrival", confidence: 96, primary: true },
  { camera: "G420", action: "Person transit", confidence: 91, primary: false },
  { camera: "G423", action: "Vehicle arrival", confidence: 94, primary: false },
];

const STEPS = [
  {
    num: "01",
    title: "Index the archive",
    body: "Uploaded footage is chunked and annotated per camera — actions, objects, timestamps and confidence.",
  },
  {
    num: "02",
    title: "Ask in plain language",
    body: "No query syntax. Describe the event the way you would to a colleague across the desk.",
  },
  {
    num: "03",
    title: "Jump to the moment",
    body: "Every match is playable. Selecting one seeks the video, switches feed if needed, and re-summarises from that chunk.",
  },
];

const FACTS = [
  { label: "Footage scope", value: "Archived only" },
  { label: "Cameras indexed", value: "8 per precinct" },
  { label: "Access record", value: "Per badge ID" },
  { label: "Retention", value: "Agency policy" },
];

/** Public landing page. Server component — no interactive state of its own. */
export function LandingPage() {
  return (
    <div className="bg-canvas text-ink font-barlow min-h-screen">
      <header className="border-hairline bg-video-bar sticky top-0 z-30 flex items-center justify-between gap-4 border-b px-7 py-3.5">
        <div className="min-w-0">
          <BrandLockup />
        </div>
        <nav className="flex shrink-0 items-center gap-[22px]">
          <Link href="#how" className="text-ink-2 text-[13px]">
            How it works
          </Link>
          <Link href="#trust" className="text-ink-2 text-[13px]">
            Governance
          </Link>
          <Link
            href="/login"
            className="surface-action flex h-10 items-center rounded-[10px] px-[18px] text-[14px] font-semibold"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <section className="relative overflow-hidden px-7 pt-[72px] pb-14">
        <div
          className="pointer-events-none absolute -top-[180px] -right-[140px] h-[520px] w-[520px] rounded-full"
          style={{ background: "radial-gradient(circle, var(--glow-1), transparent 70%)" }}
        />
        <div className="relative mx-auto grid max-w-[1120px] [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] items-center gap-11">
          <div className="min-w-0">
            <p className="text-ink-3 mb-[18px] font-mono text-[11px] tracking-[1.4px]">
              INVESTIGATIVE VIDEO SEARCH
            </p>
            <h1
              className="mb-[18px] text-[44px] leading-[1.1] font-bold"
              style={{ textWrap: "pretty" }}
            >
              Ask your archive a question. Get the moment, not the tape.
            </h1>
            <p
              className="text-ink-2 mb-[30px] max-w-[52ch] text-[16px] leading-[1.65]"
              style={{ textWrap: "pretty" }}
            >
              Type what you are looking for in plain language. Every indexed event across your
              camera network comes back with its timestamp, its feed, and the confidence behind it —
              playable in one click.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="surface-action flex h-[50px] items-center rounded-[11px] px-6 text-[15px] font-semibold"
              >
                Sign in to your precinct
              </Link>
              <Link
                href="#how"
                className="border-hairline-strong bg-panel text-ink flex h-[50px] items-center rounded-[11px] border px-6 text-[15px]"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="bg-video-stage border-hairline shadow-glass-lg min-w-0 overflow-hidden rounded-[14px] border">
            <div className="border-hairline bg-video-bar flex items-center gap-2.5 border-b px-3.5 py-2.5">
              <span
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: "var(--accent)" }}
              />
              <span className="text-ink-3 font-mono text-[11px]">QUERY WORKSPACE</span>
            </div>
            <div className="p-4">
              <p className="border-hairline bg-panel mb-3 rounded-[10px] border px-3.5 py-3 text-[13px] leading-[1.5]">
                Show anyone who entered after the red car arrived
              </p>
              <div className="mb-3.5 flex gap-[9px]">
                <span className="surface-action flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px]">
                  ✦
                </span>
                <p className="text-ink-2 text-[13px] leading-[1.55]" style={{ textWrap: "pretty" }}>
                  Found 16 indexed events across 8 cameras. Top match: vehicle arrival on G328 at
                  13:58:02 (96% confidence).
                </p>
              </div>
              <div className="flex gap-2">
                {HERO_CHIPS.map((chip) => (
                  <div
                    key={chip.camera}
                    className="bg-video-frame min-w-0 flex-1 rounded-lg border px-[9px] py-2"
                    style={{ borderColor: chip.primary ? "var(--accent-line)" : "var(--border)" }}
                  >
                    <div className="text-ink-3 mb-[3px] font-mono text-[11px]">{chip.camera}</div>
                    <div className="truncate text-[12px] font-semibold">{chip.action}</div>
                    <div className="text-accent-strong font-mono text-[11px]">
                      {chip.confidence}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="border-hairline border-t px-7 py-14">
        <div className="mx-auto max-w-[1120px]">
          <p className="text-ink-3 mb-3.5 font-mono text-[11px] tracking-[1.4px]">HOW IT WORKS</p>
          <h2
            className="mb-[34px] max-w-[26ch] text-[28px] font-bold"
            style={{ textWrap: "pretty" }}
          >
            Three steps from question to footage.
          </h2>
          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] gap-[18px]">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="border-hairline bg-panel shadow-glass rounded-xl border p-[22px]"
              >
                <div className="text-accent-strong mb-3 font-mono text-[12px]">{step.num}</div>
                <h3 className="mb-2 text-[17px] font-semibold">{step.title}</h3>
                <p className="text-ink-2 text-[14px] leading-[1.6]" style={{ textWrap: "pretty" }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="border-hairline bg-panel-soft border-t px-7 py-14">
        <div className="mx-auto grid max-w-[1120px] [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] gap-10">
          <div className="min-w-0">
            <p className="text-ink-3 mb-3.5 font-mono text-[11px] tracking-[1.4px]">GOVERNANCE</p>
            <h2 className="mb-4 text-[28px] font-bold" style={{ textWrap: "pretty" }}>
              Built for evidence, not surveillance theatre.
            </h2>
            <p className="text-ink-2 text-[15px] leading-[1.65]" style={{ textWrap: "pretty" }}>
              The system reads archived footage your agency already retains. It does not stream live
              cameras, it does not identify people by name, and every query is attributable to a
              badge.
            </p>
          </div>
          <div className="border-hairline flex min-w-0 flex-col gap-px overflow-hidden rounded-xl border">
            {FACTS.map((fact) => (
              <div
                key={fact.label}
                className="bg-panel flex items-baseline justify-between gap-4 px-[18px] py-[15px]"
              >
                <span className="text-ink-2 text-[14px]">{fact.label}</span>
                <span className="text-ink shrink-0 text-right font-mono text-[13px]">
                  {fact.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-hairline border-t px-7 pt-14 pb-16">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="mb-3.5 text-[28px] font-bold" style={{ textWrap: "pretty" }}>
            Your footage is already indexed. Start asking.
          </h2>
          <p
            className="text-ink-2 mb-[26px] text-[15px] leading-[1.6]"
            style={{ textWrap: "pretty" }}
          >
            Sign in with your precinct credentials to open the query workspace.
          </p>
          <Link
            href="/login"
            className="surface-action inline-flex h-[50px] items-center rounded-[11px] px-[26px] text-[15px] font-semibold"
          >
            Sign in
          </Link>
        </div>
      </section>

      <footer className="border-hairline text-ink-3 flex flex-wrap justify-between gap-3.5 border-t px-7 pt-[22px] pb-[30px] font-mono text-[12px]">
        <span>CCTV AI · Investigative video search</span>
        <span>Access is audit-logged · Archived footage only</span>
      </footer>
    </div>
  );
}
