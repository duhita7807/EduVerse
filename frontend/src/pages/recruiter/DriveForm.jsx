import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, Plus, Trash2 } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import FormField from "../../components/FormField.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { recruiterApi } from "../../services/placementApi.js";
import { getErrorMessage } from "../../utils/apiError.js";
import { toLocalInput } from "../../utils/format.js";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const EMPTY = {
  company: { name: "", website: "", industry: "", about: "" },
  title: "", description: "", jobType: "full-time", location: "", ctc: "", openings: 1,
  eligibility: { minCgpa: "", branches: "", years: ["4th Year"] },
  applicationDeadline: "",
  rounds: [{ name: "Online Test", type: "test", mode: "online", scheduledAt: "", venue: "" }],
};

/** Create (/recruiter/drives/new) or edit-and-resubmit (/recruiter/drives/:id/edit) a drive. */
const DriveForm = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;
    recruiterApi
      .getDrive(id)
      .then(({ data }) => {
        const d = data.drive;
        setForm({
          company: { ...EMPTY.company, ...d.company },
          title: d.title, description: d.description, jobType: d.jobType, location: d.location, ctc: d.ctc, openings: d.openings,
          eligibility: { minCgpa: d.eligibility.minCgpa || "", branches: (d.eligibility.branches || []).join(", "), years: d.eligibility.years || [] },
          applicationDeadline: toLocalInput(d.applicationDeadline),
          rounds: (d.rounds || []).map((r) => ({ ...r, scheduledAt: toLocalInput(r.scheduledAt) })),
        });
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (path, value) =>
    setForm((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let ref = next;
      keys.slice(0, -1).forEach((k) => (ref = ref[k]));
      ref[keys[keys.length - 1]] = value;
      return next;
    });

  const toggleYear = (y) => set("eligibility.years", form.eligibility.years.includes(y) ? form.eligibility.years.filter((v) => v !== y) : [...form.eligibility.years, y]);
  const setRound = (i, key, value) => set("rounds", form.rounds.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const body = {
        ...form,
        applicationDeadline: form.applicationDeadline ? new Date(form.applicationDeadline).toISOString() : "",
        eligibility: {
          minCgpa: form.eligibility.minCgpa === "" ? 0 : Number(form.eligibility.minCgpa),
          branches: form.eligibility.branches.split(",").map((b) => b.trim()).filter(Boolean),
          years: form.eligibility.years,
        },
        rounds: form.rounds.map((r) => ({ ...r, scheduledAt: r.scheduledAt ? new Date(r.scheduledAt).toISOString() : undefined })),
      };
      const res = editing ? await recruiterApi.updateDrive(id, body) : await recruiterApi.createDrive(body);
      toast.success(res.message);
      navigate(`/recruiter/drives/${res.data.drive._id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DashboardLayout><PageHeader title="Loading drive…" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader
        title={editing ? "Edit drive" : "Post a drive"}
        subtitle={editing ? "Saving sends the drive back to the TPO for verification." : "The TPO verifies your drive before eligible students can see it."}
      />
      {error && <div className="alert error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <SectionCard title="Company" index="01">
          <FormField label="Company name" required htmlFor="cname"><input id="cname" value={form.company.name} onChange={(e) => set("company.name", e.target.value)} required /></FormField>
          <div className="two-col-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Website" htmlFor="cweb"><input id="cweb" value={form.company.website} onChange={(e) => set("company.website", e.target.value)} placeholder="https://" /></FormField>
            <FormField label="Industry" htmlFor="cind"><input id="cind" value={form.company.industry} onChange={(e) => set("company.industry", e.target.value)} /></FormField>
          </div>
          <FormField label="About the company" htmlFor="cabout"><textarea id="cabout" rows={3} maxLength={1000} value={form.company.about} onChange={(e) => set("company.about", e.target.value)} /></FormField>
        </SectionCard>

        <SectionCard title="Role" index="02">
          <FormField label="Job role / title" required htmlFor="title"><input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} required /></FormField>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <FormField label="Type" htmlFor="jt">
              <select id="jt" value={form.jobType} onChange={(e) => set("jobType", e.target.value)}>
                <option value="full-time">Full-time</option>
                <option value="internship">Internship</option>
                <option value="internship-ppo">Internship + PPO</option>
              </select>
            </FormField>
            <FormField label="Location" htmlFor="loc"><input id="loc" value={form.location} onChange={(e) => set("location", e.target.value)} /></FormField>
            <FormField label="CTC / stipend" htmlFor="ctc"><input id="ctc" value={form.ctc} onChange={(e) => set("ctc", e.target.value)} placeholder="e.g. 6 LPA" /></FormField>
            <FormField label="Openings" htmlFor="open"><input id="open" type="number" min="1" value={form.openings} onChange={(e) => set("openings", e.target.value)} /></FormField>
          </div>
          <FormField label="Job description" htmlFor="desc"><textarea id="desc" rows={4} maxLength={3000} value={form.description} onChange={(e) => set("description", e.target.value)} /></FormField>
        </SectionCard>

        <SectionCard title="Eligibility" index="03">
          <div className="two-col-grid" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
            <FormField label="Minimum CGPA" htmlFor="cgpa" helpText="0 = no cut-off">
              <input id="cgpa" type="number" step="0.1" min="0" max="10" value={form.eligibility.minCgpa} onChange={(e) => set("eligibility.minCgpa", e.target.value)} />
            </FormField>
            <FormField label="Branches" htmlFor="br" helpText="Comma-separated, e.g. CSE, IT. Leave empty for all branches.">
              <input id="br" value={form.eligibility.branches} onChange={(e) => set("eligibility.branches", e.target.value)} />
            </FormField>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Academic year</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {YEARS.map((y) => (
              <label key={y} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
                <input type="checkbox" checked={form.eligibility.years.includes(y)} onChange={() => toggleYear(y)} style={{ width: "auto" }} /> {y}
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Schedule" index="04">
          <FormField label="Application deadline" required htmlFor="dl">
            <input id="dl" type="datetime-local" value={form.applicationDeadline} onChange={(e) => set("applicationDeadline", e.target.value)} required />
          </FormField>
          <div style={{ fontSize: 13, fontWeight: 600, margin: "6px 0" }}>Selection rounds</div>
          {form.rounds.map((r, i) => (
            <div key={i} className="round-row">
              <FormField label={i === 0 ? "Name" : undefined}><input value={r.name} onChange={(e) => setRound(i, "name", e.target.value)} placeholder="Round name" /></FormField>
              <FormField label={i === 0 ? "Type" : undefined}>
                <select value={r.type} onChange={(e) => setRound(i, "type", e.target.value)}>
                  <option value="test">Test</option><option value="interview">Interview</option><option value="group-discussion">GD</option><option value="other">Other</option>
                </select>
              </FormField>
              <FormField label={i === 0 ? "Mode" : undefined}>
                <select value={r.mode} onChange={(e) => setRound(i, "mode", e.target.value)}><option value="online">Online</option><option value="offline">Offline</option></select>
              </FormField>
              <FormField label={i === 0 ? "Date & time" : undefined}><input type="datetime-local" value={r.scheduledAt || ""} onChange={(e) => setRound(i, "scheduledAt", e.target.value)} /></FormField>
              <button type="button" className="icon-btn" aria-label="Remove round" onClick={() => set("rounds", form.rounds.filter((_, idx) => idx !== i))} style={{ marginBottom: 14 }}><Trash2 size={15} /></button>
            </div>
          ))}
          <button type="button" className="btn secondary" onClick={() => set("rounds", [...form.rounds, { name: "", type: "interview", mode: "online", scheduledAt: "", venue: "" }])}>
            <Plus size={14} />Add round
          </button>
        </SectionCard>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn brass" disabled={submitting}><Send size={15} />{submitting ? "Submitting…" : editing ? "Save & resubmit" : "Submit for verification"}</button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default DriveForm;
