import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Trophy } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import FormField from "../../components/FormField.jsx";
import DriveStatusBadge from "../../components/DriveStatusBadge.jsx";
import DriveSummary from "../../components/DriveSummary.jsx";
import PlacementFlow from "../../components/PlacementFlow.jsx";
import DriveShortlist from "../../components/DriveShortlist.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { tpoApi } from "../../services/placementApi.js";
import { getErrorMessage } from "../../utils/apiError.js";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

/** Approve (optionally adjusting eligibility) or send back a pending drive. */
const ReviewPanel = ({ drive, eligibleCount, onDone }) => {
  const toast = useToast();
  const [minCgpa, setMinCgpa] = useState(drive.eligibility.minCgpa || "");
  const [branches, setBranches] = useState((drive.eligibility.branches || []).join(", "));
  const [years, setYears] = useState(drive.eligibility.years || []);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (decision) => {
    setBusy(true);
    try {
      const body = { decision, note };
      if (decision === "approve") {
        body.eligibility = {
          minCgpa: minCgpa === "" ? 0 : Number(minCgpa),
          branches: branches.split(",").map((b) => b.trim()).filter(Boolean),
          years,
        };
      }
      const res = await tpoApi.review(drive._id, body);
      toast.success(res.message);
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Verify this drive" index="02" glow>
      <p style={{ fontSize: 13.5, marginTop: 0 }}>
        With the current criteria, <strong>{eligibleCount}</strong> registered student{eligibleCount === 1 ? "" : "s"} can see this drive. You can adjust eligibility before approving.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
        <FormField label="Minimum CGPA" htmlFor="tcg"><input id="tcg" type="number" step="0.1" min="0" max="10" value={minCgpa} onChange={(e) => setMinCgpa(e.target.value)} /></FormField>
        <FormField label="Branches" htmlFor="tbr" helpText="Comma-separated; empty = all"><input id="tbr" value={branches} onChange={(e) => setBranches(e.target.value)} /></FormField>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
        {YEARS.map((y) => (
          <label key={y} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13.5 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={years.includes(y)} onChange={() => setYears(years.includes(y) ? years.filter((v) => v !== y) : [...years, y])} /> {y}
          </label>
        ))}
      </div>
      <FormField label="Note to recruiter" htmlFor="tnote" helpText="Required when sending the drive back">
        <textarea id="tnote" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn danger-outline" disabled={busy} onClick={() => submit("reject")}><XCircle size={15} />Send back</button>
        <button className="btn brass" disabled={busy} onClick={() => submit("approve")}><CheckCircle2 size={15} />Approve drive</button>
      </div>
    </SectionCard>
  );
};

const DECISION = { pending: ["neutral", "Undecided"], recommended: ["success", "Recommended"], not_recommended: ["danger", "Not recommended"] };

const TpoDriveDetail = () => {
  const { id } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await tpoApi.getDrive(id);
      setData(res.data);
      // Pre-fill the selection from the recruiter's recommendation (TPO can change any of it).
      setSelections(Object.fromEntries(res.data.applications.map((a) => [a._id, a.finalStatus !== "pending" ? a.finalStatus : a.recruiterDecision === "recommended" ? "selected" : "not_selected"])));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardLayout><PageHeader title="Loading drive…" /></DashboardLayout>;
  if (!data) return <DashboardLayout><EmptyState title="Drive not found" actionLabel="Back to drives" actionTo="/tpo/drives" /></DashboardLayout>;

  const { drive, eligibleCount, applications } = data;
  const canFinalize = drive.status === "results_submitted";
  const selectedCount = Object.values(selections).filter((v) => v === "selected").length;

  const finalize = async () => {
    setBusy(true);
    try {
      const res = await tpoApi.finalize(id, applications.map((a) => ({ applicationId: a._id, finalStatus: selections[a._id] })));
      toast.success(res.message);
      setConfirm(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow={<DriveStatusBadge status={drive.status} />}
        title={`${drive.company.name} — ${drive.title}`}
        subtitle={`Posted by ${drive.recruiter?.name || "recruiter"} (${drive.recruiter?.email || "—"})`}
      />
      <div style={{ marginBottom: 20 }}><PlacementFlow status={drive.status} /></div>

      {drive.status === "rejected" && <div className="alert warning">Sent back to the recruiter: {drive.tpoReview?.note}</div>}

      <SectionCard title="Drive details" index="01">
        <DriveSummary drive={drive} />
        {drive.company.website && <p style={{ fontSize: 13, marginBottom: 0 }}>Website: <a href={drive.company.website} target="_blank" rel="noreferrer" style={{ color: "var(--accent-indigo)" }}>{drive.company.website}</a></p>}
      </SectionCard>

      {drive.status === "pending" && <ReviewPanel drive={drive} eligibleCount={eligibleCount} onDone={load} />}
      {drive.shortlistedAt && <DriveShortlist drive={drive} />}

      {["approved", "results_submitted", "finalized"].includes(drive.status) && (
        <SectionCard
          title={`${canFinalize ? "Finalize selections" : "Applicants"} (${applications.length})`}
          index="02"
          glow={canFinalize}
          action={canFinalize && <button className="btn brass" onClick={() => setConfirm(true)}><Trophy size={14} />Publish results ({selectedCount} selected)</button>}
        >
          {drive.status === "approved" && <p style={{ fontSize: 13, color: "var(--slate)", marginTop: 0 }}>Applications are open. You can finalize once the recruiter submits results.</p>}
          {canFinalize && <p style={{ fontSize: 13, color: "var(--slate)", marginTop: 0 }}>Pre-filled from the recruiter's recommendations. Adjust anyone, then publish — students see the outcome immediately.</p>}

          {applications.length === 0 ? (
            <EmptyState title="No applicants" />
          ) : (
            applications.map((a) => {
              const [cls, label] = DECISION[a.recruiterDecision];
              const cleared = (a.roundResults || []).filter((r) => r.status === "cleared").length;
              return (
                <div key={a._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 220 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.student.name}</div>
                    <div style={{ fontSize: 12.5, color: "var(--slate)" }}>{a.student.branch} · {a.student.year} · CGPA {a.student.cgpa ?? "—"} · {a.student.rollNo}</div>
                    {a.recruiterRemarks && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Recruiter: {a.recruiterRemarks}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--slate)" }}>{cleared}/{drive.rounds.length} rounds cleared</span>
                    <span className={`badge ${cls}`}>{label}</span>
                    {canFinalize ? (
                      <select value={selections[a._id]} onChange={(e) => setSelections({ ...selections, [a._id]: e.target.value })} style={{ width: 150 }}>
                        <option value="selected">Selected</option>
                        <option value="not_selected">Not selected</option>
                      </select>
                    ) : drive.status === "finalized" ? (
                      <span className={`badge ${a.finalStatus === "selected" ? "success" : "danger"}`}>{a.finalStatus === "selected" ? "Selected" : "Not selected"}</span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </SectionCard>
      )}

      <ConfirmDialog
        open={confirm}
        danger={false}
        title="Publish final results?"
        description={`${selectedCount} of ${applications.length} students will be marked selected. Every applicant will see their result straight away, and this can't be undone.`}
        confirmLabel="Publish results"
        loading={busy}
        onConfirm={finalize}
        onCancel={() => setConfirm(false)}
      />
    </DashboardLayout>
  );
};

export default TpoDriveDetail;
