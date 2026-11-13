import React from "react";

const DIFFICULTY_COLOR = { Beginner: "var(--success)", Intermediate: "var(--warning)", Advanced: "var(--danger)" };

/**
 * A single recommended project card (spec section 9) — title, description,
 * technologies, skills it develops, difficulty, and why it helps placement.
 */
const ProjectRecommendation = ({ project }) => {
  const { title, description, technologies = [], skillsDeveloped = [], difficulty, whyItHelps } = project;

  return (
    <div className="card hoverable" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontFamily: "var(--font-display)", fontSize: 16 }}>{title}</div>
        {difficulty && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 100, color: "#fff", background: DIFFICULTY_COLOR[difficulty] || "var(--slate)" }}>
            {difficulty}
          </span>
        )}
      </div>

      <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 10 }}>{description}</p>

      {technologies.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {technologies.map((t) => (
            <span key={t} className="badge" style={{ marginRight: 6, marginBottom: 6 }}>{t}</span>
          ))}
        </div>
      )}

      {skillsDeveloped.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--slate)", marginBottom: 8 }}>
          <strong style={{ color: "var(--text)" }}>Skills developed:</strong> {skillsDeveloped.join(", ")}
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--brass)", fontWeight: 600 }}>{whyItHelps}</p>
    </div>
  );
};

export default ProjectRecommendation;
