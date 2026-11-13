import React, { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

/** Maps a 0-100 score to a two-stop gradient drawn along the ring itself. */
const CATEGORY_GRADIENT = (score) => {
  if (score >= 86) return { from: "#12b76a", to: "#0e9384" };   // Highly Placement Ready — green into ion
  if (score >= 71) return { from: "#3b82f6", to: "#4f46e5" };   // Placement Ready — blue into indigo
  if (score >= 51) return { from: "#60a5fa", to: "#2563eb" };   // Developing — light blue into blue
  if (score >= 31) return { from: "#f79009", to: "#dc6803" };   // Needs Improvement — amber into ember
  return { from: "#f04438", to: "#d92d20" };                    // Beginner
};

/**
 * Circular gradient SVG progress ring showing the overall placement
 * readiness score (0-100), with a soft matching glow — the visual
 * centerpiece of the AI Analytics dashboard.
 */
/** Animates a number from its previous value to `target` (instant under reduced motion). */
const useCountUp = (target, ms = 900) => {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      from.current = target;
      setValue(target);
      return undefined;
    }
    const start = performance.now();
    const begin = from.current;
    let id;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const v = Math.round(begin + (target - begin) * (1 - (1 - t) ** 3)); // ease-out
      setValue(v);
      if (t < 1) id = requestAnimationFrame(tick);
      else from.current = target;
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      from.current = target;
    };
  }, [target, ms]);
  return value;
};

const ReadinessScore = ({ score = 0, category = "", size = 176, subtitle }) => {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const shown = useCountUp(Math.min(100, Math.max(0, score)));
  const offset = circumference - (shown / 100) * circumference;
  const { from, to } = CATEGORY_GRADIENT(score);
  const gradId = "readinessRingGradient";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" style={{ stroke: "var(--bg-alt)" }} strokeWidth={13} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={13}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}

          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="tabular" aria-live="polite" style={{ fontFamily: "var(--font-display)", fontSize: size * 0.24, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>
            {shown}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--slate)" }}>/ 100</div>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--slate)", fontWeight: 600, marginBottom: 6 }}>
          <Sparkles size={14} style={{ color: "var(--ai)" }} />
          Placement Readiness
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 27,
            fontWeight: 600,
            marginBottom: 6,
            backgroundImage: `linear-gradient(120deg, ${from}, ${to})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {category}
        </div>
        {subtitle && <div style={{ fontSize: 13, color: "var(--slate)" }}>{subtitle}</div>}
      </div>
    </div>
  );
};

export default ReadinessScore;
