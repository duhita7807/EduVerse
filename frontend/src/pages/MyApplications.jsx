import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, PartyPopper } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { studentPlacementApi } from "../services/placementApi.js";
import { getErrorMessage } from "../utils/apiError.js";
import { fmtDate } from "../utils/format.js";

const BADGE = { applied: "neutral", under_review: "warning", selected: "success", not_selected: "danger" };

const MyApplications = () => {
  const toast = useToast();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentPlacementApi
      .listApplications()
      .then((r) => setApps(r.data.applications))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="My applications" subtitle="Where each application stands, and your final results once the TPO publishes them." />

      {loading ? (
        <p style={{ color: "var(--slate)" }}>Loading…</p>
      ) : apps.length === 0 ? (
        <EmptyState icon={ClipboardList} title="You haven't applied anywhere yet" description="Browse drives you're eligible for and apply." actionLabel="View drives" actionTo="/drives" />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {apps.map((a) => (
            <div key={a._id} className={`card ${a.progress.key === "selected" ? "ai-glow" : ""}`}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{a.drive.company.name}</div>
                  <div style={{ fontSize: 13.5, color: "var(--slate)" }}>{a.drive.title}</div>
                </div>
                <span className={`badge ${BADGE[a.progress.key]}`}>{a.progress.label}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>
                Applied {fmtDate(a.appliedAt)}{a.finalizedAt ? ` · Result published ${fmtDate(a.finalizedAt)}` : ""}
              </div>
              {a.progress.key === "selected" && (
                <div className="alert success" style={{ marginTop: 12, marginBottom: 0, display: "flex", gap: 8, alignItems: "center" }}>
                  <PartyPopper size={16} /> Congratulations — you've been selected by {a.drive.company.name}{a.drive.ctc ? ` (${a.drive.ctc})` : ""}. The placement cell will share the next steps.
                </div>
              )}
              {a.progress.key === "not_selected" && (
                <p style={{ fontSize: 13, color: "var(--slate)", margin: "10px 0 0" }}>You weren't selected this time. <Link to="/drives" style={{ color: "var(--accent-indigo)", fontWeight: 600 }}>Other drives are open</Link>.</p>
              )}
              {a.progress.key === "under_review" && (
                <p style={{ fontSize: 13, color: "var(--slate)", margin: "10px 0 0" }}>The recruiter has finished evaluating. The TPO is confirming the final selection.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default MyApplications;
