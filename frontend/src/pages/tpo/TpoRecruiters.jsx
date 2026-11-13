import React, { useEffect, useState } from "react";
import { Mail, CheckCircle2, XCircle } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { tpoApi } from "../../services/placementApi.js";
import { getErrorMessage } from "../../utils/apiError.js";
import { fmtDate } from "../../utils/format.js";

const STATUS_COLOR = { pending: "var(--warning, #b8860b)", approved: "var(--success, #1f9d55)", rejected: "var(--danger, #d64545)" };

/** TPO/admin view of every recruiter account, with approve / reject. */
const TpoRecruiters = () => {
  const toast = useToast();
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    tpoApi
      .listRecruiters()
      .then((res) => setRecruiters(res.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (r, status) => {
    setBusyId(r._id);
    try {
      await tpoApi.setRecruiterStatus(r._id, status);
      setRecruiters((prev) => prev.map((x) => (x._id === r._id ? { ...x, recruiterStatus: status } : x)));
      toast.success(`${r.name} ${status}.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Recruiters" subtitle="Review recruiter accounts. Only approved recruiters can post drives." />

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--slate)" }}>Loading recruiters…</p>
      ) : recruiters.length === 0 ? (
        <EmptyState title="No recruiters yet" description="Recruiter sign-ups will appear here." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  {["Recruiter", "Organization", "Registered", "Last login", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 12.5, fontWeight: 500, color: "var(--muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recruiters.map((r) => (
                  <tr key={r._id} style={{ borderBottom: "1px solid var(--line)", opacity: busyId === r._id ? 0.5 : 1 }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: "var(--slate)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Mail size={11} /> {r.email}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>{r.organization || "—"}</td>
                    <td style={{ padding: "12px 14px" }}>{fmtDate(r.createdAt)}</td>
                    <td style={{ padding: "12px 14px" }}>{fmtDate(r.lastLoginAt)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, textTransform: "capitalize", color: STATUS_COLOR[r.recruiterStatus] }}>
                        {r.recruiterStatus}
                      </span>
                      {r.isActive === false && <div style={{ fontSize: 11, color: "var(--muted)" }}>Deactivated</div>}
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <button
                        className="btn secondary"
                        style={{ fontSize: 12, padding: "6px 10px", marginRight: 6 }}
                        disabled={busyId === r._id || r.recruiterStatus === "approved"}
                        onClick={() => setStatus(r, "approved")}
                        title="Approve"
                      >
                        <CheckCircle2 size={13} /> Approve
                      </button>
                      <button
                        className="btn secondary"
                        style={{ fontSize: 12, padding: "6px 10px", color: "var(--danger, #d64545)" }}
                        disabled={busyId === r._id || r.recruiterStatus === "rejected"}
                        onClick={() => setStatus(r, "rejected")}
                        title="Reject"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TpoRecruiters;
