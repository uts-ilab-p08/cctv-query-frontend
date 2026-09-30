import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/** How close to the bottom still counts as "at the bottom", in pixels. */
const NEAR_BOTTOM_PX = 80;

/**
 * Keeps a chat's scroll container at the bottom. Every new answer (a change of
 * `answerKey`) scrolls down, and while the reader stays at the bottom it follows the
 * content as it grows, e.g. an answer streaming in or suggestions loading below it.
 * Once the reader scrolls up to read, growth leaves them there until the next answer.
 */
export function useStickToBottom(ref: RefObject<HTMLElement | null>, answerKey: unknown) {
  const pinned = useRef(true);

  const toBottom = () => {
    const node = ref.current;
    if (node) node.scrollTop = node.scrollHeight;
  };

  // The reader's position decides whether growth should follow them down.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onScroll = () => {
      pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight <= NEAR_BOTTOM_PX;
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [ref]);

  // A new answer: back to the bottom, whatever the reader was doing.
  useLayoutEffect(() => {
    pinned.current = true;
    toBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerKey]);

  // Growth (streaming text, late suggestions): follow it while pinned.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new MutationObserver(() => {
      if (pinned.current) toBottom();
    });
    observer.observe(node, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}
