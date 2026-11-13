import { useEffect } from "react";

const SELECTOR = ".card, .sl-group, .sb-row, .pr-q";

/**
 * Fades cards in as they scroll into view. Watches for cards rendered later
 * (after data loads) too. Does nothing under prefers-reduced-motion or in
 * browsers without IntersectionObserver, so content is never hidden.
 */
const useReveal = (rootRef, key) => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window)) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -40px 0px", threshold: 0.05 }
    );
    const seen = new WeakSet();
    const watch = () =>
      root.querySelectorAll(SELECTOR).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        // Only below-the-fold content is hidden; what's on screen now stays visible.
        if (el.getBoundingClientRect().top < window.innerHeight) return;
        el.classList.add("reveal");
        io.observe(el);
      });
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(root, { childList: true, subtree: true });
    // Safety net: never leave content hidden if the observer doesn't report (e.g. embedded views).
    const fallback = setInterval(() => {
      root.querySelectorAll(".reveal:not(.in)").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");
      });
    }, 800);
    return () => {
      io.disconnect();
      mo.disconnect();
      clearInterval(fallback);
    };
  }, [rootRef, key]);
};

export default useReveal;
