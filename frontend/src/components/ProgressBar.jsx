import React from "react";

/**
 * Horizontal progress bar with a restrained gradient fill, used for
 * profile completion and readiness component scores throughout the app.
 */
const ProgressBar = ({ value = 0, label, height = 8 }) => {
  const pct = Math.max(0, Math.min(100, value));
  const isHigh = pct >= 80;

  return (
    <div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-soft)" }}>{label}</span>
          <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{ height, background: "var(--bg-alt)", borderRadius: 100, overflow: "hidden" }}>
        <div
          className="bar-grow"
          style={{
            width: `${pct}%`,
            height: "100%",
            background: isHigh ? "#12b76a" : "var(--primary)",
            borderRadius: 100,
            transition: "width 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
