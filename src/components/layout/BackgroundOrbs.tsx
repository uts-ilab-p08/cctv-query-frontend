/**
 * SPEC §1 — three radial glows sitting behind every glass layer. Purely
 * decorative, so it stays a server component and never intercepts a pointer.
 */
export function BackgroundOrbs() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -top-40 -left-40 size-130 rounded-full"
        style={{ background: "radial-gradient(circle, var(--glow-1), transparent 70%)" }}
      />
      <div
        className="absolute -top-20 -right-48 size-140 rounded-full"
        style={{ background: "radial-gradient(circle, var(--glow-2), transparent 70%)" }}
      />
      <div
        className="absolute -bottom-56 left-1/3 size-150 rounded-full"
        style={{ background: "radial-gradient(circle, var(--glow-3), transparent 70%)" }}
      />
    </div>
  );
}
