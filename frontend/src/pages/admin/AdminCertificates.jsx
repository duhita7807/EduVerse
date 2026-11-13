import React, { useEffect, useState, useCallback } from "react";
import { Search, CheckCircle2, XCircle, FileText } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import Modal from "../../components/Modal.jsx";
import VerificationBadge from "../../components/VerificationBadge.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import adminApi from "../../services/adminApi.js";
import { getErrorMessage } from "../../utils/apiError.js";
import { assetUrl } from "../../utils/assetUrl.js";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
  { key: "", label: "All" },
];

const AdminCertificates = () => {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null); // doc being rejected (needs a note)
  const [rejectNote, setRejectNote] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listCertificates({ status: tab, search });
      setDocs(res.data.documents);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  const verify = async (doc) => {
    setBusyId(doc.certId);
    try {
      await adminApi.reviewCertificate(doc.studentId, doc.certId, "verified", "");
      toast.success("Certificate verified.");
      setDocs((prev) => prev.filter((d) => d.certId !== doc.certId || tab === ""));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectNote.trim()) {
      toast.warning("Please give a short reason for rejecting this certificate.");
      return;
    }
    const doc = rejectTarget;
    setBusyId(doc.certId);
    setRejectTarget(null);
    try {
      await adminApi.reviewCertificate(doc.studentId, doc.certId, "rejected", rejectNote.trim());
      toast.success("Certificate rejected.");
      setRejectNote("");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Certificate review" subtitle="Verify or reject certificate documents students have uploaded." />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {TABS.map((t) => (
          <button
            key={t.key || "all"}
            className={`btn ${tab === t.key ? "brass" : "secondary"}`}
            style={{ fontSize: 12.5, padding: "7px 14px" }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <div style={{ position: "relative", flex: "1 1 200px", marginLeft: "auto" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--slate)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or title…" style={{ width: "100%", paddingLeft: 30 }} />
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--slate)" }}>Loading…</p>
      ) : docs.length === 0 ? (
        <EmptyState title="Nothing here" description="No certificate documents match this filter." />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {docs.map((d) => (
            <div key={d.certId} className="card" style={{ padding: 16, display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap", opacity: busyId === d.certId ? 0.5 : 1 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface-alt)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={17} style={{ color: "var(--accent-indigo)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600 }}>{d.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--slate)" }}>{d.issuedBy}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{d.studentName} · {d.studentEmail}</div>
                <a href={assetUrl(d.file.url)} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-indigo)" }}>
                  View document ↗
                </a>
                {d.status === "rejected" && d.note && (
                  <div style={{ fontSize: 12, color: "var(--danger, #d64545)", marginTop: 4 }}>Reason: {d.note}</div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                <VerificationBadge status={d.status} note={d.note} />
                {d.status !== "verified" && (
                  <button className="btn secondary" style={{ fontSize: 12, padding: "6px 10px" }} disabled={busyId === d.certId} onClick={() => verify(d)}>
                    <CheckCircle2 size={13} /> Verify
                  </button>
                )}
                {d.status !== "rejected" && (
                  <button
                    className="btn secondary"
                    style={{ fontSize: 12, padding: "6px 10px", color: "var(--danger, #d64545)" }}
                    disabled={busyId === d.certId}
                    onClick={() => { setRejectTarget(d); setRejectNote(""); }}
                  >
                    <XCircle size={13} /> Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)}>
        <h3 style={{ fontSize: 17, marginBottom: 10 }}>Reject "{rejectTarget?.title}"?</h3>
        <p style={{ fontSize: 13.5, color: "var(--slate)", marginBottom: 10 }}>
          Give the student a short reason — they'll see this on their profile.
        </p>
        <textarea
          rows={3}
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          placeholder="e.g. The uploaded file doesn't match the certificate title."
          style={{ width: "100%" }}
          maxLength={300}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button className="btn secondary" onClick={() => setRejectTarget(null)}>Cancel</button>
          <button className="btn danger-outline" onClick={submitReject}>Reject certificate</button>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default AdminCertificates;
