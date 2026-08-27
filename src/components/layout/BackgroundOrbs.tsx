/** Decorative blurred gradient orbs behind the whole app. */
export function BackgroundOrbs() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-40 -left-30 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.28),transparent_70%)] blur-[10px]" />
      <div className="absolute top-[200px] -right-40 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.2),transparent_70%)] blur-[10px]" />
      <div className="absolute -bottom-50 left-[30%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.16),transparent_70%)] blur-[10px]" />
    </div>
  );
}
