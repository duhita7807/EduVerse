import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import analyticsApi from "../../services/analyticsApi.js";
import { getErrorMessage } from "../../utils/apiError.js";

const PRIORITY_COLOR = { High: "var(--danger)", Medium: "var(--warning)", Low: "var(--success)" };

/**
 * Renders a prioritized, week-by-week learning roadmap as a connected
 * timeline (spec section 8). Each item already carries its own week range
 * from the backend, so this component only lays the items out in order.
 */
const LearningRoadmap = ({ roadmap = [] }) => {
  const { student, updateStudentInState } = useAuth();
  const toast = useToast();
  const [busySkill, setBusySkill] = useState(null);
  const done = new Set((student?.completedRoadmapSkills || []).map((s) => s.toLowerCase()));

  const markCompleted = async (skill) => {
    setBusySkill(skill);
    try {
      const data = await analyticsApi.completeRoadmapSkill(skill);
      updateStudentInState(data.student);
      toast.success(`${skill} added to your profile skills.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusySkill(null);
    }
  };

  if (roadmap.length === 0) {
    return <p style={{ color: "var(--slate)" }}>No learning gaps identified for this role — nice work.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 0 }}>
      {roadmap.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div
              className="mono"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--gradient-accent)",
                color: "var(--on-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            {i < roadmap.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--border)", margin: "4px 0" }} />}
          </div>

          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16, marginBottom: 16, flex: 1, background: "var(--surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--slate)" }}>{item.weekRange}</span>
                <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "var(--font-display)" }}>{item.skill}</span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 11px",
                  borderRadius: 100,
                  color: "#fff",
                  background: PRIORITY_COLOR[item.priority] || "var(--slate)",
                }}
              >
                {item.priority} priority
              </span>
            </div>

            <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 8 }}>{item.reason}</p>

            <div className="two-col-grid" style={{ fontSize: 13, gap: 10 }}>
              <div><strong>Learn:</strong> {item.learningObjective}</div>
              <div><strong>Practice:</strong> {item.practiceTask}</div>
              <div><strong>Project:</strong> {item.suggestedProject}</div>
              <div><strong>Duration:</strong> {item.estimatedDuration}</div>
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              {done.has(item.skill?.toLowerCase()) ? (
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={14} /> Completed
                </span>
              ) : (
                <button
                  className="btn secondary"
                  style={{ fontSize: 12, padding: "6px 12px" }}
                  disabled={busySkill === item.skill}
                  onClick={() => markCompleted(item.skill)}
                >
                  <CheckCircle2 size={13} /> {busySkill === item.skill ? "Saving…" : "Mark as Completed"}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LearningRoadmap;
