import React, { useEffect, useState } from "react";
import { Mail, CheckCircle2, XCircle, Eye } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import StudentDetailPanel from "../../components/StudentDetailPanel.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { tpoApi } from "../../services/placementApi.js";
import { getErrorMessage } from "../../utils/apiError.js";
import { fmtDate } from "../../utils/format.js";

const TABS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];
const BADGE = { pending: "warning", approved: "success", rejected: "danger" };

/** TPO/admin: verify new student sign-ups (approve / reject), view full details. */
const StudentApprovals = () => {
  const toast = useToast();
  const [tab, setTab] = useState("pending");
  const [data, setData] = useState({ students: [], counts: {} });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [viewId, setViewId] = useState(null);

  useEffect(() => {
    setLoading(true);
    tpoApi
      .listStudentApprovals(tab)
      .then((res) => setData(res.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const decide = async (s, status) => {
    setBusyId(s._id);
    try {
      await tpoApi.setStudentApproval(s._id, status);
      setData((d) => ({
        students: tab === "all" ? d.students.map((x) => (x._id === s._id ? { ...x, studentStatus: status } : x)) : d.students.filter((x) => x._id !== s._id),
        counts: { ...d.counts, [s.studentStatus]: (d.counts[s.studentStatus] || 1) - 1, [status]: (d.counts[status] || 0) + 1 },
      }));
      toast.success(`${s.name} ${status}.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const ids = data.students.map((s) => s._id);

  return (
    <DashboardLayout>
      <PageHeader title="Student approvals" subtitle="New student accounts stay pending until you approve them. Approved students can complete their profile and use the platform." />

      <div className="pr-levels" role="tablist" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`pr-level ${tab === t.id ? "on" : ""}`} style={{ border: 0 }} onClick={() => setTab(t.id)}>
            {t.label}{t.id !== "all" && data.counts[t.id] != null ? ` (${data.counts[t.id]})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted-p">Loading students…</p>
      ) : data.students.length === 0 ? (
        <EmptyState title={tab === "pending" ? "No sign-ups waiting" : "No students here"} description={tab === "pending" ? "New student registrations will appear here for approval." : "Try another tab."} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="sl-table">
              <thead>
                <tr>{["Student", "Roll no.", "Branch & year", "College", "Registered", "Status", ""].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s._id} style={{ opacity: busyId === s._id ? 0.5 : 1 }}>
                    <td>
                      <div className="sl-name">{s.name}</div>
                      <div className="sl-sub"><Mail size={11} /> {s.email}</div>
                    </td>
                    <td className="tabular">{s.rollNo}</td>
                    <td>{s.branch}<div className="sl-sub">{s.year}</div></td>
                    <td>{s.college}</td>
                    <td className="tabular">{fmtDate(s.createdAt)}</td>
                    <td><span className={`badge ${BADGE[s.studentStatus]}`} style={{ textTransform: "capitalize" }}>{s.studentStatus}</span></td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <button className="btn secondary" style={{ fontSize: 12, padding: "5px 10px", marginRight: 6 }} onClick={() => setViewId(s._id)}>
                        <Eye size={13} />Details
                      </button>
                      <button className="btn secondary" style={{ fontSize: 12, padding: "5px 10px", marginRight: 6 }} disabled={busyId === s._id || s.studentStatus === "approved"} onClick={() => decide(s, "approved")}>
                        <CheckCircle2 size={13} />Approve
                      </button>
                      <button className="btn secondary" style={{ fontSize: 12, padding: "5px 10px", color: "var(--danger)" }} disabled={busyId === s._id || s.studentStatus === "rejected"} onClick={() => decide(s, "rejected")}>
                        <XCircle size={13} />Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewId && <StudentDetailPanel studentId={viewId} ids={ids} onNavigate={setViewId} onClose={() => setViewId(null)} />}
    </DashboardLayout>
  );
};

export default StudentApprovals;
