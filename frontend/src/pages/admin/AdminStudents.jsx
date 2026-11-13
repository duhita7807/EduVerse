import React, { useEffect, useState, useCallback } from "react";
import { Search, Ban, CheckCircle2, Trash2, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import adminApi from "../../services/adminApi.js";
import { getErrorMessage } from "../../utils/apiError.js";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const AdminStudents = () => {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState(null); // { student, action: "delete" }
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listStudents({ search, year, status, page, limit: 10 });
      setStudents(res.data.students);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, year, status, page]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0); // debounce free-text search only
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, year, status, page]);

  const toggleStatus = async (student) => {
    setBusyId(student._id);
    try {
      await adminApi.setStudentStatus(student._id, !student.isActive);
      toast.success(student.isActive ? "Student deactivated." : "Student activated.");
      setStudents((prev) => prev.map((s) => (s._id === student._id ? { ...s, isActive: !s.isActive } : s)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    const student = confirmTarget.student;
    setConfirmTarget(null);
    setBusyId(student._id);
    try {
      await adminApi.deleteStudent(student._id);
      toast.success("Student deleted.");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Students" subtitle={`${pagination.total} registered student${pagination.total === 1 ? "" : "s"}`} />

      <div className="card" style={{ padding: 16, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--slate)" }} />
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search name, email, roll no, college…"
            style={{ width: "100%", paddingLeft: 32 }}
          />
        </div>
        <select value={year} onChange={(e) => { setPage(1); setYear(e.target.value); }} style={{ minWidth: 120 }}>
          <option value="">All years</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} style={{ minWidth: 120 }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--slate)" }}>Loading students…</p>
      ) : students.length === 0 ? (
        <EmptyState title="No students found" description="Try a different search or filter." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  {["Student", "Year / Branch", "Profile", "Pending docs", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 12.5, fontWeight: 500, color: "var(--muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id} style={{ borderBottom: "1px solid var(--line)", opacity: busyId === s._id ? 0.5 : 1 }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "var(--slate)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Mail size={11} /> {s.email}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>{s.year}<br /><span style={{ color: "var(--slate)", fontSize: 12 }}>{s.branch}</span></td>
                    <td style={{ padding: "12px 14px" }}>{s.profileCompletion}%</td>
                    <td style={{ padding: "12px 14px" }}>
                      {s.pendingDocuments > 0 ? (
                        <span style={{ color: "var(--warning, #b8860b)", fontWeight: 600 }}>{s.pendingDocuments}</span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: s.isActive ? "var(--success, #1f9d55)" : "var(--danger, #d64545)" }}>
                        {s.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <button
                        className="btn secondary"
                        style={{ fontSize: 12, padding: "6px 10px", marginRight: 6 }}
                        disabled={busyId === s._id}
                        onClick={() => toggleStatus(s)}
                        title={s.isActive ? "Deactivate account" : "Activate account"}
                      >
                        {s.isActive ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                      </button>
                      <button
                        className="btn secondary"
                        style={{ fontSize: 12, padding: "6px 10px", color: "var(--danger, #d64545)" }}
                        disabled={busyId === s._id}
                        onClick={() => setConfirmTarget({ student: s, action: "delete" })}
                        title="Delete student"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, padding: 14, borderTop: "1px solid var(--line)" }}>
              <button className="btn secondary" style={{ padding: "6px 10px" }} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 12.5, color: "var(--slate)" }}>Page {pagination.page} of {pagination.pages}</span>
              <button className="btn secondary" style={{ padding: "6px 10px" }} disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title="Delete this student?"
        description={confirmTarget ? `This permanently deletes ${confirmTarget.student.name}'s account, profile, and uploaded documents. This can't be undone.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </DashboardLayout>
  );
};

export default AdminStudents;
