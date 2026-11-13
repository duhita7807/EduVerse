import React from "react";

/**
 * Reused for both "Strengths" and "Weaknesses" lists (spec section 10) —
 * the checkmark/dash and color simply flip based on `variant`.
 */
const StrengthsCard = ({ title, items = [], variant = "strength" }) => {
  const isStrength = variant === "strength";
  const marker = isStrength ? "✓" : "△";
  const markerColor = isStrength ? "var(--success)" : "var(--danger)";

  return (
    <div>
      {title && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate)", marginBottom: 10 }}>{title}</div>}
      {items.length === 0 ? (
        <p style={{ color: "var(--slate)", fontSize: 13 }}>Nothing to show yet.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((item, i) => (
            <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8, fontSize: 14 }}>
              <span style={{ color: markerColor, fontWeight: 700, flexShrink: 0 }}>{marker}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StrengthsCard;
