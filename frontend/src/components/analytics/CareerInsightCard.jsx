import React from "react";

/**
 * A single "recommended career path" card with match %, relevant/missing
 * skills, and hedged reasoning + next steps (spec section 7).
 */
const CareerInsightCard = ({ insight, onSelect, selected }) => {
  const { career, matchScore, relevantSkills = [], missingSkills = [], reason, nextSteps } = insight;

  return (
    <div
      style={{
        border: `1px solid ${selected ? "var(--brass)" : "var(--line)"}`,
        borderRadius: "var(--radius)",
        padding: 18,
        background: selected ? "var(--brass-soft)" : "var(--surface)",
        opacity: selected ? 1 : 0.97,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontFamily: "var(--font-display)", fontSize: 17 }}>{career}</div>
        <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{matchScore}%</span>
      </div>

      <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 8 }}>{reason}</p>

      {relevantSkills.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--slate)", marginBottom: 4 }}>
          <strong style={{ color: "var(--text)" }}>Relevant:</strong> {relevantSkills.join(", ")}
        </div>
      )}
      {missingSkills.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--slate)", marginBottom: 12 }}>
          <strong style={{ color: "var(--text)" }}>Missing:</strong> {missingSkills.join(", ")}
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--brass)", fontWeight: 600, marginBottom: onSelect ? 12 : 0 }}>{nextSteps}</p>

      {onSelect && (
        <button type="button" className="btn secondary" style={{ fontSize: 12, padding: "8px 14px" }} onClick={() => onSelect(career)}>
          {selected ? "Selected as target role" : "Analyze this role"}
        </button>
      )}
    </div>
  );
};

export default CareerInsightCard;
