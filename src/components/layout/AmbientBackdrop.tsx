/**
 * The three ambient glows that sit BEHIND every layer.
 * Without them the has nothing to refract and the UI reads as flat cards.
 * Mount once, as the first child of the app shell (which must be `relative overflow-hidden`).
 */
export function AmbientBackdrop() {
  return (
    <>
      <div className="glow glow-1 -top-[160px] -left-[120px] size-[520px]" />
      <div className="glow glow-2 top-[200px] -right-[160px] size-[560px]" />
      <div className="glow glow-3 -bottom-[200px] left-[30%] size-[600px]" />
    </>
  );
}
