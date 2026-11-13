import React from "react";
import ProgressBar from "../ProgressBar.jsx";

const SkillPill = ({ children, tone }) => {
  const tones = {
    strong: { bg: "var(--success-soft)", color: "var(--success)", border: "rgba(52,211,153,0.35)" },
    partial: { bg: "var(--warning-soft)", color: "var(--warning)", border: "rgba(251,191,36,0.35)" },
    missing: { bg: "var(--danger-soft)", color: "var(--danger)", border: "rgba(248,113,113,0.35)" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 600,
        marginRight: 6,
        marginBottom: 6,
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
      }}
    >
      {children}
    </span>
  );
};

/**
 * Visualizes a single skill-gap result for a target role: coverage %,
 * and strong / partial / missing skill groups (spec section 6).
 */
const SkillGapCard = ({ gap }) => {
  if (!gap) return null;

  const { targetRole, strongSkills = [], partialSkills = [], missingSkills = [], coveragePercentage = 0, gapPercentage = 0 } = gap;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{targetRole}</div>
        <span className="mono" style={{ fontSize: 13, color: "var(--slate)" }}>{gapPercentage}% gap</span>
      </div>

      <ProgressBar value={coveragePercentage} label="Skill coverage" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Strong ({strongSkills.length})
          </div>
          {strongSkills.length ? strongSkills.map((s) => <SkillPill key={s} tone="strong">{s}</SkillPill>) : <span style={{ fontSize: 12, color: "var(--slate)" }}>None yet</span>}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warning)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Partial ({partialSkills.length})
          </div>
          {partialSkills.length ? partialSkills.map((s) => <SkillPill key={s} tone="partial">{s}</SkillPill>) : <span style={{ fontSize: 12, color: "var(--slate)" }}>None yet</span>}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Missing ({missingSkills.length})
          </div>
          {missingSkills.length ? missingSkills.map((s) => <SkillPill key={s} tone="missing">{s}</SkillPill>) : <span style={{ fontSize: 12, color: "var(--slate)" }}>None — full coverage</span>}
        </div>
      </div>
    </div>
  );
};

export default SkillGapCard;
