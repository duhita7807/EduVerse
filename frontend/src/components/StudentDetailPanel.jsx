import React, { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Mail, ExternalLink, Link2, Code2 } from "lucide-react";
import CertificateItem from "./CertificateItem.jsx";
import DownloadResumeButton from "./DownloadResumeButton.jsx";
import { SkeletonLine } from "./LoadingSkeleton.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { tpoApi } from "../services/placementApi.js";
import { getErrorMessage } from "../utils/apiError.js";
import { assetUrl } from "../utils/assetUrl.js";
import { fmtDate, fmtDateTime } from "../utils/format.js";
import { safeUrl, githubUrl } from "../utils/safeUrl.js";
import "../styles/students.css";

const SKILL_GROUPS = [
  ["Programming languages", "programmingLanguages"],
  ["Web technologies", "webTechnologies"],
  ["Databases", "databases"],
  ["Tools & other", "tools"],
];

const DRIVE_STATUS_LABEL = {
  pending: "Awaiting verification",
  rejected: "Sent back",
  approved: "Applications open",
  results_submitted: "Results submitted",
  finalized: "Finalized",
};

const Field = ({ label, children }) => (
  <div className="sd-field">
    <dt>{label}</dt>
    <dd className={children ? "" : "empty"}>{children || "Not provided"}</dd>
  </div>
);

const Section = ({ title, count, children }) => (
  <section className="sd-section">
    <h4>
      {title}
      {count !== undefined && <span className="count">({count})</span>}
    </h4>
    {children}
  </section>
);

const ExtLink = ({ href, icon: Icon = ExternalLink, children }) => (
  <a href={href} target="_blank" rel="noreferrer noopener">
    <Icon size={13} /> {children}
  </a>
);

const dateRange = (a, b) => {
  const from = a ? fmtDate(a) : "";
  const to = b ? fmtDate(b) : "";
  if (!from && !to) return "";
  return `${from || "?"} – ${to || "Present"}`;
};

/**
 * Right-hand drawer with everything a student has submitted. Loaded on demand
 * from GET /api/tpo/students/:id so the table itself stays light.
 * `ids` + `onNavigate` let the TPO step through the current result page.
 */
const StudentDetailPanel = ({ studentId, ids = [], onNavigate, onClose }) => {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const closeRef = useRef(null);

  const index = ids.indexOf(studentId);
  const prevId = index > 0 ? ids[index - 1] : null;
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tpoApi
      .getStudent(studentId)
      .then((r) => !cancelled && setData(r.data))
      .catch((err) => {
        if (cancelled) return;
        toast.error(getErrorMessage(err));
        onClose();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const s = data?.student;
  const linkedin = s ? safeUrl(s.linkedinProfile) : null;
  const gh = s ? githubUrl(s.githubUsername) : null;
  const hasAnySkill = s && SKILL_GROUPS.some(([, k]) => s.skills?.[k]?.length);

  return (
    <>
      <div className="sd-overlay" onClick={onClose} />
      <aside className="sd-panel" role="dialog" aria-modal="true" aria-label="Student details">
        <div className="sd-bar">
          <div className="sd-bar-nav">
            <button className="icon-btn" onClick={() => prevId && onNavigate(prevId)} disabled={!prevId} aria-label="Previous student"><ChevronLeft size={16} /></button>
            <button className="icon-btn" onClick={() => nextId && onNavigate(nextId)} disabled={!nextId} aria-label="Next student"><ChevronRight size={16} /></button>
            {index >= 0 && <span>{index + 1} of {ids.length} on this page</span>}
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {loading || !s ? (
          <div className="sd-skeleton-wrap">
            <SkeletonLine width="55%" height={24} />
            <SkeletonLine width="35%" />
            <SkeletonLine height={90} />
            <SkeletonLine height={120} />
            <SkeletonLine height={120} />
          </div>
        ) : (
          <div className="sd-body">
            <div className="sd-hero">
              <div className="st-avatar">
                {s.profilePhoto ? <img src={assetUrl(s.profilePhoto)} alt="" /> : (s.name || "?").charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2>{s.name}</h2>
                <div className="st-sub">{s.college}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                  <span className="badge neutral">{s.year}</span>
                  <span className="badge neutral">{s.branch}</span>
                  <span className="st-mono">{s.rollNo}</span>
                  {s.isActive === false && <span className="badge danger">Deactivated</span>}
                </div>
                <div className="sd-links">
                  <a href={`mailto:${s.email}`}><Mail size={13} /> {s.email}</a>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
              <DownloadResumeButton profile={s} variant="secondary" label="Download resume (PDF)" />
            </div>

            {s.bio && (
              <Section title="About">
                <p style={{ margin: 0, fontSize: 14, color: "var(--text)", whiteSpace: "pre-wrap" }}>{s.bio}</p>
              </Section>
            )}

            <Section title="Profile">
              <dl className="sd-grid" style={{ margin: 0 }}>
                <Field label="CGPA (highest recorded)">{s.cgpa != null ? `${s.cgpa} / 10` : ""}</Field>
                <Field label="Profile completion">{`${s.profileCompletion || 0}%`}</Field>
                <Field label="Registered">{fmtDate(s.createdAt) !== "—" ? fmtDate(s.createdAt) : ""}</Field>
                <Field label="Last login">{s.lastLoginAt ? fmtDateTime(s.lastLoginAt) : ""}</Field>
              </dl>
            </Section>

            <Section title="Education" count={s.education?.length || 0}>
              {s.education?.length ? (
                s.education.map((e, i) => (
                  <div className="sd-item" key={i}>
                    <div className="sd-item-title">{[e.degree, e.institution].filter(Boolean).join(" — ") || "Education"}</div>
                    <div className="sd-item-meta">
                      {[e.branch, e.startYear || e.endYear ? `${e.startYear || "?"}–${e.endYear || "?"}` : "", e.cgpa != null ? `CGPA ${e.cgpa}` : ""].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                ))
              ) : (
                <p className="sd-muted">No education entries submitted.</p>
              )}
            </Section>

            <Section title="Skills" count={s.allSkills?.length || 0}>
              {hasAnySkill ? (
                SKILL_GROUPS.map(([label, key]) =>
                  s.skills?.[key]?.length ? (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <div className="st-sub" style={{ marginBottom: 6 }}>{label}</div>
                      {s.skills[key].map((sk, i) => <span key={`${sk}-${i}`} className="st-pill">{sk}</span>)}
                    </div>
                  ) : null
                )
              ) : (
                <p className="sd-muted">No skills submitted.</p>
              )}
            </Section>

            <Section title="Projects" count={s.projects?.length || 0}>
              {s.projects?.length ? (
                s.projects.map((p, i) => {
                  const repo = safeUrl(p.githubRepo);
                  const demo = safeUrl(p.liveDemo);
                  return (
                    <div className="sd-item" key={p._id || i}>
                      <div className="sd-item-title">{p.title}</div>
                      {p.description && <p>{p.description}</p>}
                      {p.technologies?.length > 0 && (
                        <div style={{ marginTop: 8 }}>{p.technologies.map((t, j) => <span key={`${t}-${j}`} className="st-pill">{t}</span>)}</div>
                      )}
                      {(repo || demo) && (
                        <div className="sd-links">
                          {repo && <ExtLink href={repo} icon={Code2}>Repository</ExtLink>}
                          {demo && <ExtLink href={demo}>Live demo</ExtLink>}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="sd-muted">No projects submitted.</p>
              )}
            </Section>

            <Section title="Internships" count={s.internships?.length || 0}>
              {s.internships?.length ? (
                s.internships.map((it, i) => (
                  <div className="sd-item" key={it._id || i}>
                    <div className="sd-item-title">{[it.role, it.company].filter(Boolean).join(" — ")}</div>
                    {dateRange(it.startDate, it.endDate) && <div className="sd-item-meta">{dateRange(it.startDate, it.endDate)}</div>}
                    {it.description && <p>{it.description}</p>}
                  </div>
                ))
              ) : (
                <p className="sd-muted">No internships submitted.</p>
              )}
            </Section>

            <Section title="Certifications" count={s.certifications?.length || 0}>
              {s.certifications?.length ? (
                <div className="cert-grid">
                  {/* credentialUrl is student-supplied: only http(s) links reach the href. */}
                  {s.certifications.map((c, i) => <CertificateItem key={c._id || i} cert={{ ...c, credentialUrl: safeUrl(c.credentialUrl) || undefined }} />)}
                </div>
              ) : (
                <p className="sd-muted">No certifications submitted.</p>
              )}
            </Section>

            <Section title="GitHub & LinkedIn">
              <dl className="sd-grid" style={{ margin: 0 }}>
                <Field label="GitHub">{gh ? <ExtLink href={gh}>{s.githubUsername}</ExtLink> : s.githubUsername}</Field>
                <Field label="LinkedIn">{linkedin ? <ExtLink href={linkedin} icon={Link2}>Open profile</ExtLink> : s.linkedinProfile}</Field>
              </dl>
            </Section>

            <Section title="Career interests">
              {s.careerInterests?.length ? (
                s.careerInterests.map((c, i) => <span key={`${c}-${i}`} className="st-pill">{c}</span>)
              ) : (
                <p className="sd-muted">None submitted.</p>
              )}
            </Section>

            <Section title="Placement applications" count={data.applications.length}>
              {data.applications.length ? (
                data.applications.map((a) => {
                  const done = a.finalStatus !== "pending";
                  return (
                    <div className="sd-item" key={a._id} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <div className="sd-item-title">{a.drive.company} — {a.drive.title}</div>
                        <div className="sd-item-meta">Applied {fmtDate(a.appliedAt)} · Drive: {DRIVE_STATUS_LABEL[a.drive.status] || a.drive.status}</div>
                      </div>
                      <span className={`badge ${done ? (a.finalStatus === "selected" ? "success" : "danger") : "neutral"}`} style={{ alignSelf: "center" }}>
                        {done ? (a.finalStatus === "selected" ? "Selected" : "Not selected") : "In progress"}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="sd-muted">Has not applied to any drive yet.</p>
              )}
            </Section>
          </div>
        )}
      </aside>
    </>
  );
};

export default StudentDetailPanel;
