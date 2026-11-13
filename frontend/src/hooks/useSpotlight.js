import { useEffect } from "react";

/**
 * Cursor spotlight: tells the card under the pointer where the pointer is
 * (--mx / --my), which tokens.css turns into a soft glow. One delegated
 * listener for the whole app; off under reduced motion and on touch screens.
 */
const useSpotlight = () => {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    if (window.matchMedia?.("(hover: none)").matches) return undefined;
    let frame = 0;
    const onMove = (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const card = e.target.closest?.(".card");
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
};

export default useSpotlight;
