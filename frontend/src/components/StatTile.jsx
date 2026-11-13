import React from "react";

/** Compact stat tile reused by the recruiter and TPO overview dashboards. */
const StatTile = ({ icon: Icon, label, value, sub, accent = "var(--accent-indigo)" }) => (
  <div className="card stat-tile" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, "--tile": accent }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div className="stat-icon">
        <Icon size={17} />
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--slate)" }}>{label}</span>
    </div>
    <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-display)" }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: "var(--slate)" }}>{sub}</div>}
  </div>
);

export default StatTile;
