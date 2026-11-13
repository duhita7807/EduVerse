import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import DriveStatusBadge, { DRIVE_STATUS } from "../../components/DriveStatusBadge.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { tpoApi } from "../../services/placementApi.js";
import { getErrorMessage } from "../../utils/apiError.js";
import { fmtDate, eligibilitySummary } from "../../utils/format.js";

const TpoDrives = () => {
  const toast = useToast();
  const [drives, setDrives] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    tpoApi
      .listDrives(status ? { status } : {})
      .then((r) => setDrives(r.data.drives))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <DashboardLayout>
      <PageHeader title="Drives" subtitle="All recruiter drives across the pipeline." />
      <div style={{ marginBottom: 16 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="">All statuses</option>
          {Object.entries(DRIVE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: "var(--slate)" }}>Loading…</p>
      ) : drives.length === 0 ? (
        <EmptyState icon={Briefcase} title="No drives found" description="Drives posted by recruiters will appear here." />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {drives.map((d) => (
            <Link key={d._id} to={`/tpo/drives/${d._id}`} className="card hoverable" style={{ display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{d.company.name}</div>
                  <div style={{ fontSize: 13.5, color: "var(--slate)" }}>{d.title} · posted by {d.recruiter?.name}</div>
                </div>
                <DriveStatusBadge status={d.status} />
              </div>
              <div style={{ fontSize: 12.5, color: "var(--slate)", marginTop: 10 }}>{eligibilitySummary(d.eligibility)}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>Deadline {fmtDate(d.applicationDeadline)} · {d.applicantCount} applicants</div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default TpoDrives;
