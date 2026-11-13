import React, { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import DownloadResumeButton from "../components/DownloadResumeButton.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import PageHeader from "../components/PageHeader.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../api/axios.js";
import { getErrorMessage } from "../utils/apiError.js";

const monthYear = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "");

const S = {
  h2: { fontSize: 12.5, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, borderBottom: "1.5px solid #222", paddingBottom: 3, margin: "16px 0 8px", color: "#111" },
  row: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" },
  small: { fontSize: 12, color: "#555" },
  body: { fontSize: 12.5, margin: "2px 0 0", color: "#222", lineHeight: 1.45 },
};

const Section = ({ title, children }) => (
  <div style={{ breakInside: "avoid" }}>
    <h2 style={S.h2}>{title}</h2>
    {children}
  </div>
);

/** Resume generator: builds an ATS-friendly one-column resume from the student's profile and saves it as PDF. */
const Resume = () => {
  const toast = useToast();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const [show, setShow] = useState({ education: true, skills: true, projects: true, internships: true, certifications: true });

  useEffect(() => {
    api
      .get("/profile")
      .then(({ data }) => {
        setP(data.student);
        setSummary(data.student.bio || "");
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <DashboardLayout><PageHeader title="Resume" subtitle="Loading your profile…" /></DashboardLayout>;
  if (!p) return <DashboardLayout><PageHeader title="Resume" subtitle="Couldn't load your profile." /></DashboardLayout>;

  const skillGroups = [
    ["Languages", p.skills?.programmingLanguages],
    ["Web", p.skills?.webTechnologies],
    ["Databases", p.skills?.databases],
    ["Tools", p.skills?.tools],
  ].filter(([, v]) => v?.length);
  const education = p.education || [];
  const projects = p.projects || [];
  const internships = p.internships || [];
  // Rejected certificates are left off so the resume only lists credible entries.
  const certs = (p.certifications || []).filter((c) => c.verificationStatus !== "rejected");

  const links = [
    p.email,
    p.githubUsername && `github.com/${p.githubUsername}`,
    p.linkedinProfile && p.linkedinProfile.replace(/^https?:\/\/(www\.)?/, ""),
  ].filter(Boolean);

  const toggles = [
    ["education", "Education"], ["skills", "Skills"], ["projects", "Projects"], ["internships", "Experience"], ["certifications", "Certifications"],
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Resume"
        subtitle="Built from your profile. Download it as an ATS-friendly PDF."
        actions={<DownloadResumeButton profile={p} options={{ summary, sections: show }} />}
      />

      <SectionCard title="Customize" icon={FileText} index="01">
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Career summary</label>
        <textarea rows={3} maxLength={300} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="2–3 lines about you and the role you're targeting (only changes this resume, not your profile)" />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
          {toggles.map(([k, label]) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={show[k]} onChange={() => setShow({ ...show, [k]: !show[k] })} /> {label}
            </label>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--slate)", marginBottom: 0 }}>
          The PDF is built for applicant-tracking systems: one column, standard section names, plain bullets and real selectable text (no images or tables). The preview below is a close visual match.
        </p>
      </SectionCard>

      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        <div
          id="resume-sheet"
          style={{ background: "#fff", color: "#111", width: "100%", maxWidth: 794, minWidth: 600, margin: "0 auto", padding: "36px 42px", boxShadow: "0 4px 24px rgba(0,0,0,0.18)", border: "1px solid #ddd", fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 0.5 }}>{p.name}</div>
            <div style={{ ...S.small, marginTop: 4 }}>{links.join("  |  ")}</div>
            <div style={S.small}>{[p.college, p.branch, p.year].filter(Boolean).join(" · ")}</div>
          </div>

          {summary.trim() && <Section title="Summary"><p style={S.body}>{summary.trim()}</p></Section>}

          {show.education && education.length > 0 && (
            <Section title="Education">
              {education.map((e, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={S.row}>
                    <strong style={{ fontSize: 13 }}>{e.institution}</strong>
                    <span style={S.small}>{[e.startYear, e.endYear].filter(Boolean).join(" – ")}</span>
                  </div>
                  <div style={S.row}>
                    <span style={S.body}>{[e.degree, e.branch].filter(Boolean).join(", ")}</span>
                    {e.cgpa != null && <span style={S.small}>CGPA: {e.cgpa}</span>}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {show.skills && skillGroups.length > 0 && (
            <Section title="Technical Skills">
              {skillGroups.map(([label, list]) => (
                <p key={label} style={S.body}><strong>{label}:</strong> {list.join(", ")}</p>
              ))}
            </Section>
          )}

          {show.internships && internships.length > 0 && (
            <Section title="Experience">
              {internships.map((x, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={S.row}>
                    <strong style={{ fontSize: 13 }}>{[x.role, x.company].filter(Boolean).join(" — ")}</strong>
                    <span style={S.small}>{[monthYear(x.startDate), monthYear(x.endDate) || (x.startDate ? "Present" : "")].filter(Boolean).join(" – ")}</span>
                  </div>
                  {x.description && <p style={S.body}>{x.description}</p>}
                </div>
              ))}
            </Section>
          )}

          {show.projects && projects.length > 0 && (
            <Section title="Projects">
              {projects.map((x, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={S.row}>
                    <strong style={{ fontSize: 13 }}>{x.title}</strong>
                    <span style={S.small}>{[x.githubRepo && x.githubRepo.replace(/^https?:\/\/(www\.)?/, ""), x.liveDemo && "Live demo"].filter(Boolean).join("  |  ")}</span>
                  </div>
                  {x.technologies?.length > 0 && <div style={{ ...S.small, fontStyle: "italic" }}>{x.technologies.join(", ")}</div>}
                  {x.description && <p style={S.body}>{x.description}</p>}
                </div>
              ))}
            </Section>
          )}

          {show.certifications && certs.length > 0 && (
            <Section title="Certifications">
              {certs.map((c, i) => (
                <div key={i} style={{ ...S.row, marginBottom: 3 }}>
                  <span style={S.body}>
                    <strong>{c.title}</strong>{c.issuedBy ? ` — ${c.issuedBy}` : ""}{c.verificationStatus === "verified" ? " (Verified)" : ""}
                  </span>
                  <span style={S.small}>{monthYear(c.issueDate)}</span>
                </div>
              ))}
            </Section>
          )}

          {education.length + projects.length + internships.length + certs.length + skillGroups.length === 0 && (
            <p style={{ ...S.body, textAlign: "center", marginTop: 24, color: "#777" }}>
              Your profile is empty. Add education, skills and projects in Edit Profile and they'll appear here.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Resume;
