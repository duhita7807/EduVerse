import React, { useEffect, useState } from "react";
import { Download, Send, X } from "lucide-react";
import SectionCard from "./SectionCard.jsx";
import ShortlistGroups from "./ShortlistGroups.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { tpoApi, recruiterApi } from "../services/placementApi.js";
import adminApi from "../services/adminApi.js";
import { getErrorMessage } from "../utils/apiError.js";
import { fmtDateTime } from "../utils/format.js";
import { downloadCsv } from "../utils/csv.js";

/**
 * A drive's auto-shortlist (eligible students at approval), branch-wise.
 * TPO: view + export. Admin: also remove students and send to the recruiter.
 * Recruiter: view + export once the admin has sent it.
 */
const DriveShortlist = ({ drive }) => {
  const toast = useToast();
  const { student } = useAuth();
  const role = student?.role;
  const isAdmin = role === "admin";
  const [data, setData] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () =>
    (role === "recruiter" ? recruiterApi.driveShortlist(drive._id) : tpoApi.driveShortlist(drive._id))
      .then((res) => setData(res.data))
      .catch((err) => (role === "recruiter" ? setData(null) : toast.error(getErrorMessage(err))));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drive._id]);

  if (!data) return null;
  const total = data.groups.reduce((n, g) => n + g.students.length, 0);
  const editable = isAdmin && !data.sentAt;

  const remove = async (s) => {
    try {
      await adminApi.removeFromShortlist(drive._id, s._id);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const send = async () => {
    setBusy(true);
    try {
      const res = await adminApi.sendShortlist(drive._id);
      toast.success(res.message);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      `${drive.company.name}-${drive.title}-shortlist.csv`.replace(/[^\w.-]+/g, "_"),
      data.groups.flatMap((g) =>
        g.students.map((s) => ({
          Name: s.name, Email: s.email, "Roll no.": s.rollNo, Branch: s.branch, Year: s.year,
          College: s.college, CGPA: s.cgpa ?? "", GitHub: s.githubUsername || "", LinkedIn: s.linkedinProfile || "",
        }))
      )
    );

  return (
    <SectionCard
      title={`Auto-shortlist (${total})`}
      action={
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn secondary" disabled={!total} onClick={exportCsv}><Download size={14} />Export CSV</button>
          {editable && <button className="btn brass" disabled={!total} onClick={() => setConfirm(true)}><Send size={14} />Send to recruiter</button>}
        </div>
      }
    >
      <p style={{ fontSize: 13, color: "var(--slate)", marginTop: 0 }}>
        {data.sentAt
          ? `Sent to the recruiter on ${fmtDateTime(data.sentAt)}.`
          : `Students who met the eligibility criteria when the drive was approved${data.shortlistedAt ? ` (${fmtDateTime(data.shortlistedAt)})` : ""}.${isAdmin ? " Remove anyone who shouldn't be shared, then send it to the recruiter." : ""}`}
      </p>
      <ShortlistGroups
        groups={data.groups}
        action={editable ? (s) => <button className="btn secondary" style={{ fontSize: 12, padding: "4px 8px" }} onClick={() => remove(s)} aria-label={`Remove ${s.name}`}><X size={12} />Remove</button> : undefined}
      />
      <ConfirmDialog
        open={confirm}
        danger={false}
        title="Send shortlist to the recruiter?"
        description={`${total} students' contact and profile details will be shared with ${drive.recruiter?.name || "the recruiter"}. The shortlist can't be edited afterwards.`}
        confirmLabel="Send"
        loading={busy}
        onConfirm={send}
        onCancel={() => setConfirm(false)}
      />
    </SectionCard>
  );
};

export default DriveShortlist;
