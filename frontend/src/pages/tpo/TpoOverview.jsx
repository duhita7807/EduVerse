import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, BadgeCheck, Users, Trophy, ArrowRight, Sparkles, GraduationCap } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import PipelineViz from "../../components/PipelineViz.jsx";
import DriveStatusBadge from "../../components/DriveStatusBadge.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { tpoApi } from "../../services/placementApi.js";
import { getErrorMessage } from "../../utils/apiError.js";
import { fmtDate } from "../../utils/format.js";

const QueueList = ({ title, index, drives, empty, verb }) => (
  <SectionCard title={title} index={index}>
    {drives.length === 0 ? (
      <p style={{ fontSize: 13.5, color: "var(--slate)", margin: 0 }}>{empty}</p>
    ) : (
      drives.map((d) => (
        <Link key={d._id} to={`/tpo/drives/${d._id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{d.company.name} — {d.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--slate)" }}>
              {d.recruiter?.name} · {d.applicantCount} applicant{d.applicantCount === 1 ? "" : "s"} · deadline {fmtDate(d.applicationDeadline)}
            </div>
          </div>
          <span className="btn secondary" style={{ fontSize: 12.5 }}>{verb} <ArrowRight size={13} /></span>
        </Link>
      ))
    )}
  </SectionCard>
);

const TpoOverview = () => {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([tpoApi.stats(), tpoApi.listDrives()])
      .then(([s, d]) => { setStats(s.data); setDrives(d.data.drives); })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardLayout>
      <PageHeader eyebrow={<><Sparkles size={12} /> Training & Placement</>} title="Placement overview" subtitle="Verify incoming drives and finalize who gets selected." actions={<Link to="/tpo/students" className="btn secondary"><GraduationCap size={15} />Browse students</Link>} />

      {loading || !stats ? (
        <p style={{ color: "var(--slate)" }}>Loading…</p>
      ) : (
        <>
          <section className="card pipe-card">
            <div className="card-head"><h3>Drive pipeline</h3><span className="muted-p">{stats.totals.drives} drives · {stats.totals.applications} applications</span></div>
            <PipelineViz
              stages={[
                { label: "Awaiting verification", count: stats.byStatus.pending, attention: stats.byStatus.pending > 0, note: stats.byStatus.rejected ? `${stats.byStatus.rejected} sent back` : undefined },
                { label: "Open to students", count: stats.byStatus.approved, note: "applications running" },
                { label: "Results to finalize", count: stats.byStatus.results_submitted, attention: stats.byStatus.results_submitted > 0 },
                { label: "Finalized", count: stats.byStatus.finalized, note: `${stats.totals.selected} students selected` },
              ]}
            />
          </section>

          <QueueList title="Awaiting verification" index="01" drives={drives.filter((d) => d.status === "pending")} empty="No drives waiting for verification." verb="Review" />
          <QueueList title="Results awaiting finalization" index="02" drives={drives.filter((d) => d.status === "results_submitted")} empty="No results waiting for you." verb="Finalize" />

          <SectionCard title="Open drives" index="03" action={<Link to="/tpo/drives" className="btn secondary" style={{ fontSize: 12.5 }}>All drives <ArrowRight size={13} /></Link>}>
            {drives.filter((d) => d.status === "approved").length === 0 ? (
              <p style={{ fontSize: 13.5, color: "var(--slate)", margin: 0 }}>No approved drives are currently open.</p>
            ) : (
              drives.filter((d) => d.status === "approved").slice(0, 5).map((d) => (
                <div key={d._id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", gap: 10 }}>
                  <Link to={`/tpo/drives/${d._id}`} style={{ fontWeight: 600, fontSize: 13.5 }}>{d.company.name} — {d.title}</Link>
                  <span style={{ fontSize: 12.5, color: "var(--slate)" }}>{d.applicantCount} applied</span>
                </div>
              ))
            )}
          </SectionCard>
        </>
      )}
    </DashboardLayout>
  );
};

export default TpoOverview;
