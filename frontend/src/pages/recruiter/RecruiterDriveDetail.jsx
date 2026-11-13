import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2, Send, ChevronDown, ChevronUp, Save } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import DriveStatusBadge from "../../components/DriveStatusBadge.jsx";
import DriveSummary from "../../components/DriveSummary.jsx";
import PlacementFlow from "../../components/PlacementFlow.jsx";
import DriveShortlist from "../../components/DriveShortlist.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { recruiterApi } from "../../services/placementApi.js";
import { getErrorMessage } from "../../utils/apiError.js";

const DECISION_LABEL = { pending: "Undecided", recommended: "Recommended", not_recommended: "Not recommended" };
const FINAL_BADGE = { pending: ["neutral", "Awaiting TPO"], selected: ["success", "Selected"], not_selected: ["danger", "Not selected"] };

/** One applicant: profile snapshot + per-round results + overall decision. */
const ApplicantRow = ({ driveId, drive, application, editable, onSaved }) => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const s = application.student;

  const initial = drive.rounds.map((r) => {
    const found = (application.roundResults || []).find((x) => String(x.roundId) === String(r._id));
    return { roundId: r._id, status: found?.status || "pending", score: found?.score ?? "", remarks: found?.remarks || "" };
  });
  const [results, setResults] = useState(initial);
  const [decision, setDecision] = useState(application.recruiterDecision);
  const [remarks, setRemarks] = useState(application.recruiterRemarks || "");

  const setRound = (i, key, value) => setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const save = async () => {
    setSaving(true);
    try {
      await recruiterApi.evaluate(driveId, application._id, { roundResults: results, recruiterDecision: decision, recruiterRemarks: remarks });
      toast.success(`Saved evaluation for ${s.name}.`);
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const skills = [...(s.skills?.programmingLanguages || []), ...(s.skills?.webTechnologies || []), ...(s.skills?.databases || []), ...(s.skills?.tools || [])];
  const [finalCls, finalLabel] = FINAL_BADGE[application.finalStatus] || FINAL_BADGE.pending;

  return (
    <div style={{ borderBottom: "1px solid var(--line)", padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, cursor: "pointer", flexWrap: "wrap" }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--slate)" }}>
            {s.branch} · {s.year} · CGPA {s.cgpa ?? "—"} · {s.rollNo}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`badge ${application.recruiterDecision === "recommended" ? "success" : application.recruiterDecision === "not_recommended" ? "danger" : "neutral"}`}>{DECISION_LABEL[application.recruiterDecision]}</span>
          {drive.status === "finalized" && <span className={`badge ${finalCls}`}>{finalLabel}</span>}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingLeft: 4 }}>
          <div style={{ fontSize: 12.5, color: "var(--slate)", marginBottom: 10 }}>
            {s.email}
            {s.githubUsername && ` · github.com/${s.githubUsername}`}
            {s.linkedinProfile && <> · <a href={s.linkedinProfile} target="_blank" rel="noreferrer" style={{ color: "var(--accent-indigo)" }}>LinkedIn</a></>}
            <br />
            {skills.length > 0 ? `Skills: ${skills.slice(0, 12).join(", ")}` : "No skills listed"} · {s.projects?.length || 0} projects · {s.internships?.length || 0} internships
          </div>

          {drive.rounds.length === 0 && <p style={{ fontSize: 13, color: "var(--slate)" }}>No rounds defined for this drive.</p>}
          {drive.rounds.map((r, i) => (
            <div key={r._id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.7fr 1.6fr", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13 }}>{r.name}</span>
              <select disabled={!editable} value={results[i].status} onChange={(e) => setRound(i, "status", e.target.value)}>
                <option value="pending">Pending</option><option value="cleared">Cleared</option><option value="rejected">Rejected</option>
              </select>
              <input disabled={!editable} type="number" min="0" placeholder="Score" value={results[i].score} onChange={(e) => setRound(i, "score", e.target.value)} />
              <input disabled={!editable} placeholder="Remarks" maxLength={300} value={results[i].remarks} onChange={(e) => setRound(i, "remarks", e.target.value)} />
            </div>
          ))}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, alignItems: "center", marginTop: 10 }}>
            <select disabled={!editable} value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="pending">Undecided</option><option value="recommended">Recommend</option><option value="not_recommended">Don't recommend</option>
            </select>
            <input disabled={!editable} placeholder="Overall remarks for the TPO" maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            {editable && <button className="btn secondary" onClick={save} disabled={saving}><Save size={14} />{saving ? "Saving…" : "Save"}</button>}
          </div>
        </div>
      )}
    </div>
  );
};

const RecruiterDriveDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null); // "delete" | "submit"
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await recruiterApi.getDrive(id);
      setData(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardLayout><PageHeader title="Loading drive…" /></DashboardLayout>;
  if (!data) return <DashboardLayout><EmptyState title="Drive not found" actionLabel="Back to my drives" actionTo="/recruiter/drives" /></DashboardLayout>;

  const { drive, applications } = data;
  const editable = drive.status === "approved";
  const decided = applications.filter((a) => a.recruiterDecision !== "pending").length;

  const runConfirmed = async () => {
    setBusy(true);
    try {
      if (confirm === "delete") {
        await recruiterApi.deleteDrive(id);
        toast.success("Drive deleted.");
        navigate("/recruiter/drives");
        return;
      }
      const res = await recruiterApi.submitResults(id);
      toast.success(res.message);
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow={<DriveStatusBadge status={drive.status} />}
        title={`${drive.company.name} — ${drive.title}`}
        actions={
          ["pending", "rejected"].includes(drive.status) && (
            <>
              <Link to={`/recruiter/drives/${id}/edit`} className="btn secondary"><Pencil size={14} />Edit</Link>
              <button className="btn danger-outline" onClick={() => setConfirm("delete")}><Trash2 size={14} />Delete</button>
            </>
          )
        }
      />

      <div style={{ marginBottom: 20 }}><PlacementFlow status={drive.status} /></div>

      {drive.status === "rejected" && (
        <div className="alert error"><strong>The TPO requested changes:</strong> {drive.tpoReview?.note}. Edit the drive and save to resubmit it.</div>
      )}
      {drive.status === "pending" && <div className="alert info">Waiting for the TPO to verify this drive. Students can't see it until it's approved.</div>}
      {drive.status === "results_submitted" && <div className="alert info">Your results are with the TPO, who will finalize the selected students.</div>}
      {drive.status === "finalized" && <div className="alert success">The TPO has finalized this drive and students have been notified of their results.</div>}

      <SectionCard title="Drive details" index="01"><DriveSummary drive={drive} /></SectionCard>
      {drive.shortlistSentAt && <DriveShortlist drive={drive} />}

      {drive.status !== "pending" && drive.status !== "rejected" && (
        <SectionCard
          title={`Applicants (${applications.length})`}
          index="02"
          action={
            editable && (
              <button className="btn brass" disabled={applications.length === 0} onClick={() => setConfirm("submit")}>
                <Send size={14} />Submit results to TPO
              </button>
            )
          }
        >
          {editable && applications.length > 0 && (
            <p style={{ fontSize: 12.5, color: "var(--slate)", marginTop: 0 }}>
              {decided}/{applications.length} decided. Record each round's outcome and mark every applicant recommended or not before submitting.
            </p>
          )}
          {applications.length === 0 ? (
            <EmptyState title="No applicants yet" description="Eligible students can apply until the deadline." />
          ) : (
            applications.map((a) => (
              <ApplicantRow key={a._id} driveId={id} drive={drive} application={a} editable={editable} onSaved={load} />
            ))
          )}
        </SectionCard>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        danger={confirm === "delete"}
        title={confirm === "delete" ? "Delete this drive?" : "Submit results to the TPO?"}
        description={confirm === "delete" ? "This can't be undone." : "After submitting you can no longer change evaluations. The TPO will confirm the final selection."}
        confirmLabel={confirm === "delete" ? "Delete" : "Submit results"}
        loading={busy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </DashboardLayout>
  );
};

export default RecruiterDriveDetail;
