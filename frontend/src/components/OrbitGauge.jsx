import React from "react";

const SIZE = 300;
const C = SIZE / 2;

/**
 * Concentric progress rings ("orbits") with a number in the middle.
 * rings: [{ label, value (0-100), color }] drawn outermost first.
 * Each ring draws itself in on mount; a ring of fine ticks turns slowly
 * around the outside. Used as the hero instrument on the student dashboard.
 */
const OrbitGauge = ({ rings, centerValue, centerCaption }) => {
  const gap = 24;
  const stroke = 10;
  return (
    <div className="orbit" style={{ width: "100%", maxWidth: SIZE }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={rings.map((r) => `${r.label} ${r.value}%`).join(", ")}>
        <circle className="orbit-ticks" cx={C} cy={C} r={C - 6} />
        {rings.map((ring, i) => {
          const r = C - 30 - i * gap;
          const circ = 2 * Math.PI * r;
          const pct = Math.max(0, Math.min(100, ring.value || 0));
          return (
            <g key={ring.label} transform={`rotate(-90 ${C} ${C})`}>
              <circle cx={C} cy={C} r={r} fill="none" style={{ stroke: "var(--bg-alt)" }} strokeWidth={stroke} />
              <circle
                className="orbit-arc"
                cx={C}
                cy={C}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                style={{ stroke: ring.color, "--c": circ, "--t": circ * (1 - pct / 100), animationDelay: `${0.25 + i * 0.18}s` }}
              />
            </g>
          );
        })}
      </svg>
      <div className="orbit-center">
        <div className="orbit-value">{centerValue}</div>
        <div className="orbit-caption">{centerCaption}</div>
      </div>
    </div>
  );
};

export default OrbitGauge;
