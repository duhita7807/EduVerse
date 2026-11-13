import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import SectionCard from "../components/SectionCard.jsx";
import PageHeader from "../components/PageHeader.jsx";
import FormField from "../components/FormField.jsx";
import FileUploader from "../components/FileUploader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../api/axios.js";
import { validators } from "../utils/validators.js";
import { getErrorMessage, getFieldErrors } from "../utils/apiError.js";
import { assetUrl } from "../utils/assetUrl.js";
import { Award, Trash2, Plus } from "lucide-react";

const emptyProject = { title: "", description: "", technologies: "", githubRepo: "" };
const emptyEducation = { degree: "", institution: "", branch: "", startYear: "", endYear: "", cgpa: "" };
const emptyInternship = { company: "", role: "", description: "" };
const emptyCertification = { title: "", issuedBy: "", issueDate: "", credentialUrl: "", certificateFile: null };

/**
 * Validates the array sections (education/projects/internships/
 * certifications) client-side, mirroring backend/middleware/validateProfile.js.
 * Returns a flat list of human-readable messages; empty = valid.
 * The backend remains the source of truth — this is fast feedback only.
 */
const validateArraySections = (form) => {
  const issues = [];

  form.education.forEach((edu, i) => {
    const hasAnyValue = edu.degree || edu.institution || edu.startYear || edu.endYear || edu.cgpa;
    if (!hasAnyValue) return;
    if (!edu.degree?.trim()) issues.push(`Education #${i + 1}: degree is required.`);
    if (!edu.institution?.trim()) issues.push(`Education #${i + 1}: institution is required.`);
    if (edu.startYear && edu.endYear && Number(edu.endYear) < Number(edu.startYear)) {
      issues.push(`Education #${i + 1}: end year cannot be before start year.`);
    }
    if (edu.cgpa !== "" && edu.cgpa !== undefined) {
      const msg = validators.cgpa(edu.cgpa);
      if (msg) issues.push(`Education #${i + 1}: ${msg}`);
    }
  });

  form.projects.forEach((p, i) => {
    if (!p.title?.trim()) return; // empty row, ignored on submit anyway
    if (p.githubRepo) {
      const msg = validators.url("repository URL")(p.githubRepo);
      if (msg) issues.push(`Project "${p.title}": ${msg}`);
    }
  });

  form.internships.forEach((it) => {
    if (it.company && !it.company.trim()) issues.push("An internship entry is missing a company name.");
  });

  form.certifications.forEach((c, i) => {
    const n = i + 1;
    if (!c.title?.trim() && (c.issuedBy || c.issueDate || c.credentialUrl || c.certificateFile)) {
      issues.push(`Certificate #${n}: a title is required (otherwise it won't be saved).`);
    }
    if (c.credentialUrl) {
      const msg = validators.url("credential URL")(c.credentialUrl);
      if (msg) issues.push(`Certificate #${n}: ${msg}`);
    }
  });

  return issues;
};

const EditProfile = () => {
  const { student, updateStudentInState } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: student?.name || "",
    college: student?.college || "",
    branch: student?.branch || "",
    year: student?.year || "",
    rollNo: student?.rollNo || "",
    bio: student?.bio || "",
    careerInterests: (student?.careerInterests || []).join(", "),
    githubUsername: student?.githubUsername || "",
    linkedinProfile: student?.linkedinProfile || "",
    skills: {
      programmingLanguages: (student?.skills?.programmingLanguages || []).join(", "),
      webTechnologies: (student?.skills?.webTechnologies || []).join(", "),
      databases: (student?.skills?.databases || []).join(", "),
      tools: (student?.skills?.tools || []).join(", "),
    },
    education: student?.education?.length ? student.education : [emptyEducation],
    projects: student?.projects?.length
      ? student.projects.map((p) => ({ ...p, technologies: (p.technologies || []).join(", ") }))
      : [emptyProject],
    internships: student?.internships?.length ? student.internships : [emptyInternship],
    certifications: student?.certifications?.length
      ? student.certifications.map((c) => ({
          ...emptyCertification,
          ...c,
          issueDate: c.issueDate ? String(c.issueDate).slice(0, 10) : "",
          credentialUrl: c.credentialUrl || "",
          certificateFile: c.certificateFile?.url ? c.certificateFile : null,
        }))
      : [emptyCertification],
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ type: "", message: "", list: [] });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };
  const handleSkill = (field, value) => setForm((f) => ({ ...f, skills: { ...f.skills, [field]: value } }));

  const handleListChange = (listName, index, field, value) => {
    setForm((f) => {
      const list = [...f[listName]];
      list[index] = { ...list[index], [field]: value };
      return { ...f, [listName]: list };
    });
  };

  const addListItem = (listName, emptyItem) => {
    setForm((f) => ({ ...f, [listName]: [...f[listName], emptyItem] }));
  };

  const removeListItem = (listName, index) => {
    setForm((f) => ({ ...f, [listName]: f[listName].filter((_, i) => i !== index) }));
  };

  const setCertFile = (index, file) => handleListChange("certifications", index, "certificateFile", file);

  const removeCertificate = (index) => {
    const file = form.certifications[index]?.certificateFile;
    if (file?.pending && file.url) {
      api.delete("/profile/certificate-file", { params: { url: file.url } }).catch(() => {});
    }
    removeListItem("certifications", index);
  };

  const validateScalarFields = () => {
    const errors = {};
    const rollNoMsg = validators.rollNo(form.rollNo);
    if (rollNoMsg) errors.rollNo = rollNoMsg;
    const githubMsg = validators.githubUsername(form.githubUsername);
    if (githubMsg) errors.githubUsername = githubMsg;
    const linkedinMsg = validators.linkedinUrl(form.linkedinProfile);
    if (linkedinMsg) errors.linkedinProfile = linkedinMsg;
    return errors;
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const photoForm = new FormData();
      photoForm.append("photo", file);
      const { data } = await api.post("/profile/photo", photoForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateStudentInState({ ...student, profilePhoto: data.profilePhoto });
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return; // prevent duplicate submission

    setStatus({ type: "", message: "", list: [] });

    const scalarErrors = validateScalarFields();
    const arrayIssues = validateArraySections(form);

    if (Object.keys(scalarErrors).length > 0 || arrayIssues.length > 0) {
      setFieldErrors(scalarErrors);
      setStatus({
        type: "error",
        message: "Please fix the highlighted issues before saving.",
        list: arrayIssues,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);

    const payload = {
      ...form,
      careerInterests: form.careerInterests.split(",").map((s) => s.trim()).filter(Boolean),
      skills: {
        programmingLanguages: form.skills.programmingLanguages.split(",").map((s) => s.trim()).filter(Boolean),
        webTechnologies: form.skills.webTechnologies.split(",").map((s) => s.trim()).filter(Boolean),
        databases: form.skills.databases.split(",").map((s) => s.trim()).filter(Boolean),
        tools: form.skills.tools.split(",").map((s) => s.trim()).filter(Boolean),
      },
      education: form.education.filter((e) => e.degree || e.institution),
      projects: form.projects
        .filter((p) => p.title)
        .map((p) => ({ ...p, technologies: p.technologies.split(",").map((t) => t.trim()).filter(Boolean) })),
      internships: form.internships.filter((i) => i.company),
      certifications: form.certifications
        .filter((c) => c.title?.trim())
        .map((c) => ({
          ...(c._id ? { _id: c._id } : {}),
          title: c.title.trim(),
          issuedBy: c.issuedBy?.trim() || "",
          issueDate: c.issueDate || null,
          credentialUrl: c.credentialUrl?.trim() || "",
          // strip client-only flags (pending) before sending
          certificateFile: c.certificateFile
            ? {
                url: c.certificateFile.url,
                originalName: c.certificateFile.originalName,
                mimeType: c.certificateFile.mimeType,
                size: c.certificateFile.size,
              }
            : null,
        })),
    };

    try {
      const { data } = await api.put("/profile", payload);
      updateStudentInState(data.student);
      // Files are now attached server-side: clear the "pending" flag locally.
      setForm((f) => ({
        ...f,
        certifications: f.certifications.map((c) =>
          c.certificateFile ? { ...c, certificateFile: { ...c.certificateFile, pending: false } } : c
        ),
      }));
      toast.success("Profile updated successfully.");
      setStatus({ type: "success", message: "Profile saved successfully.", list: [] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const backendFieldErrors = getFieldErrors(err);
      setStatus({
        type: "error",
        message: getErrorMessage(err),
        list: backendFieldErrors.map((fe) => fe.message),
      });
      toast.error("Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Edit profile"
        actions={<button className="btn secondary" onClick={() => navigate("/my-profile")}>Cancel</button>}
      />

      {status.message && (
        <div className={`alert ${status.type}`} style={{ flexDirection: "column", alignItems: "stretch" }}>
          <strong>{status.message}</strong>
          {status.list?.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {status.list.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <SectionCard title="Profile photo" index="01">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="avatar-gradient" style={{ width: 64, height: 64, fontSize: 22 }}>
              {student?.profilePhoto ? (
                <img src={assetUrl(student.profilePhoto)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                form.name.charAt(0)
              )}
            </div>
            <div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoSelect} style={{ display: "none" }} />
              <button type="button" className="btn secondary" onClick={() => fileInputRef.current.click()} disabled={uploadingPhoto}>
                {uploadingPhoto ? "Uploading…" : "Change photo"}
              </button>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>JPEG, PNG or WebP. Max 3MB.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Personal information" index="02">
          <div className="two-col-grid">
            <FormField label="Full name" required>
              <input value={form.name} onChange={(e) => handleField("name", e.target.value)} required />
            </FormField>
            <FormField label="Roll number" required error={fieldErrors.rollNo} helpText={!fieldErrors.rollNo && "3-20 characters, letters/numbers/hyphens."}>
              <input value={form.rollNo} onChange={(e) => handleField("rollNo", e.target.value)} required />
            </FormField>
            <FormField label="College" required>
              <input value={form.college} onChange={(e) => handleField("college", e.target.value)} required />
            </FormField>
            <FormField label="Branch" required>
              <input value={form.branch} onChange={(e) => handleField("branch", e.target.value)} required />
            </FormField>
            <FormField label="Year" required>
              <select value={form.year} onChange={(e) => handleField("year", e.target.value)} required>
                {["1st Year", "2nd Year", "3rd Year", "4th Year"].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Bio" helpText={`${form.bio.length}/300 characters`}>
            <textarea rows={3} maxLength={300} value={form.bio} onChange={(e) => handleField("bio", e.target.value)} placeholder="A short professional bio…" />
          </FormField>

          <FormField label="Career Interests" helpText="Comma-separated. Used to fine-tune your AI career-role recommendations alongside your branch, skills, projects, and academics.">
            <input
              value={form.careerInterests}
              onChange={(e) => handleField("careerInterests", e.target.value)}
              placeholder="e.g. Automobile Design, Web Development, Structural Engineering"
            />
          </FormField>
        </SectionCard>

        <SectionCard title="Technical skills" index="03">
          <p style={{ fontSize: 12, color: "var(--slate)", marginTop: -8, marginBottom: 14 }}>Separate each skill with a comma. Duplicates are removed automatically.</p>
          <FormField label="Programming languages">
            <input value={form.skills.programmingLanguages} onChange={(e) => handleSkill("programmingLanguages", e.target.value)} placeholder="JavaScript, Python, Java" />
          </FormField>
          <FormField label="Web technologies">
            <input value={form.skills.webTechnologies} onChange={(e) => handleSkill("webTechnologies", e.target.value)} placeholder="React, Node.js, Express" />
          </FormField>
          <FormField label="Databases">
            <input value={form.skills.databases} onChange={(e) => handleSkill("databases", e.target.value)} placeholder="MongoDB, MySQL" />
          </FormField>
          <FormField label="Tools">
            <input value={form.skills.tools} onChange={(e) => handleSkill("tools", e.target.value)} placeholder="Git, Docker, Postman" />
          </FormField>
        </SectionCard>

        <SectionCard
          title="Education"
          index="04"
          action={<button type="button" className="btn secondary" onClick={() => addListItem("education", emptyEducation)}>+ Add</button>}
        >
          {form.education.map((edu, i) => (
            <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid var(--line)" }}>
              <div className="two-col-grid">
                <FormField label="Degree"><input value={edu.degree} onChange={(e) => handleListChange("education", i, "degree", e.target.value)} placeholder="B.Tech" /></FormField>
                <FormField label="Institution"><input value={edu.institution} onChange={(e) => handleListChange("education", i, "institution", e.target.value)} /></FormField>
                <FormField label="Start year"><input type="number" value={edu.startYear} onChange={(e) => handleListChange("education", i, "startYear", e.target.value)} /></FormField>
                <FormField label="End year"><input type="number" value={edu.endYear} onChange={(e) => handleListChange("education", i, "endYear", e.target.value)} /></FormField>
                <FormField label="CGPA" helpText="0-10 scale"><input type="number" step="0.01" min="0" max="10" value={edu.cgpa} onChange={(e) => handleListChange("education", i, "cgpa", e.target.value)} /></FormField>
              </div>
              {form.education.length > 1 && (
                <button type="button" onClick={() => removeListItem("education", i)} className="btn secondary" style={{ fontSize: 12, padding: "6px 12px" }}>Remove</button>
              )}
            </div>
          ))}
        </SectionCard>

        <SectionCard
          title="Projects"
          index="05"
          action={<button type="button" className="btn secondary" onClick={() => addListItem("projects", emptyProject)}>+ Add</button>}
        >
          {form.projects.map((p, i) => (
            <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid var(--line)" }}>
              <FormField label="Title"><input value={p.title} onChange={(e) => handleListChange("projects", i, "title", e.target.value)} placeholder="EduVerse" /></FormField>
              <FormField label="Description" helpText={`${(p.description || "").length}/600 characters`}>
                <textarea rows={2} maxLength={600} value={p.description} onChange={(e) => handleListChange("projects", i, "description", e.target.value)} />
              </FormField>
              <FormField label="Technologies (comma separated)"><input value={p.technologies} onChange={(e) => handleListChange("projects", i, "technologies", e.target.value)} placeholder="React, Node.js" /></FormField>
              <FormField label="GitHub repository URL"><input value={p.githubRepo} onChange={(e) => handleListChange("projects", i, "githubRepo", e.target.value)} placeholder="https://github.com/username/repo" /></FormField>
              {form.projects.length > 1 && (
                <button type="button" onClick={() => removeListItem("projects", i)} className="btn secondary" style={{ fontSize: 12, padding: "6px 12px" }}>Remove</button>
              )}
            </div>
          ))}
        </SectionCard>

        <SectionCard
          title="Internships"
          index="06"
          action={<button type="button" className="btn secondary" onClick={() => addListItem("internships", emptyInternship)}>+ Add</button>}
        >
          {form.internships.map((it, i) => (
            <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid var(--line)" }}>
              <div className="two-col-grid">
                <FormField label="Company"><input value={it.company} onChange={(e) => handleListChange("internships", i, "company", e.target.value)} /></FormField>
                <FormField label="Role"><input value={it.role} onChange={(e) => handleListChange("internships", i, "role", e.target.value)} /></FormField>
              </div>
              <FormField label="Description"><textarea rows={2} value={it.description} onChange={(e) => handleListChange("internships", i, "description", e.target.value)} /></FormField>
              {form.internships.length > 1 && (
                <button type="button" onClick={() => removeListItem("internships", i)} className="btn secondary" style={{ fontSize: 12, padding: "6px 12px" }}>Remove</button>
              )}
            </div>
          ))}
        </SectionCard>

        <SectionCard
          title="Certifications"
          index="07"
          icon={Award}
          action={<button type="button" className="btn secondary" onClick={() => addListItem("certifications", emptyCertification)}><Plus size={14} /> Add certificate</button>}
        >
          {form.certifications.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--slate)", margin: 0 }}>
              No certificates yet. Use “Add certificate” to attach a credential and upload the certificate file.
            </p>
          )}
          {form.certifications.map((c, i) => (
            <div key={c._id || i} className="cert-card">
              <div className="cert-card-head">
                <span className="mono">CERTIFICATE {String(i + 1).padStart(2, "0")}</span>
                <button type="button" className="icon-btn danger" onClick={() => removeCertificate(i)} aria-label={`Remove certificate ${i + 1}`} title="Remove certificate">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="two-col-grid">
                <FormField label="Certificate title" required>
                  <input value={c.title} onChange={(e) => handleListChange("certifications", i, "title", e.target.value)} placeholder="AWS Certified Cloud Practitioner" />
                </FormField>
                <FormField label="Issued by">
                  <input value={c.issuedBy} onChange={(e) => handleListChange("certifications", i, "issuedBy", e.target.value)} placeholder="Amazon Web Services" />
                </FormField>
                <FormField label="Issue date">
                  <input type="date" value={c.issueDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => handleListChange("certifications", i, "issueDate", e.target.value)} />
                </FormField>
                <FormField label="Credential URL" helpText="Optional link to verify the certificate online.">
                  <input value={c.credentialUrl} onChange={(e) => handleListChange("certifications", i, "credentialUrl", e.target.value)} placeholder="https://…" />
                </FormField>
              </div>
              <FormField label="Certificate file" style={{ marginBottom: 0 }}>
                <FileUploader value={c.certificateFile} onChange={(file) => setCertFile(i, file)} />
              </FormField>
            </div>
          ))}
        </SectionCard>

        <SectionCard title="GitHub & LinkedIn" index="08">
          <div className="two-col-grid">
            <FormField label="GitHub username" error={fieldErrors.githubUsername}>
              <input value={form.githubUsername} onChange={(e) => handleField("githubUsername", e.target.value)} placeholder="octocat" />
            </FormField>
            <FormField label="LinkedIn URL" error={fieldErrors.linkedinProfile}>
              <input value={form.linkedinProfile} onChange={(e) => handleField("linkedinProfile", e.target.value)} placeholder="https://linkedin.com/in/…" />
            </FormField>
          </div>
        </SectionCard>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button type="submit" className="btn brass" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
          <button type="button" className="btn secondary" onClick={() => navigate("/my-profile")}>Cancel</button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default EditProfile;
