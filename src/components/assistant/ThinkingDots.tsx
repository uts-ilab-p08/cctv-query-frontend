interface ThinkingDotsProps {
  /** What the assistant is doing right now, as the backend reports it (e.g. "Generating
   *  answer…"). Without it, only the dots show. */
  label?: string;
}

/** Placeholder bubble content while the assistant is answering. */
export function ThinkingDots({ label }: ThinkingDotsProps) {
  return (
    <span
      role="status"
      aria-label={label ? `Assistant is thinking: ${label}` : "Assistant is thinking"}
      className="flex items-center gap-2 py-1"
    >
      {/* A wave: each dot rises and brightens a beat after the one before. */}
      <span aria-hidden className="flex h-3 items-center gap-1.5">
        {[0, 160, 320].map((delay) => (
          <span
            key={delay}
            className="thinking-dot bg-accent-strong size-2 rounded-full"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      {label ? <span className="text-ink-3 text-[12px]">{label}</span> : null}
    </span>
  );
}
