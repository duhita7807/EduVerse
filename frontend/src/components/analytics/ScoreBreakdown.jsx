import React, { useEffect, useState } from "react";
import { Code2, FolderGit2, Briefcase, Link2, GitBranch, Award, UserCheck, ArrowUp, ArrowDown } from "lucide-react";

// What each component is computed from (see backend/services/readinessService.js).
const META = {
  technicalSkills: { label: "Technical Skills", icon: Code2, hint: "Distinct skills listed in your profile" },
  projects: { label: "Projects", icon: FolderGit2, hint: "Number of projects and variety of technologies" },
  internships: { label: "Internships", icon: Briefcase, hint: "Internships on your profile" },
  coding: { label: "Coding Profile", icon: Link2, hint: "GitHub and LinkedIn linked" },
  github: { label: "GitHub Activity", icon: GitBranch, hint: "Synced repositories and stars" },
  certifications: { label: "Certifications", icon: Award, hint: "Certifications added" },
  profileCompleteness: { label: "Profile Completeness", icon: UserCheck, hint: "Profile sections filled in" },
};

const tone = (v) => (v >= 75 ? "good" : v >= 40 ? "mid" : "low");

/**
 * Every component score of the readiness analysis, with its weight in the
 * overall score. `previous` (scores before the latest sync) adds a change
 * marker so updates are visible the moment they arrive.
 */
const ScoreBreakdown = ({ componentScores = {}, weights = {}, previous }) => {
  const entries = Object.entries(componentScores);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true)); // bars grow in from 0 on first render
    return () => cancelAnimationFrame(id);
  }, []);

  if (entries.length === 0) {
    return <p style={{ color: "var(--slate)" }}>No breakdown available yet.</p>;
  }

  return (
    <ul className="sb-list">
      {entries.map(([key, value]) => {
        const m = META[key] || { label: key, icon: Code2, hint: "" };
        const Icon = m.icon;
        const delta = previous && typeof previous[key] === "number" ? value - previous[key] : 0;
        return (
          <li key={key} className={`sb-row ${delta ? "changed" : ""}`}>
            <span className="sb-icon"><Icon size={16} /></span>
            <div className="sb-body">
              <div className="sb-top">
                <span className="sb-label">{m.label}</span>
                {weights[key] != null && <span className="sb-weight">{weights[key]}% of score</span>}
                <span className="sb-value tabular">
                  {delta !== 0 && (
                    <span className={`sb-delta ${delta > 0 ? "up" : "down"}`} aria-label={`${delta > 0 ? "up" : "down"} ${Math.abs(delta)} points`}>
                      {delta > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                      {Math.abs(delta)}
                    </span>
                  )}
                  {value}%
                </span>
              </div>
              <div className="sb-track" role="progressbar" aria-label={m.label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
                <div className={`sb-fill ${tone(value)}`} style={{ width: drawn ? `${value}%` : 0 }} />
              </div>
              {m.hint && <div className="sb-hint">{m.hint}</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default ScoreBreakdown;
