import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, UserCheck, FileCheck2, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import ProgressBar from "../../components/ProgressBar.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import adminApi from "../../services/adminApi.js";
import { getErrorMessage } from "../../utils/apiError.js";

const StatCard = ({ icon: Icon, label, value, sub, accent = "var(--accent-indigo)" }) => (
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

const MiniBarChart = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90 }}>
      {data.map((d, i) => (
        <div key={i} title={`${d.label}: ${d.count}`} style={{ flex: 1, height: Math.max(4, (d.count / max) * 80), borderRadius: 4, background: "var(--gradient-accent)" }} />
      ))}
    </div>
  );
};

const AdminOverview = () => {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getStats();
        setData(res.data);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !data) {
    return (
      <DashboardLayout>
        <PageHeader title="Admin overview" subtitle={loading ? "Loading platform stats…" : "Couldn't load platform stats."} />
      </DashboardLayout>
    );
  }

  const { totals, averages, documents, byYear, byBranch, topSkills, signupsByDay, recentStudents } = data;

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow={<><Sparkles size={12} /> Admin</>}
        title="Platform overview"
        subtitle="Live numbers across every student on EduVerse."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon={Users} label="Total students" value={totals.students} sub={`${totals.active} active · ${totals.inactive} deactivated`} />
        <StatCard icon={UserCheck} label="New this week" value={totals.newThisWeek} sub={`${totals.newThisMonth} in the last 30 days`} accent="var(--accent-teal, #0d9488)" />
        <StatCard icon={FileCheck2} label="Certificates pending" value={documents.pending} sub={`${documents.verified} verified · ${documents.rejected} rejected`} accent="var(--warning, #b8860b)" />
        <StatCard icon={TrendingUp} label="Avg. profile completion" value={`${averages.profileCompletion}%`} sub={`${totals.projects} projects · ${totals.internships} internships`} accent="var(--accent-cyan)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }} className="admin-grid-2col">
        <SectionCard title="Sign-ups, last 14 days" index="01">
          <MiniBarChart data={signupsByDay} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10.5, color: "var(--muted)" }}>
            <span>{signupsByDay[0]?.label}</span>
            <span>{signupsByDay[signupsByDay.length - 1]?.label}</span>
          </div>
        </SectionCard>

        <SectionCard title="Top skills across students" index="02">
          {topSkills.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--slate)" }}>No skills added yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {topSkills.slice(0, 6).map((s) => (
                <ProgressBar key={s.label} value={(s.count / (topSkills[0].count || 1)) * 100} label={`${s.label} (${s.count})`} height={6} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="By year & branch" index="03">
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--slate)", marginBottom: 6 }}>Year</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {byYear.map((y) => (
            <span key={y.label} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 100, background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
              {y.label}: <strong>{y.count}</strong>
            </span>
          ))}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--slate)", marginBottom: 6 }}>Top branches</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {byBranch.map((b) => (
            <span key={b.label} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 100, background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
              {b.label}: <strong>{b.count}</strong>
            </span>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Recently joined"
        index="04"
        action={<Link to="/admin/students" className="btn secondary" style={{ fontSize: 12.5 }}>View all students <ArrowRight size={13} /></Link>}
      >
        {recentStudents.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--slate)" }}>No students yet.</p>
        ) : (
          recentStudents.map((s) => (
            <div key={s._id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "var(--slate)" }}>{s.email} · {s.branch} · {s.year}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(s.createdAt).toLocaleDateString()}</div>
            </div>
          ))
        )}
      </SectionCard>
    </DashboardLayout>
  );
};

export default AdminOverview;
