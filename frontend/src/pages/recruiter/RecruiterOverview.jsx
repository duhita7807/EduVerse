import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, Trophy, Clock, PlusCircle, ArrowRight, Sparkles } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import PipelineViz from "../../components/PipelineViz.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import DriveStatusBadge from "../../components/DriveStatusBadge.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { recruiterApi } from "../../services/placementApi.js";
import { getErrorMessage } from "../../utils/apiError.js";
import { fmtDate } from "../../utils/format.js";

const RecruiterOverview = () => {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, d] = await Promise.all([recruiterApi.stats(), recruiterApi.listDrives()]);
        setStats(s.data);
        setDrives(d.data.drives);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actionNeeded = drives.filter((d) => d.status === "rejected" || (d.status === "approved" && d.applicantCount > 0));

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow={<><Sparkles size={12} /> Recruiter</>}
        title="Recruitment overview"
        subtitle="Post drives, evaluate applicants and send results to the placement cell."
        actions={<Link to="/recruiter/drives/new" className="btn brass"><PlusCircle size={15} />Post a drive</Link>}
      />

      {loading || !stats ? (
        <p style={{ color: "var(--slate)" }}>Loading…</p>
      ) : (
        <>
          <section className="card pipe-card">
            <div className="card-head"><h3>Your pipeline</h3><span className="muted-p">{stats.totals.drives} drives · {stats.totals.applicants} applicants · {stats.totals.selected} selected</span></div>
            <PipelineViz
              stages={[
                { label: "With the TPO", count: stats.byStatus.pending, note: stats.byStatus.rejected ? `${stats.byStatus.rejected} need changes` : "awaiting verification", attention: stats.byStatus.rejected > 0 },
                { label: "Open to students", count: stats.byStatus.approved, note: "collecting applicants", attention: drives.some((d) => d.status === "approved" && d.applicantCount > 0) },
                { label: "Results with TPO", count: stats.byStatus.results_submitted, note: "awaiting final call" },
                { label: "Finalized", count: stats.byStatus.finalized, note: `${stats.totals.selected} students selected` },
              ]}
            />
          </section>

          <SectionCard title="Needs your attention" index="01">
            {actionNeeded.length === 0 ? (
              <p style={{ fontSize: 13.5, color: "var(--slate)", margin: 0 }}>Nothing waiting on you right now.</p>
            ) : (
              actionNeeded.map((d) => (
                <Link key={d._id} to={`/recruiter/drives/${d._id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{d.company.name} — {d.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--slate)" }}>
                      {d.status === "rejected" ? `TPO note: ${d.tpoReview?.note || "changes requested"}` : `${d.applicantCount} applicant${d.applicantCount === 1 ? "" : "s"} to evaluate`}
                    </div>
                  </div>
                  <DriveStatusBadge status={d.status} />
                </Link>
              ))
            )}
          </SectionCard>

          <SectionCard
            title="Recent drives"
            index="02"
            action={<Link to="/recruiter/drives" className="btn secondary" style={{ fontSize: 12.5 }}>All drives <ArrowRight size={13} /></Link>}
          >
            {drives.length === 0 ? (
              <EmptyState icon={Building2} title="No drives yet" description="Post your first drive — it goes to the TPO for verification." actionLabel="Post a drive" actionTo="/recruiter/drives/new" />
            ) : (
              drives.slice(0, 5).map((d) => (
                <div key={d._id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <Link to={`/recruiter/drives/${d._id}`} style={{ fontWeight: 600, fontSize: 13.5 }}>{d.company.name} — {d.title}</Link>
                    <div style={{ fontSize: 12, color: "var(--slate)" }}>Deadline {fmtDate(d.applicationDeadline)} · {d.applicantCount} applicants</div>
                  </div>
                  <DriveStatusBadge status={d.status} />
                </div>
              ))
            )}
          </SectionCard>
        </>
      )}
    </DashboardLayout>
  );
};

export default RecruiterOverview;
