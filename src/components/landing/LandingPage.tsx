import {
  ArrowRight,
  Check,
  Database,
  Eye,
  Github,
  MessageSquare,
  Search,
  SquarePlay,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";

import homeShot from "@/assets/landing/home.webp";
import metadataShot from "@/assets/landing/results-metadata.webp";
import trackingShot from "@/assets/landing/results-tracking.webp";
import { BrandLockup } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/cn";
import { EXAMPLE_QUESTIONS } from "@/lib/exampleQuestions";
import { structuredData, TEAM } from "@/lib/seo";

/* Content follows the project's showcase poster and final presentation (36105 iLab,
   project 08-01, Spring 2026): every figure below comes from those two sources. */

/** The screenshots (src/assets/landing) are imported, not served from public/: the import
 *  gives each a content-hashed URL, so a replaced screenshot can never be served stale from
 *  a cache, plus its real width and height. They are stored lossless; this is the one lossy
 *  pass, when Next serves them.
 *  Its default (75) smears the interface's small text. Must be listed in `images.qualities`. */
const SCREENSHOT_QUALITY = 90;

/** The question in the hero screenshot, the poster and the Objectives slide. */
const HERO_QUESTION = EXAMPLE_QUESTIONS[0];

const HERO_POINTS = [
  "Plain-language questions, no query syntax",
  "Answers that cite the moments they came from",
  "Detected objects outlined on the footage",
];

const CAMERA_COUNTS = [
  { value: "11,000+", label: "NSW rail network" },
  { value: "9,000+", label: "Queensland Rail" },
  { value: "5,500", label: "Public Transport Victoria" },
];

const SCALE_FACTS = [
  {
    value: "600,000 h",
    label: "of footage recorded every day by those cameras alone (25,500 × 24 h)",
  },
  { value: "1 TB", label: "of video evidence reaches NSW Police every day" },
];

const OBJECTIVE = [
  { question: "What?", answer: "See the event" },
  { question: "When?", answer: "Pinpoint the time" },
  { question: "Who?", answer: "Spot who is involved" },
];

const STEPS = [
  {
    icon: Video,
    title: "Cameras record",
    body: "Hours of footage from many cameras and places.",
    tech: "MEVA · 71 clips · 23 cameras · 4 sites",
  },
  {
    icon: Eye,
    title: "AI watches",
    body: "It notes who is there, what they do, and when.",
    tech: "Qwen3-VL · YOLO26 · ByteTrack",
  },
  {
    icon: Database,
    title: "Events are saved",
    body: "Every moment becomes a short, searchable record.",
    tech: "1,955 events · Supabase · Qdrant",
  },
  {
    icon: MessageSquare,
    title: "You ask",
    body: "Type a question. Place, date and time are understood.",
    tech: "FastAPI · filters + search",
  },
  {
    icon: SquarePlay,
    title: "You see the proof",
    body: "An answer that links to the exact second of video.",
    tech: "Cited answer",
  },
];

const TRACE_FILTERS = [
  ["location", "school"],
  ["date", "7 March 2018"],
  ["time", "11:00 – 12:00"],
] as const;

const TRACE_SCORES = ["0.73", "0.72", "0.71", "0.70", "0.70"];

const ANSWER_FEATURES = [
  {
    title: "Answers in clear text",
    body: "A formatted answer in the chat, with times and bullet points.",
  },
  { title: "Every claim has a reference", body: "Each sentence cites the event it came from." },
  {
    title: "One click to the exact second",
    body: "The video jumps to the moment, with tracked people and vehicles outlined.",
  },
  { title: "Suggests the next question", body: "Follow-up ideas keep the search going." },
];

/** Retrieval on 22 test questions, with and without the place/date/time filters. */
const RETRIEVAL_TOTAL = 22;
const RETRIEVAL = [
  { label: "Correct video first", withFilters: 19, without: 9 },
  { label: "Correct video in the top 5", withFilters: 20, without: 10 },
  { label: "Returned nothing", withFilters: 2, without: 12 },
];

const ANNOTATION_RESULTS = [
  {
    value: "1,955",
    label: "structured events",
    detail: "1,387 tracked objects from 5.9 hours of footage",
  },
  {
    value: "96.4%",
    label: "of events consistent with MEVA ground truth",
    detail: "1,724 of 1,788; only 1% contradict it",
  },
  {
    value: "80.5%",
    label: "of MEVA activity types described",
    detail: "487 of 605",
  },
];

const CONCLUSIONS = [
  "Plain-English querying of multi-camera CCTV works end to end, and it is live.",
  "Structured events first, search second: the right video comes first for 19 of 22 questions.",
  "Every answer cites its source moment: one click to check it.",
  "Open-weight models running on a laptop: no GPU cluster needed.",
];

const NEXT_STEPS = [
  "Questions about order and sequences across cameras (“after the van arrived…”)",
  "Scale from 71 clips to all 769 audited MEVA clips, then to larger datasets",
  "New settings: streets, stations, shopping centres, night-time and indoor footage",
];

const initials = (name: string) =>
  name
    .split(" ")
    .filter((_, index, parts) => index === 0 || index === parts.length - 1)
    .map((part) => part[0])
    .join("");

/** Section eyebrow: small tracked mono label above each heading. */
function Eyebrow({ children }: { children: string }) {
  return <p className="text-ink-3 mb-3.5 font-mono text-[11px] tracking-[1.4px]">{children}</p>;
}

/** Section heading, at the one size every section uses. */
function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mb-4 max-w-[30ch] text-[30px] leading-[1.2] font-bold"
      style={{ textWrap: "pretty" }}
    >
      {children}
    </h2>
  );
}

/** A screenshot of the real app in a minimal browser window. */
function BrowserFrame({
  url,
  children,
  className,
  ...rest
}: { url: string; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        "border-hairline-strong bg-panel-solid shadow-glass-lg min-w-0 overflow-hidden rounded-[14px] border",
        className,
      )}
    >
      <div className="border-hairline bg-canvas flex items-center gap-3 border-b px-3.5 py-2.5">
        <div aria-hidden className="flex gap-1.5">
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="bg-ink-3/40 size-2.5 rounded-full" />
          ))}
        </div>
        <span className="text-ink-3 border-hairline truncate rounded-md border px-2.5 py-0.5 font-mono text-[11px]">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

/** One thin bar of the retrieval comparison, labelled with its count. */
function RetrievalBar({ value, filtered }: { value: number; filtered: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-2 flex-1">
        <div
          className={cn("h-full rounded-r-[4px]", filtered ? "bg-accent" : "bg-ink-3/45")}
          style={{ width: `${(value / RETRIEVAL_TOTAL) * 100}%` }}
        />
      </div>
      <span className="text-ink w-[54px] shrink-0 text-right font-mono text-[13px]">
        <span className="sr-only">{filtered ? "With filters: " : "Without filters: "}</span>
        {value} / {RETRIEVAL_TOTAL}
      </span>
    </div>
  );
}

/** Public landing page. Server component — no interactive state of its own.
 *  `signInHref` is /login, or /auth/guest with the code when opened from the showcase QR. */
export function LandingPage({ signInHref = "/login" }: { signInHref?: string }) {
  // The sign-in links are plain anchors: a <Link> would prefetch /auth/guest, signing the
  // visitor in before they click. A full page load also takes the new session cookies and
  // the redirect to the dashboard in one go.
  return (
    <div className="bg-canvas text-ink font-barlow min-h-screen">
      <script
        type="application/ld+json"
        // Escape "<" so the JSON can never close the script tag early.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData()).replace(/</g, "\\u003c"),
        }}
      />
      <header className="border-hairline bg-panel-strong sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3.5 backdrop-blur-[18px] sm:gap-4 sm:px-7">
        <div className="min-w-0">
          <BrandLockup />
        </div>
        <nav className="flex shrink-0 items-center gap-3 sm:gap-[22px]">
          {[
            ["Problem", "#problem"],
            ["How it works", "#how"],
            ["Results", "#results"],
            ["Team", "#team"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-ink-2 hover:text-ink hidden text-[13px] md:inline"
            >
              {label}
            </Link>
          ))}
          <ThemeToggle />
          <a
            href={signInHref}
            className="surface-action flex h-10 items-center rounded-[10px] px-3.5 text-[14px] font-semibold sm:px-[18px]"
          >
            Sign in
          </a>
        </nav>
      </header>

      {/* Hero: the pitch on the left; the real Results workspace on the right, larger than
          its column and bleeding off the right edge (clipped by the section) on wide screens.
          The screenshot stays flat: a 3D tilt makes the browser re-sample it as a texture,
          which blurs the interface's small text. */}
      <section className="relative overflow-hidden px-7 pt-16 pb-20 lg:pt-20 lg:pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[340px] -left-[280px] h-[900px] w-[900px] rounded-full"
          style={{ background: "radial-gradient(circle, var(--glow-1), transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-240px] bottom-[-360px] h-[1000px] w-[1000px] rounded-full"
          style={{ background: "radial-gradient(circle, var(--glow-2), transparent 70%)" }}
        />
        <div
          data-hero-grid
          className="relative mx-auto grid max-w-[1120px] items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
        >
          <div className="min-w-0">
            <Eyebrow>UTS CAPSTONE · PROJECT 08-01</Eyebrow>
            <h1
              className="mb-5 text-[40px] leading-[1.08] font-bold sm:text-[50px]"
              style={{ textWrap: "balance" }}
            >
              Ask your camera archive a question. Get the moment, not the tape.
            </h1>
            <p
              className="text-ink-2 mb-8 max-w-[52ch] text-[16px] leading-[1.65]"
              style={{ textWrap: "pretty" }}
            >
              Query multi-camera CCTV footage in natural language. Language and vision-language
              models turn hours of recordings into searchable events, and every answer points to the
              exact moments behind it.
            </p>
            <div className="mb-9 flex flex-wrap gap-3">
              <a
                href={signInHref}
                className="surface-action flex h-[50px] items-center rounded-[11px] px-6 text-[15px] font-semibold"
              >
                Open the workspace
              </a>
              <Link
                href="#how"
                className="border-hairline-strong bg-panel-solid text-ink flex h-[50px] items-center rounded-[11px] border px-6 text-[15px]"
              >
                See how it works
              </Link>
            </div>
            <ul className="border-hairline flex list-none flex-col gap-2.5 border-t p-0 pt-6">
              {HERO_POINTS.map((point) => (
                <li key={point} className="text-ink-2 flex items-center gap-2.5 text-[14px]">
                  <Check
                    size={15}
                    strokeWidth={2.4}
                    className="text-accent-strong shrink-0"
                    aria-hidden
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Hover: the frame lifts and takes the accent, a soft glow rises behind it and the
              query card drifts the other way. Only translate, never scale: re-sampling the
              screenshot would blur it. `isolate` keeps the glow behind the frame only. */}
          <div className="group/hero relative isolate min-w-0 lg:w-[125%]">
            <div
              data-hero-glow
              aria-hidden
              className="pointer-events-none absolute -inset-8 -z-10 rounded-[32px] opacity-0 blur-2xl transition-opacity duration-700 group-hover/hero:opacity-100"
              style={{ background: "radial-gradient(closest-side, var(--glow-1), transparent)" }}
            />
            <BrowserFrame
              url="cctvai.site/results"
              data-hero-frame
              className="group-hover/hero:border-accent-line transition-[translate,box-shadow,border-color] duration-500 ease-out group-hover/hero:-translate-y-1.5 group-hover/hero:shadow-[var(--shadow-lg),var(--shadow-accent)]"
            >
              <Image
                src={trackingShot}
                priority
                sizes="(max-width: 1024px) 100vw, 780px"
                alt={`The Results workspace for the question “${HERO_QUESTION}”: an answer listing the vehicles and people seen between 13:00 and 14:00, each citing a numbered source, beside hospital footage from camera G341 with a white SUV outlined and the top five matching moments listed below.`}
                quality={SCREENSHOT_QUALITY}
                className="h-auto w-full"
              />
            </BrowserFrame>

            {/* Decorative echo of the query in the screenshot: it ties the pitch to the product.
                Hidden from assistive tech, which already reads the image's description. */}
            <div
              data-hero-query
              aria-hidden
              className="glass-panel absolute -bottom-7 left-4 hidden max-w-[300px] rounded-[14px] p-3.5 transition-[translate] duration-500 ease-out group-hover/hero:-translate-x-1.5 group-hover/hero:translate-y-1 sm:block lg:-left-10"
            >
              <p className="text-ink-3 mb-2 font-mono text-[10px] tracking-[1.2px]">YOUR QUERY</p>
              <p className="surface-chat-user border-accent-line text-ink rounded-[10px] rounded-br-none border px-3 py-2 text-[13px] leading-[1.45]">
                {HERO_QUESTION}
              </p>
              <p className="text-ink-2 mt-2.5 flex items-center gap-1.5 text-[12px]">
                <span className="bg-match size-1.5 rounded-full" />5 matching moments · cited answer
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The problem: the scale of CCTV in Australia, and the cost of watching it by hand. */}
      <section
        id="problem"
        aria-labelledby="problem-heading"
        className="border-hairline border-t px-7 py-16"
      >
        <div className="mx-auto max-w-[1120px]">
          <Eyebrow>THE PROBLEM</Eyebrow>
          <SectionTitle id="problem-heading">More footage than anyone can watch.</SectionTitle>
          <div className="mt-8 grid [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] gap-10">
            <div className="min-w-0">
              <p className="text-accent-strong font-mono text-[56px] leading-none font-semibold sm:text-[68px]">
                25,500+
              </p>
              <p className="text-ink-2 mt-3 mb-6 text-[16px]">
                cameras on public transport, in just three states.
              </p>
              <dl className="border-hairline bg-hairline grid grid-cols-3 gap-px overflow-hidden rounded-xl border">
                {CAMERA_COUNTS.map((count) => (
                  // dt must come first in the markup; flex-col-reverse puts the number on top.
                  <div key={count.label} className="bg-panel-solid flex flex-col-reverse px-4 py-4">
                    <dt className="text-ink-2 text-[13px] leading-[1.4]">{count.label}</dt>
                    <dd className="text-ink font-mono text-[20px] font-semibold">{count.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {SCALE_FACTS.map((fact) => (
                  <div key={fact.value} className="glass-card-flat rounded-xl p-4">
                    <p className="text-ink font-mono text-[26px] font-semibold">{fact.value}</p>
                    <p className="text-ink-2 mt-1 text-[13px] leading-[1.45]">{fact.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <p
                className="text-ink-2 mb-5 text-[15px] leading-[1.65]"
                style={{ textWrap: "pretty" }}
              >
                After the 2014 Martin Place siege in Sydney, investigators viewed{" "}
                <strong className="text-ink">more than 1,000 hours of CCTV by hand</strong>. In a
                later NSW case, reviewing 14,000 CCTV files took months.
              </p>
              <p className="mb-5 text-[24px] leading-[1.3] font-bold">
                Today, someone still has to watch it.
              </p>
              <p
                className="text-ink-2 mb-6 text-[15px] leading-[1.65]"
                style={{ textWrap: "pretty" }}
              >
                Footage is slow to search when an event spans several cameras or unfolds over time,
                and current vision-language models reason poorly across cameras. Most tools only
                filter by camera and time window, so unless someone already knows where and when to
                look, the footage goes unreviewed.
              </p>
              <p className="text-ink-3 text-[12px] leading-[1.5]">
                Sources: Morgan &amp; Coughlan (2018), Australian Institute of Criminology;
                Microsoft Australia News Centre (2021); State Coroner of NSW (2015). Daily hours are
                our estimate, assuming continuous recording.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The idea in one line: a question in, the moment out. */}
      <section
        aria-labelledby="idea-heading"
        className="border-hairline border-t px-7 py-16"
        // --panel-soft is a gradient, so it can't be a Tailwind colour utility.
        style={{ backgroundImage: "var(--panel-soft)" }}
      >
        <div className="mx-auto max-w-[760px] text-center">
          <Eyebrow>THE IDEA</Eyebrow>
          <h2 id="idea-heading" className="mb-8 text-[34px] leading-[1.15] font-bold">
            Ask in plain English. <span className="text-accent-strong">Get the moment.</span>
          </h2>
          <div
            data-idea-query
            className="glass-panel mx-auto flex max-w-[620px] items-center gap-3 rounded-full py-2 pr-2 pl-5 text-left"
          >
            <p className="text-ink min-w-0 flex-1 text-[15px] leading-[1.4]">{HERO_QUESTION}</p>
            <span
              aria-hidden
              className="surface-action flex size-10 shrink-0 items-center justify-center rounded-full"
            >
              <Search size={17} strokeWidth={2.2} />
            </span>
          </div>
          <ul className="mx-auto mt-9 grid max-w-[620px] list-none grid-cols-3 gap-4 p-0">
            {OBJECTIVE.map((item) => (
              <li key={item.question}>
                <p className="text-accent-strong font-mono text-[15px] font-semibold">
                  {item.question}
                </p>
                <p className="text-ink-2 text-[14px]">{item.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="how"
        aria-labelledby="how-heading"
        className="border-hairline border-t px-7 py-16"
      >
        <div className="mx-auto max-w-[1120px]">
          <Eyebrow>HOW IT WORKS</Eyebrow>
          <SectionTitle id="how-heading">From footage to answer, in five steps.</SectionTitle>
          <p
            className="text-ink-2 mb-[34px] max-w-[70ch] text-[15px] leading-[1.65]"
            style={{ textWrap: "pretty" }}
          >
            Models reason poorly about events across cameras, so Horus does not ask a model to watch
            the video at query time. It extracts structured events first, then searches them.
          </p>
          <ol className="grid list-none [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))] gap-[14px] p-0">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className={cn(
                  "flex flex-col rounded-xl p-5",
                  index === STEPS.length - 1
                    ? "border-accent-line bg-accent-soft border"
                    : "glass-card-flat",
                )}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="border-hairline bg-canvas text-accent-strong flex size-9 items-center justify-center rounded-lg border">
                    <step.icon size={17} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="text-accent-strong font-mono text-[15px] font-semibold">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mb-1.5 text-[17px] font-semibold">{step.title}</h3>
                <p
                  className="text-ink-2 mb-4 flex-1 text-[14px] leading-[1.55]"
                  style={{ textWrap: "pretty" }}
                >
                  {step.body}
                </p>
                <p className="text-ink-3 font-mono text-[11px] leading-[1.5]">{step.tech}</p>
              </li>
            ))}
          </ol>
          <p className="border-hairline-strong text-ink-2 mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed px-4 py-3 text-[13px]">
            <span className="text-accent-strong font-mono text-[11px] tracking-[1.2px]">
              CHECKED
            </span>
            Steps 2 and 4 are tested separately, so a wrong answer can be traced to the step that
            caused it.
          </p>

          {/* One real question from the presentation, traced through steps 4 and 5. */}
          <div data-trace className="mt-14">
            <h3 className="mb-1.5 text-[21px] font-semibold">
              Under the hood: one question, traced
            </h3>
            <p className="text-ink-2 mb-6 text-[14px] leading-[1.6]">
              Filters narrow the events to the right place and time; meaning then ranks what is
              left. Metadata alone cannot tell a white SUV from a red one.
            </p>
            <ol className="grid list-none [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))] gap-[14px] p-0">
              <li className="glass-card-flat rounded-xl p-5">
                <p className="text-ink-3 mb-2.5 font-mono text-[11px] tracking-[1.2px]">
                  1 · THE QUESTION
                </p>
                <p className="text-[15px] leading-[1.5]">
                  “A white SUV at the school on the 7th March between 11am and 12pm”
                </p>
              </li>
              <li className="glass-card-flat rounded-xl p-5">
                <p className="text-ink-3 mb-2.5 font-mono text-[11px] tracking-[1.2px]">
                  2 · FILTERS
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[14px]">
                  {TRACE_FILTERS.map(([key, value]) => (
                    <div key={key} className="contents">
                      <dt className="text-ink-3">{key}</dt>
                      <dd className="font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-ink-2 mt-2.5 text-[12px]">
                  No model call: instant and repeatable.
                </p>
              </li>
              <li className="glass-card-flat rounded-xl p-5">
                <p className="text-ink-3 mb-2.5 font-mono text-[11px] tracking-[1.2px]">
                  3 · SEARCH
                </p>
                <p className="mb-2 flex items-center gap-2 text-[15px] font-semibold">
                  1,955 events <ArrowRight size={14} aria-hidden /> 5 returned
                </p>
                <p className="text-ink-2 font-mono text-[12px]">scores {TRACE_SCORES.join("  ")}</p>
                <p className="text-ink-2 mt-2.5 text-[12px]">All clear of the 0.6 cut-off.</p>
              </li>
              <li className="border-accent-line bg-accent-soft rounded-xl border p-5">
                <p className="text-accent-strong mb-2.5 font-mono text-[11px] tracking-[1.2px]">
                  4 · THE ANSWER
                </p>
                <p className="text-[14px] leading-[1.55]">
                  “A white SUV is parked nose-in at the building entrance at 11:13 [1]. Earlier that
                  hour cameras captured it driving through campus at 11:02 [2] and leaving a service
                  bay at 11:08 [4]; these may show the same vehicle.”
                </p>
              </li>
            </ol>
            <p className="text-ink-2 mt-3 flex items-center gap-2 text-[13px]">
              <Check size={14} strokeWidth={2.4} className="text-accent-strong" aria-hidden />
              It cites every event it used, and says the sightings may be one vehicle rather than
              asserting it.
            </p>
          </div>
        </div>
      </section>

      {/* The real interface, screen by screen. */}
      <section
        id="product"
        aria-labelledby="product-heading"
        className="border-hairline border-t px-7 py-16"
        style={{ backgroundImage: "var(--panel-soft)" }}
      >
        <div className="mx-auto flex max-w-[1120px] flex-col gap-16">
          <div>
            <Eyebrow>THE PRODUCT</Eyebrow>
            <SectionTitle id="product-heading">
              An AI answer is only useful if you can check it.
            </SectionTitle>
          </div>

          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] items-center gap-10">
            <div className="min-w-0">
              <h3 className="mb-3 text-[21px] font-semibold">
                Ask the way you&apos;d ask a colleague.
              </h3>
              <ul className="text-ink-2 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-[1.6]">
                <li>No query syntax: describe the event in plain words.</li>
                <li>
                  Place, date and time in the question become filters, like the hospital on 5 March
                  between 1pm and 2pm. Detected terms can be retuned inline.
                </li>
                <li>Recent and saved queries run again in one click.</li>
              </ul>
              <p className="text-ink-3 mt-6 mb-2.5 font-mono text-[11px] tracking-[1.2px]">
                QUESTIONS LIKE THESE
              </p>
              <ul aria-label="Example questions" className="flex list-none flex-wrap gap-2 p-0">
                {EXAMPLE_QUESTIONS.map((question) => (
                  <li
                    key={question}
                    className="border-hairline text-ink-2 rounded-full border px-3 py-1.5 text-[13px] leading-[1.35]"
                  >
                    {question}
                  </li>
                ))}
              </ul>
            </div>
            <BrowserFrame url="cctvai.site/dashboard">
              <Image
                src={homeShot}
                sizes="(max-width: 760px) 100vw, 540px"
                alt={`The search screen, titled “Ask your footage”: the question “${HERO_QUESTION}” in the search field with the place and time underlined as detected terms, and the three most recent questions below.`}
                quality={SCREENSHOT_QUALITY}
                className="h-auto w-full"
              />
            </BrowserFrame>
          </div>

          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] items-center gap-10">
            <BrowserFrame url="cctvai.site/results">
              <Image
                src={metadataShot}
                sizes="(max-width: 760px) 100vw, 540px"
                alt="An answer about the hospital between 13:00 and 14:00 with timed, cited bullet points, next to footage from camera G341, with the chunk metadata panel open on the right showing the event, its confidence, camera, scene, time and description."
                quality={SCREENSHOT_QUALITY}
                className="h-auto w-full"
              />
            </BrowserFrame>
            <div className="min-w-0">
              <h3 className="mb-4 text-[21px] font-semibold">Every answer shows its sources.</h3>
              <ol className="flex list-none flex-col gap-4 p-0">
                {ANSWER_FEATURES.map((feature, index) => (
                  <li key={feature.title} className="flex gap-3.5">
                    <span className="surface-action flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold">{feature.title}</p>
                      <p className="text-ink-2 text-[14px] leading-[1.55]">{feature.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <p
            data-tagline
            className="surface-action rounded-2xl px-8 py-9 text-center text-[26px] leading-[1.25] font-bold sm:text-[30px]"
          >
            The AI does not have the last word. The video does.
          </p>
        </div>
      </section>

      <section
        id="results"
        aria-labelledby="results-heading"
        className="border-hairline border-t px-7 py-16"
      >
        <div className="mx-auto max-w-[1120px]">
          <Eyebrow>KEY RESULTS</Eyebrow>
          <SectionTitle id="results-heading">
            Filtering doubles accuracy, and every layer is scored on its own.
          </SectionTitle>
          <p
            className="text-ink-2 mb-[34px] max-w-[70ch] text-[15px] leading-[1.65]"
            style={{ textWrap: "pretty" }}
          >
            MEVA&apos;s audited annotations are the ground truth. The annotations and the search are
            scored independently, and the test set includes questions whose right answer is that
            nothing matches, checked against every caption, twice.
          </p>

          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] gap-[18px]">
            <div className="surface-action rounded-2xl p-7">
              <p className="font-mono text-[64px] leading-none font-semibold">
                19/22 <span className="text-[24px] font-normal opacity-80">vs 9/22</span>
              </p>
              <p className="mt-3 text-[15px] leading-[1.5] opacity-90">
                questions return the correct video first, with versus without filters.
              </p>
              <p className="mt-6 font-mono text-[28px] font-semibold">
                0.886 <span className="text-[16px] font-normal opacity-80">vs 0.432</span>
              </p>
              <p className="text-[14px] opacity-90">mean reciprocal rank</p>
            </div>

            <figure data-retrieval-chart className="glass-card-flat m-0 rounded-2xl p-6">
              <figcaption className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[16px] font-semibold">Retrieval, 22 questions</span>
                <span className="text-ink-2 flex items-center gap-3 font-mono text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="bg-accent size-2.5 rounded-[2px]" />
                    with filters
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="bg-ink-3/45 size-2.5 rounded-[2px]" />
                    without
                  </span>
                </span>
              </figcaption>
              <ul className="flex list-none flex-col gap-5 p-0">
                {RETRIEVAL.map((row) => (
                  <li key={row.label}>
                    <p className="text-ink-2 mb-1.5 text-[13px]">{row.label}</p>
                    <div className="flex flex-col gap-1.5">
                      <RetrievalBar value={row.withFilters} filtered />
                      <RetrievalBar value={row.without} filtered={false} />
                    </div>
                  </li>
                ))}
              </ul>
            </figure>
          </div>

          <h3 className="mt-12 mb-4 text-[18px] font-semibold">The annotations</h3>
          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] gap-[14px]">
            {ANNOTATION_RESULTS.map((result) => (
              <div key={result.value} className="glass-card-flat rounded-xl p-5">
                <p className="text-accent-strong font-mono text-[34px] leading-none font-semibold">
                  {result.value}
                </p>
                <p className="mt-2 text-[14px] font-semibold">{result.label}</p>
                <p className="text-ink-2 mt-1 text-[13px]">{result.detail}</p>
              </div>
            ))}
          </div>

          <div
            data-honest-finding
            className="border-accent-line mt-[14px] grid [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] items-center gap-6 rounded-xl border p-6"
          >
            <div className="min-w-0">
              <p className="text-accent-strong mb-2 font-mono text-[11px] tracking-[1.4px]">
                HONEST FINDING
              </p>
              <p className="text-ink-2 text-[14px] leading-[1.6]" style={{ textWrap: "pretty" }}>
                The events describe <strong className="text-ink">where</strong> people and vehicles
                move very well, but name the exact MEVA action less often. Even people disagree:
                MEVA lists what happens in a clip without saying who does it.
              </p>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="font-mono text-[34px] leading-none font-semibold">20%</p>
                <p className="text-ink-2 mt-1.5 text-[13px]">strict action match</p>
              </div>
              <div>
                <p className="font-mono text-[34px] leading-none font-semibold">32%</p>
                <p className="text-ink-2 mt-1.5 text-[13px]">
                  agreement between two human reviewers
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="next"
        aria-labelledby="next-heading"
        className="border-hairline border-t px-7 py-16"
        style={{ backgroundImage: "var(--panel-soft)" }}
      >
        <div className="mx-auto max-w-[1120px]">
          <Eyebrow>CONCLUSIONS</Eyebrow>
          <SectionTitle id="next-heading">It works, and we know what to fix next.</SectionTitle>
          <p
            className="text-ink-2 mb-[34px] max-w-[70ch] text-[15px] leading-[1.65]"
            style={{ textWrap: "pretty" }}
          >
            Hours of manual review become a question and a click, for police, transport operators
            and councils.
          </p>
          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] gap-[18px]">
            <div className="glass-card-flat rounded-xl p-6">
              <h3 className="mb-4 text-[17px] font-semibold">What we showed</h3>
              <ul className="flex list-none flex-col gap-3 p-0">
                {CONCLUSIONS.map((item) => (
                  <li key={item} className="text-ink-2 flex gap-2.5 text-[14px] leading-[1.55]">
                    <Check
                      size={15}
                      strokeWidth={2.4}
                      className="text-accent-strong mt-[3px] shrink-0"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card-flat rounded-xl p-6">
              <h3 className="mb-4 text-[17px] font-semibold">Next steps</h3>
              <ul className="flex list-none flex-col gap-3 p-0">
                {NEXT_STEPS.map((item) => (
                  <li key={item} className="text-ink-2 flex gap-2.5 text-[14px] leading-[1.55]">
                    <ArrowRight
                      size={15}
                      strokeWidth={2.2}
                      className="text-accent-strong mt-[3px] shrink-0"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        id="team"
        aria-labelledby="team-heading"
        className="border-hairline border-t px-7 py-16"
      >
        <div className="mx-auto max-w-[1120px]">
          <Eyebrow>THE TEAM</Eyebrow>
          <h2
            id="team-heading"
            className="mb-3 text-[30px] leading-[1.2] font-bold"
            style={{ textWrap: "pretty" }}
          >
            Built by a six-person capstone team at UTS.
          </h2>
          <p className="text-ink-2 mb-[34px] max-w-[64ch] text-[15px] leading-[1.65]">
            Master of Data Science and Innovation students, each leading one layer of the system.
            Client: Dr Ali Haidar · Mentor: Junaid Akram.
          </p>
          <ul className="grid list-none [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] gap-[14px] p-0">
            {TEAM.map((member) => (
              <li key={member.handle}>
                {/* The whole card is the link, so any point on it opens the profile. */}
                <a
                  href={`https://github.com/${member.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.name} on GitHub (@${member.handle})`}
                  className="group/member glass-card-flat hover:border-accent-line flex h-full items-center gap-3.5 rounded-xl p-4 transition-colors duration-150"
                >
                  <span
                    aria-hidden
                    className="border-accent-line bg-accent-soft text-accent-strong flex size-11 shrink-0 items-center justify-center rounded-full border font-mono text-[13px] font-semibold"
                  >
                    {initials(member.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink truncate text-[15px] font-semibold">{member.name}</p>
                    <p className="text-ink-2 truncate text-[13px]">{member.role}</p>
                    <span className="text-ink-3 group-hover/member:text-accent-strong mt-1 inline-flex items-center gap-1.5 font-mono text-[12px] transition-colors duration-150">
                      <Github size={13} strokeWidth={2} aria-hidden />@{member.handle}
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-hairline border-t px-7 pt-16 pb-16">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="mb-3.5 text-[28px] font-bold" style={{ textWrap: "pretty" }}>
            See it on real multi-camera footage.
          </h2>
          <p
            className="text-ink-2 mb-[26px] text-[15px] leading-[1.6]"
            style={{ textWrap: "pretty" }}
          >
            Horus is live. Sign in to open the query workspace and ask your first question.
          </p>
          <a
            href={signInHref}
            className="surface-action inline-flex h-[50px] items-center rounded-[11px] px-[26px] text-[15px] font-semibold"
          >
            Sign in
          </a>
        </div>
      </section>

      <footer className="border-hairline text-ink-3 flex flex-wrap items-start justify-between gap-x-10 gap-y-4 border-t px-7 pt-[26px] pb-[32px] text-[12px] leading-[1.6]">
        <div className="max-w-[60ch]">
          <p className="text-ink-2 mb-1 font-semibold">
            Interactive Surveillance Video Querying Using LLMs and Multi-Camera CCTV Datasets
          </p>
          <p>
            A capstone project (08-01) for 36105 iLab: Capstone Project, Master of Data Science and
            Innovation, University of Technology Sydney (UTS), 2026.
          </p>
        </div>
        <p className="font-mono">Pre-recorded footage only · MEVA research dataset</p>
      </footer>
    </div>
  );
}
