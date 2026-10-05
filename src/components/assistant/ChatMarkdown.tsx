import { useMemo, type ComponentProps } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

import { citationRef, linkCitations } from "@/lib/citations";
import { linkTimes, timeTarget } from "@/lib/timeMentions";
import type { Clip } from "@/types";

/** A cited source as the chat shows it: which moment, and how to name it. */
export interface CitedSource {
  id: string;
  /** e.g. "Vehicle arrival · G328 · 0:12". */
  label: string;
}

/** react-markdown hands each component its syntax-tree `node`; it isn't a DOM attribute. */
function domProps<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

type LinkProps = ComponentProps<"a"> & ExtraProps;

function ChatLink(props: LinkProps) {
  return (
    <a
      className="text-accent-strong underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
      {...domProps(props)}
    />
  );
}

/**
 * Element styles sized for a chat bubble (13px body). Headings are kept small: an
 * answer is a reply, not a document.
 */
const components: Components = {
  p: (props) => <p className="not-first:mt-2" {...domProps(props)} />,
  ul: (props) => <ul className="mt-1.5 list-disc space-y-1 pl-4 first:mt-0" {...domProps(props)} />,
  ol: (props) => (
    <ol className="mt-1.5 list-decimal space-y-1 pl-4 first:mt-0" {...domProps(props)} />
  ),
  li: (props) => <li className="pl-0.5" {...domProps(props)} />,
  strong: (props) => <strong className="text-ink font-semibold" {...domProps(props)} />,
  h1: (props) => (
    <h3 className="text-ink mt-2.5 text-[13px] font-semibold first:mt-0" {...domProps(props)} />
  ),
  h2: (props) => (
    <h3 className="text-ink mt-2.5 text-[13px] font-semibold first:mt-0" {...domProps(props)} />
  ),
  h3: (props) => (
    <h4 className="text-ink mt-2 text-[13px] font-semibold first:mt-0" {...domProps(props)} />
  ),
  a: (props) => <ChatLink {...props} />,
  // Inline code gets a chip; code inside a fenced block keeps its language class.
  code: ({ className, ...props }) => (
    <code
      className={
        className ?? "border-hairline rounded border bg-black/15 px-1 py-px font-mono text-[12px]"
      }
      {...domProps(props)}
    />
  ),
  pre: (props) => (
    <pre
      className="border-hairline mt-2 overflow-x-auto rounded-md border bg-black/20 p-2.5 font-mono text-[12px] leading-[1.45]"
      {...domProps(props)}
    />
  ),
  blockquote: (props) => (
    <blockquote className="border-accent-line mt-2 border-l-2 pl-2.5" {...domProps(props)} />
  ),
  table: (props) => (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full border-collapse text-[12px]" {...domProps(props)} />
    </div>
  ),
  th: (props) => (
    <th
      className="border-hairline text-ink border-b px-2 py-1 text-left font-semibold"
      {...domProps(props)}
    />
  ),
  td: (props) => <td className="border-hairline border-b px-2 py-1" {...domProps(props)} />,
};

interface ChatMarkdownProps {
  text: string;
  /** The moment an inline citation `[n]` points at. Without it, citations stay as written. */
  source?: (ref: number) => CitedSource | undefined;
  onOpenSource?: (id: string) => void;
  /** The moments on screen. With `onOpenTime`, each camera time the answer names
   *  (`16:51:12`) becomes a link that plays its moment from that second. */
  moments?: Clip[];
  onOpenTime?: (clipId: string, sec: number) => void;
}

/**
 * An assistant answer rendered from markdown. The LLM sometimes answers with lists,
 * emphasis or tables. Safe for model output: react-markdown builds React elements and
 * never injects raw HTML from the text, and its default URL transform strips
 * `javascript:` links.
 *
 * With `source`, each citation (`[2]`) becomes a numbered chip that opens its moment;
 * a citation no moment matches stays plain text. With `moments` and `onOpenTime`, each
 * time it can pin to a moment (see `linkTimes`) becomes a link that plays it there.
 */
export function ChatMarkdown({
  text,
  source,
  onOpenSource,
  moments,
  onOpenTime,
}: ChatMarkdownProps) {
  const playsTimes = !!moments && !!onOpenTime;

  const withCitations = useMemo<Components>(() => {
    if (!source && !playsTimes) return components;
    return {
      ...components,
      a: (props) => {
        const time = playsTimes ? timeTarget(props.href) : null;
        if (time) {
          const label = String(props.children ?? "");
          const camera = moments?.find((clip) => clip.id === time.clipId)?.camera;
          const name = `Play ${camera ? `${camera} ` : ""}at ${label}`;
          return (
            <button
              type="button"
              onClick={() => onOpenTime?.(time.clipId, time.sec)}
              aria-label={name}
              title={name}
              className="text-accent-strong decoration-accent-line hover:decoration-accent-strong cursor-pointer underline decoration-dotted decoration-2 underline-offset-[3px] transition-colors duration-150"
            >
              {label}
            </button>
          );
        }
        if (!source) return <ChatLink {...props} />;
        const ref = citationRef(props.href);
        if (ref === null) return <ChatLink {...props} />;
        const cited = source(ref);
        if (!cited) return <>{`[${ref}]`}</>;
        return (
          <button
            type="button"
            onClick={() => onOpenSource?.(cited.id)}
            aria-label={`Source ${ref}: ${cited.label}`}
            title={cited.label}
            className="border-accent-line bg-accent-soft text-accent-strong hover:bg-accent-line/40 mx-0.5 inline-flex h-4 min-w-4 cursor-pointer items-center justify-center rounded-full border px-1 align-[2px] font-mono text-[10px] leading-none transition-colors duration-150"
          >
            {ref}
          </button>
        );
      },
    };
  }, [source, onOpenSource, playsTimes, moments, onOpenTime]);

  // Times first: a time's resolution reads the `[n]` citation written right after it.
  const withTimes = playsTimes ? linkTimes(text, moments) : text;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={withCitations}>
      {source ? linkCitations(withTimes) : withTimes}
    </ReactMarkdown>
  );
}
export const renderChatMarkdown = (text: string) => <ChatMarkdown text={text} />;
