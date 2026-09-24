/** Placeholder bubble content while the assistant is answering. */
export function ThinkingDots() {
  return (
    <span role="status" aria-label="Assistant is thinking" className="flex items-center gap-1 py-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="bg-ink-3 size-1.5 animate-pulse rounded-full"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
