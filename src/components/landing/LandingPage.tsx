import { Check, Github } from "lucide-react";
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

/* Content follows the project proposal (36105 iLab, project 08-01). Figures are MEVA's
   published totals, not claims about how much this deployment has indexed. */

/** The screenshots (src/assets/landing) are imported, not served from public/: the import
 *  gives each a content-hashed URL, so a replaced screenshot can never be served stale from
 *  a cache, plus its real width and height. They are stored lossless; this is the one lossy
 *  pass, when Next serves them.
 *  Its default (75) smears the interface's small text. Must be listed in `images.qualities`. */
const SCREENSHOT_QUALITY = 90;

const HERO_POINTS = [
  "Plain-language questions, no query syntax",
  "Answers that cite the moments they came from",
  "Detected objects outlined on the footage",
];

const DATASET_FACTS = [
  { value: "9,300+", label: "hours of multi-camera footage" },
  { value: "38", label: "ground and aerial cameras" },
  { value: "37", label: "annotated activity classes" },
];

const LAYERS = [
  {
    num: "01",
    title: "Annotation pipeline",
    body: "Motion pre-filtering skips idle footage. Object detection and tracking follow people and vehicles, and a vision-language model describes each event in plain language.",
  },
  {
    num: "02",
    title: "Event database",
    body: "Every event becomes a structured record: its time window, camera, scene, participating objects and activity, stored in PostgreSQL.",
  },
  {
    num: "03",
    title: "Retrieval (RAG)",
    body: "Descriptions and metadata are embedded in a vector index. A question is matched by meaning rather than keywords, and narrowed by the cameras and scenes it names.",
  },
  {
    num: "04",
    title: "Answer and interface",
    body: "A language model writes an answer grounded in the retrieved events, citing each one it used. The interface plays those moments and keeps the conversation going.",
  },
];

const EVALUATION = [
  {
    title: "Deterministic metrics",
    body: "Event matching, temporal and spatial IoU, precision and recall, computed with fixed rules so results stay comparable with NIST ActEV.",
  },
  {
    title: "A calibrated LLM judge",
    body: "Used only where no deterministic answer exists, such as caption quality, and validated against human agreement before any score is trusted.",
  },
  {
    title: "Questions with no answer",
    body: "The test set includes queries whose right answer is that nothing matches, so a system that always returns something can't score well.",
  },
];

const SCOPE = [
  "General-purpose video retrieval",
  "Pre-recorded footage only, no live streams",
  "Built on the MEVA research dataset",
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

/** Public landing page. Server component — no interactive state of its own. */
export function LandingPage() {
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
          <Link href="#how" className="text-ink-2 hover:text-ink hidden text-[13px] sm:inline">
            How it works
          </Link>
          <Link href="#product" className="text-ink-2 hover:text-ink hidden text-[13px] sm:inline">
            Product
          </Link>
          <Link href="#team" className="text-ink-2 hover:text-ink hidden text-[13px] sm:inline">
            Team
          </Link>
          <ThemeToggle />
          <Link
            href="/login"
            className="surface-action flex h-10 items-center rounded-[10px] px-3.5 text-[14px] font-semibold sm:px-[18px]"
          >
            Sign in
          </Link>
        </nav>
      </header>

      {/* Hero: the pitch on the left; the real Results workspace on the right, larger than
          its column and bleeding off the right edge (clipped by the section) on wide screens.
          The screenshot stays flat: a 3D tilt makes the browser re-sample it as a texture,
          which blurs the interface's small text. */}
      <section className="relative overflow-hidden px-7 pt-16 pb-20 lg:pt-20 lg:pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[220px] -left-[160px] h-[560px] w-[560px] rounded-full"
          style={{ background: "radial-gradient(circle, var(--glow-1), transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-120px] bottom-[-220px] h-[620px] w-[620px] rounded-full"
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
              <Link
                href="/login"
                className="surface-action flex h-[50px] items-center rounded-[11px] px-6 text-[15px] font-semibold"
              >
                Open the workspace
              </Link>
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
                alt="The Results workspace for the question “Did someone carry a heavy object in this scene?”: an answer citing numbered sources beside parking-lot footage, with two tracked people outlined and the top five matching moments listed below."
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
                Did someone carry a heavy object in this scene?
              </p>
              <p className="text-ink-2 mt-2.5 flex items-center gap-1.5 text-[12px]">
                <span className="bg-match size-1.5 rounded-full" />5 matching moments · cited answer
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The problem, in the proposal's terms, with the dataset behind the project. */}
      <section className="border-hairline border-t px-7 py-16">
        <div className="mx-auto grid max-w-[1120px] [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] items-center gap-10">
          <div className="min-w-0">
            <Eyebrow>THE PROBLEM</Eyebrow>
            <h2 className="mb-4 text-[30px] leading-[1.2] font-bold" style={{ textWrap: "pretty" }}>
              More footage than any team can watch.
            </h2>
            <p
              className="text-ink-2 mb-4 text-[15px] leading-[1.65]"
              style={{ textWrap: "pretty" }}
            >
              Camera networks record around the clock, but most search tools only filter by camera
              or time window. Unless someone already knows where and when to look, footage goes
              unreviewed, and questions that span several cameras or unfold over time go unanswered.
            </p>
            <p className="text-ink-2 text-[15px] leading-[1.65]" style={{ textWrap: "pretty" }}>
              Instead of scrubbing through hours of video, you ask in plain language, such as
              whether anyone entered a building after a vehicle arrived, and see the relevant
              moments directly.
            </p>
          </div>
          <div className="min-w-0">
            <div className="border-hairline bg-hairline grid grid-cols-3 gap-px overflow-hidden rounded-xl border">
              {DATASET_FACTS.map((fact) => (
                <div key={fact.label} className="bg-panel-solid px-4 py-5">
                  <div className="text-accent-strong mb-1 font-mono text-[26px] font-semibold">
                    {fact.value}
                  </div>
                  <div className="text-ink-2 text-[13px] leading-[1.4]">{fact.label}</div>
                </div>
              ))}
            </div>
            <p className="text-ink-3 mt-3 text-[12px] leading-[1.5]">
              MEVA, the Multiview Extended Video with Activities dataset (Corona et al., 2021). The
              project works on a defined subset of its public KF1 release.
            </p>
          </div>
        </div>
      </section>

      <section id="how" className="border-hairline border-t px-7 py-16">
        <div className="mx-auto max-w-[1120px]">
          <Eyebrow>HOW IT WORKS</Eyebrow>
          <h2
            className="mb-[34px] max-w-[28ch] text-[30px] leading-[1.2] font-bold"
            style={{ textWrap: "pretty" }}
          >
            From raw video to a cited answer, in four layers.
          </h2>
          <ol className="grid list-none [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] gap-[18px] p-0">
            {LAYERS.map((layer) => (
              <li key={layer.num} className="glass-card-flat rounded-xl p-[22px]">
                <div className="text-accent-strong mb-3 font-mono text-[12px]">{layer.num}</div>
                <h3 className="mb-2 text-[17px] font-semibold">{layer.title}</h3>
                <p className="text-ink-2 text-[14px] leading-[1.6]" style={{ textWrap: "pretty" }}>
                  {layer.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The real interface, screen by screen. */}
      <section
        id="product"
        className="border-hairline border-t px-7 py-16"
        // --panel-soft is a gradient, so it can't be a Tailwind colour utility.
        style={{ backgroundImage: "var(--panel-soft)" }}
      >
        <div className="mx-auto flex max-w-[1120px] flex-col gap-16">
          <div>
            <Eyebrow>THE PRODUCT</Eyebrow>
            <h2
              className="max-w-[28ch] text-[30px] leading-[1.2] font-bold"
              style={{ textWrap: "pretty" }}
            >
              Built around the moment you&apos;re looking for.
            </h2>
          </div>

          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] items-center gap-10">
            <div className="min-w-0">
              <h3 className="mb-3 text-[21px] font-semibold">
                Ask the way you&apos;d ask a colleague.
              </h3>
              <ul className="text-ink-2 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-[1.6]">
                <li>No query syntax: describe the event in plain words.</li>
                <li>
                  Detected terms, like people or vehicles, become filters you can retune inline.
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
                alt="The search screen, titled “Ask your footage”: a plain-language question in the search field with the detected term someone underlined, and the three most recent questions below."
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
                alt="An answer citing numbered sources next to school parking-lot footage, with the chunk metadata panel open on the right showing the event, its confidence, camera, scene, time and description."
                quality={SCREENSHOT_QUALITY}
                className="h-auto w-full"
              />
            </BrowserFrame>
            <div className="min-w-0">
              <h3 className="mb-3 text-[21px] font-semibold">Every answer shows its sources.</h3>
              <ul className="text-ink-2 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-[1.6]">
                <li>Numbered citations link each statement to the moment it came from.</li>
                <li>
                  The player opens on the top match and outlines the objects the search found.
                </li>
                <li>Event, confidence, camera, scene and time sit right beside the footage.</li>
                <li>
                  Follow-up questions keep the thread, about every result or one chosen moment.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="evaluation" className="border-hairline border-t px-7 py-16">
        <div className="mx-auto max-w-[1120px]">
          <Eyebrow>EVALUATION DESIGN</Eyebrow>
          <h2
            className="mb-4 max-w-[30ch] text-[30px] leading-[1.2] font-bold"
            style={{ textWrap: "pretty" }}
          >
            Measured against audited ground truth, not against itself.
          </h2>
          <p
            className="text-ink-2 mb-[34px] max-w-[70ch] text-[15px] leading-[1.65]"
            style={{ textWrap: "pretty" }}
          >
            MEVA&apos;s audited annotations are both the system&apos;s metadata and its ground
            truth. To avoid circular evaluation, the annotation layer is scored blind against those
            records before the query layer is assessed, so a wrong answer can be traced to the layer
            that caused it.
          </p>
          <div className="mb-8 grid [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] gap-[18px]">
            {EVALUATION.map((item) => (
              <div key={item.title} className="glass-card-flat rounded-xl p-[22px]">
                <h3 className="mb-2 text-[16px] font-semibold">{item.title}</h3>
                <p className="text-ink-2 text-[14px] leading-[1.6]" style={{ textWrap: "pretty" }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
          <ul className="flex list-none flex-wrap gap-2 p-0">
            {SCOPE.map((item) => (
              <li
                key={item}
                className="border-hairline text-ink-2 rounded-full border px-3 py-1 font-mono text-[11px]"
              >
                {item}
              </li>
            ))}
          </ul>
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
          </p>
          <ul className="grid list-none [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] gap-[14px] p-0">
            {TEAM.map((member) => (
              <li
                key={member.handle}
                className="glass-card-flat flex items-center gap-3.5 rounded-xl p-4"
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
                  <a
                    href={`https://github.com/${member.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on GitHub (@${member.handle})`}
                    className="text-ink-3 hover:text-accent-strong mt-1 inline-flex items-center gap-1.5 font-mono text-[12px] transition-colors duration-150"
                  >
                    <Github size={13} strokeWidth={2} aria-hidden />@{member.handle}
                  </a>
                </div>
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
            Sign in to open the query workspace and ask your first question.
          </p>
          <Link
            href="/login"
            className="surface-action inline-flex h-[50px] items-center rounded-[11px] px-[26px] text-[15px] font-semibold"
          >
            Sign in
          </Link>
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
