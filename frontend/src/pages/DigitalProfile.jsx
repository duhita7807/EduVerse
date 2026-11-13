import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import SectionCard from "../components/SectionCard.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import CertificateItem from "../components/CertificateItem.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import { safeUrl } from "../utils/safeUrl.js";

const Pill = ({ children }) => (
  <span style={{ display: "inline-block", padding: "4px 10px", border: "1px solid var(--line)", borderRadius: 100, fontSize: 12, marginRight: 6, marginBottom: 6, color: "var(--slate)" }}>
    {children}
  </span>
);

const DigitalProfile = () => {
  const { student } = useAuth();
  const [completion, setCompletion] = useState(student?.profileCompletion || 0);
  const [insights, setInsights] = useState(student?.aiInsights || {});
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    api.get("/profile/completion").then(({ data }) => setCompletion(data.profileCompletion)).catch(() => {});
    api.get("/ai/insights").then(({ data }) => setInsights(data.aiInsights)).catch(() => {});
  }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAiError("");
    try {
      const { data } = await api.post("/ai/analyze");
      setInsights(data.aiInsights);
    } catch (err) {
      setAiError(err.response?.data?.message || "AI analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const totalSkills = [
    ...(student?.skills?.programmingLanguages || []),
    ...(student?.skills?.webTechnologies || []),
    ...(student?.skills?.databases || []),
    ...(student?.skills?.tools || []),
  ];

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <span className="badge">Digital Profile</span>
          <h1 style={{ fontSize: 28, margin: "10px 0 4px" }}>{student?.name}</h1>
          <p style={{ color: "var(--slate)" }}>{student?.college} · {student?.branch} · {student?.year}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 28, color: "var(--ink)" }}>{completion}%</div>
          <div style={{ fontSize: 12, color: "var(--slate)" }}>complete</div>
        </div>
      </div>

      <SectionCard title="Overview">
        <ProgressBar value={completion} />
      </SectionCard>

      <SectionCard
        title="AI profile insights"
        index="01"
        action={
          <button className="btn secondary" onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? "Analyzing…" : insights?.summary ? "Re-analyze" : "Generate insights"}
          </button>
        }
      >
        {aiError && <div className="alert error">{aiError}</div>}
        {insights?.summary ? (
          <>
            <p style={{ fontStyle: "italic", color: "var(--text)", marginBottom: 16, fontFamily: "var(--font-display)", fontSize: 16 }}>
              “{insights.summary}”
            </p>
            {insights.extractedSkills?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate)", marginBottom: 6 }}>Extracted skills</div>
                {insights.extractedSkills.map((s) => <Pill key={s}>{s}</Pill>)}
              </div>
            )}
            {insights.suggestedCategories?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate)", marginBottom: 6 }}>Suggested categories</div>
                {insights.suggestedCategories.map((s) => <Pill key={s}>{s}</Pill>)}
              </div>
            )}
            {insights.improvementSuggestions?.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate)", marginBottom: 6 }}>Improvement suggestions</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text)", fontSize: 14 }}>
                  {insights.improvementSuggestions.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p style={{ color: "var(--slate)" }}>No AI analysis yet. Generate an AI-powered summary and improvement suggestions from your profile data.</p>
        )}
      </SectionCard>

      <SectionCard title="Skills" index="02">
        {totalSkills.length ? totalSkills.map((s) => <Pill key={s}>{s}</Pill>) : (
          <p style={{ color: "var(--slate)" }}>No skills added yet. <Link to="/edit-profile" style={{ color: "var(--brass)", fontWeight: 600 }}>Add skills</Link></p>
        )}
      </SectionCard>

      <SectionCard title="Projects" index="03">
        {student?.projects?.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {student.projects.map((p, i) => (
              <div key={i} style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 8 }}>{p.description}</p>
                {p.technologies?.map((t) => <Pill key={t}>{t}</Pill>)}
                {p.githubRepo && (
                  <div style={{ marginTop: 6 }}>
                    <a href={p.githubRepo} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--brass)", fontWeight: 600 }}>Repository ↗</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--slate)" }}>No projects added yet.</p>
        )}
      </SectionCard>

      <SectionCard title="Coding profile" index="04">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate)" }}>GitHub</div>
            {student?.githubUsername ? (
              <>
                <div className="mono" style={{ fontSize: 22, marginTop: 4 }}>{student?.githubData?.publicRepos ?? "—"}</div>
                <div style={{ fontSize: 12, color: "var(--slate)" }}>public repos</div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--slate)", marginTop: 4 }}>Not connected</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate)" }}>LinkedIn</div>
            {safeUrl(student?.linkedinProfile) ? (
              <a href={safeUrl(student.linkedinProfile)} target="_blank" rel="noreferrer" className="link-quiet" style={{ marginTop: 6 }}>View profile</a>
            ) : (
              <div style={{ fontSize: 13, color: "var(--slate)", marginTop: 4 }}>Not connected</div>
            )}
          </div>
        </div>
        <Link to="/integrations" className="btn secondary" style={{ marginTop: 20 }}>Manage integrations</Link>
      </SectionCard>

      <SectionCard title="Experience" index="05">
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate)", marginBottom: 8 }}>Internships</div>
        {student?.internships?.length ? student.internships.map((it, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600 }}>{it.role} — {it.company}</div>
          </div>
        )) : <p style={{ color: "var(--slate)", fontSize: 13 }}>None added.</p>}

        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate)", margin: "16px 0 8px" }}>Certifications</div>
        {student?.certifications?.length ? student.certifications.map((c, i) => (
          <CertificateItem key={c._id || i} cert={c} compact />
        )) : <p style={{ color: "var(--slate)", fontSize: 13 }}>None added.</p>}
      </SectionCard>
    </DashboardLayout>
  );
};

export default DigitalProfile;
