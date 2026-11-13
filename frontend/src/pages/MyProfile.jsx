import React from "react";
import { Link } from "react-router-dom";
import { SquarePen } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import SectionCard from "../components/SectionCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import CertificateItem from "../components/CertificateItem.jsx";
import { assetUrl } from "../utils/assetUrl.js";
import { useAuth } from "../context/AuthContext.jsx";

const Pill = ({ children }) => (
  <span
    style={{
      display: "inline-block",
      padding: "4px 10px",
      border: "1px solid var(--line)",
      borderRadius: 100,
      fontSize: 12,
      marginRight: 6,
      marginBottom: 6,
      color: "var(--slate)",
      background: "var(--surface-alt)",
    }}
  >
    {children}
  </span>
);

const MyProfile = () => {
  const { student } = useAuth();

  const skillGroups = [
    ["Programming Languages", student?.skills?.programmingLanguages],
    ["Web Technologies", student?.skills?.webTechnologies],
    ["Databases", student?.skills?.databases],
    ["Tools", student?.skills?.tools],
  ];

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div
            className="avatar-gradient"
            style={{
              width: 72,
              height: 72,
              fontSize: 26,
            }}
          >
            {student?.profilePhoto ? (
              <img src={assetUrl(student.profilePhoto)} alt={student.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              student?.name?.charAt(0)
            )}
          </div>
          <div>
            <h1 style={{ fontSize: 26 }}>{student?.name}</h1>
            <p style={{ color: "var(--slate)", fontSize: 14 }}>{student?.college}</p>
            <p style={{ color: "var(--slate)", fontSize: 13 }}>{student?.branch} · {student?.year} · Roll No. {student?.rollNo}</p>
          </div>
        </div>
        <Link to="/edit-profile" className="btn secondary"><SquarePen size={15} />Edit profile</Link>
      </div>

      {student?.bio && (
        <SectionCard title="About">
          <p style={{ color: "var(--text)" }}>{student.bio}</p>
        </SectionCard>
      )}

      <SectionCard title="Education" index="01">
        {student?.education?.length ? (
          student.education.map((edu, i) => (
            <div key={i} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < student.education.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ fontWeight: 600 }}>{edu.degree} — {edu.institution}</div>
              <div style={{ fontSize: 13, color: "var(--slate)" }}>
                {edu.branch} · {edu.startYear}–{edu.endYear} {edu.cgpa ? `· CGPA ${edu.cgpa}` : ""}
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="No education records yet" description="Add your degree and institution to complete this section." actionLabel="Add Education" actionTo="/edit-profile" />
        )}
      </SectionCard>

      <SectionCard title="Technical Skills" index="02">
        {skillGroups.every(([, arr]) => !arr?.length) ? (
          <EmptyState title="No skills added yet" description="List your programming languages, frameworks and tools." actionLabel="Add Skills" actionTo="/edit-profile" />
        ) : (
          skillGroups.map(([label, arr]) =>
            arr?.length ? (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate)", marginBottom: 6 }}>{label}</div>
                {arr.map((s) => <Pill key={s}>{s}</Pill>)}
              </div>
            ) : null
          )
        )}
      </SectionCard>

      <SectionCard title="Projects" index="03">
        {student?.projects?.length ? (
          student.projects.map((p, i) => (
            <div key={i} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: i < student.projects.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ fontWeight: 600 }}>{p.title}</div>
              <p style={{ fontSize: 13, color: "var(--slate)", margin: "4px 0 8px" }}>{p.description}</p>
              {p.technologies?.map((t) => <Pill key={t}>{t}</Pill>)}
              {p.githubRepo && (
                <div>
                  <a href={p.githubRepo} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--accent-indigo)", fontWeight: 600 }}>
                    View repository ↗
                  </a>
                </div>
              )}
            </div>
          ))
        ) : (
          <EmptyState title="No projects added yet" description="Showcase what you've built to strengthen your profile." actionLabel="Add Project" actionTo="/edit-profile" />
        )}
      </SectionCard>

      <SectionCard title="Internships" index="04">
        {student?.internships?.length ? (
          student.internships.map((it, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600 }}>{it.role} — {it.company}</div>
              <p style={{ fontSize: 13, color: "var(--slate)" }}>{it.description}</p>
            </div>
          ))
        ) : (
          <EmptyState title="No internships added yet" description="Internship experience boosts your placement readiness score." actionLabel="Add Internship" actionTo="/edit-profile" />
        )}
      </SectionCard>

      <SectionCard title="Certifications" index="05">
        {student?.certifications?.length ? (
          <div className="cert-grid">
            {student.certifications.map((c, i) => <CertificateItem key={c._id || i} cert={c} />)}
          </div>
        ) : (
          <EmptyState title="No certifications added yet" description="Certifications help demonstrate specialized skills." actionLabel="Add Certification" actionTo="/edit-profile" />
        )}
      </SectionCard>
    </DashboardLayout>
  );
};

export default MyProfile;
