import React from "react";
import { Check } from "lucide-react";

const STEPS = [
  { key: "pending", label: "Recruiter submits" },
  { key: "approved", label: "TPO verifies" },
  { key: "applications", label: "Students apply" },
  { key: "results_submitted", label: "Recruiter evaluates" },
  { key: "finalized", label: "TPO finalizes" },
];

// How far along the flow each drive status is (index of the *current* step).
const CURRENT = { pending: 1, rejected: 0, approved: 3, results_submitted: 4, finalized: 5 };

/** Horizontal tracker showing where a drive is in the placement pipeline. */
const PlacementFlow = ({ status }) => {
  const current = CURRENT[status] ?? 0;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div
            key={s.key}
            style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
              padding: "5px 10px", borderRadius: 100,
              border: "1px solid var(--border)",
              background: done ? "var(--success-soft)" : active ? "var(--gradient-accent-soft)" : "var(--surface-alt)",
              color: done ? "var(--success)" : active ? "var(--accent-indigo)" : "var(--muted)",
            }}
          >
            {done && <Check size={12} />}
            {s.label}
          </div>
        );
      })}
    </div>
  );
};

export default PlacementFlow;
