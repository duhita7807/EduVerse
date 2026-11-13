import AuthShell from "../components/AuthShell.jsx";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import FormField from "../components/FormField.jsx";
import { useFormValidation } from "../hooks/useFormValidation.js";
import { validators, getPasswordStrength } from "../utils/validators.js";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const BRANCHES = [
  "Computer Science & Engineering",
  "Information Technology",
  "Electronics & Telecommunication",
  "Mechanical Engineering",
  "Civil Engineering",
  "AI & Data Science",
  "Other",
];

const STEP1_SCHEMA = {
  name: validators.name,
  email: validators.email,
  password: validators.password,
};

const STEP2_SCHEMA = {
  college: validators.required("College name"),
  branch: validators.required("Branch"),
  branchOther: () => "", // validated conditionally below
  year: validators.required("Academic year"),
  rollNo: validators.rollNo,
};

const STEP3_SCHEMA = {
  githubUsername: validators.githubUsername,
  linkedinProfile: validators.linkedinUrl,
};

const StepIndicator = ({ step }) => {
  const labels = ["Basic Info", "College Info", "Professional Info"];
  return (
    <div>
      <div className="step-indicator">
        {[1, 2, 3].map((n, i) => (
          <React.Fragment key={n}>
            <div className={`step-dot ${step > n ? "done" : step === n ? "active" : ""}`}>
              {step > n ? <Check size={14} /> : n}
            </div>
            {i < 2 && <div className={`step-line ${step > n ? "done" : ""}`} />}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: -18, marginBottom: 20 }}>
        {labels.map((l, i) => (
          <span key={l} className="step-label" style={{ flex: i === 1 ? "0 0 auto" : 1, textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};

const Register = () => {
  const [step, setStep] = useState(1);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState([]);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const step1 = useFormValidation({ name: "", email: "", password: "" }, STEP1_SCHEMA);
  const step2 = useFormValidation(
    { college: "", branch: "", branchOther: "", year: "", rollNo: "" },
    STEP2_SCHEMA
  );
  const step3 = useFormValidation(
    { githubUsername: "", linkedinProfile: "" },
    STEP3_SCHEMA
  );

  const strength = getPasswordStrength(step1.values.password);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 40) {
      toast.warning("A skill should be 40 characters or fewer.");
      return;
    }
    const exists = skills.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      toast.info(`"${trimmed}" is already in your skill list.`);
      setSkillInput("");
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setSkillInput("");
  };

  const removeSkill = (skill) => setSkills((prev) => prev.filter((s) => s !== skill));

  const goNext = () => {
    if (step === 1) {
      const valid = step1.validateAll();
      const confirmMsg = validators.confirmPassword(step1.values.password)(confirmPassword);
      setConfirmError(confirmMsg);
      if (valid && !confirmMsg) setStep(2);
      return;
    }
    if (step === 2) {
      const valid = step2.validateAll();
      const branchIsOther = step2.values.branch === "Other";
      const otherMsg = branchIsOther && !step2.values.branchOther.trim() ? "Please specify your branch." : "";
      if (otherMsg) toast.error(otherMsg);
      if (valid && !otherMsg) setStep(3);
      return;
    }
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // prevent duplicate submission

    const step3Valid = step3.validateAll();
    if (!step3Valid) return;

    setSubmitError("");
    setSubmitting(true);
    try {
      const branch = step2.values.branch === "Other" ? step2.values.branchOther.trim() : step2.values.branch;

      const corePayload = {
        name: step1.values.name.trim(),
        email: step1.values.email.trim(),
        password: step1.values.password,
        college: step2.values.college.trim(),
        branch,
        year: step2.values.year,
        rollNo: step2.values.rollNo.trim(),
      };

      const professionalPayload = {
        skills: skills.length ? { programmingLanguages: skills } : undefined,
        githubUsername: step3.values.githubUsername.trim() || undefined,
        linkedinProfile: step3.values.linkedinProfile.trim() || undefined,
      };

      await register(corePayload, professionalPayload);
      toast.success("Account created. The placement cell will review it shortly.");
      navigate("/dashboard");
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-panel" style={{ maxWidth: 560 }}>
        <Link to="/" className="auth-mobile-logo"><span className="logo-mark" style={{ width: 24, height: 24 }} /><span>EduVerse</span></Link>
        <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Create your student profile</h1>
        <p style={{ color: "var(--slate)", marginBottom: 20, fontSize: 14 }}>
          Takes about two minutes. Steps 2 and 3 can be edited anytime later.
        </p>

        <StepIndicator step={step} />

        {submitError && <div className="alert error">{submitError}</div>}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <>
              <FormField label="Full name" required htmlFor="name" error={step1.visibleError("name")}>
                <input
                  id="name"
                  value={step1.values.name}
                  onChange={(e) => step1.handleChange("name", e.target.value)}
                  onBlur={() => step1.handleBlur("name")}
                  placeholder="Aarav Sharma"
                />
              </FormField>

              <FormField label="Email" required htmlFor="email" error={step1.visibleError("email")}>
                <input
                  id="email"
                  type="email"
                  value={step1.values.email}
                  onChange={(e) => step1.handleChange("email", e.target.value)}
                  onBlur={() => step1.handleBlur("email")}
                  placeholder="you@college.edu"
                />
              </FormField>

              <FormField label="Password" required htmlFor="password" error={step1.visibleError("password")}>
                <input
                  id="password"
                  type="password"
                  value={step1.values.password}
                  onChange={(e) => step1.handleChange("password", e.target.value)}
                  onBlur={() => step1.handleBlur("password")}
                  placeholder="At least 8 characters"
                />
                {step1.values.password && (
                  <>
                    <div className="pw-strength-track">
                      <div
                        className="pw-strength-fill"
                        style={{ width: `${(strength.score / 4) * 100}%`, background: strength.color }}
                      />
                    </div>
                    <div className="pw-strength-label" style={{ color: strength.color }}>{strength.label}</div>
                  </>
                )}
              </FormField>

              <FormField label="Confirm password" required htmlFor="confirmPassword" error={confirmError}>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmError) setConfirmError(validators.confirmPassword(step1.values.password)(e.target.value));
                  }}
                  onBlur={() => setConfirmError(validators.confirmPassword(step1.values.password)(confirmPassword))}
                />
              </FormField>
            </>
          )}

          {step === 2 && (
            <>
              <FormField label="College name" required htmlFor="college" error={step2.visibleError("college")}>
                <input
                  id="college"
                  value={step2.values.college}
                  onChange={(e) => step2.handleChange("college", e.target.value)}
                  onBlur={() => step2.handleBlur("college")}
                  placeholder="Indian Institute of Information Technology"
                />
              </FormField>

              <div className="two-col-grid">
                <FormField label="Branch" required htmlFor="branch" error={step2.visibleError("branch")}>
                  <select
                    id="branch"
                    value={step2.values.branch}
                    onChange={(e) => step2.handleChange("branch", e.target.value)}
                    onBlur={() => step2.handleBlur("branch")}
                  >
                    <option value="" disabled>Select branch</option>
                    {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </FormField>
                <FormField label="Academic year" required htmlFor="year" error={step2.visibleError("year")}>
                  <select
                    id="year"
                    value={step2.values.year}
                    onChange={(e) => step2.handleChange("year", e.target.value)}
                    onBlur={() => step2.handleBlur("year")}
                  >
                    <option value="" disabled>Select year</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </FormField>
              </div>

              {step2.values.branch === "Other" && (
                <FormField label="Please specify your branch" required htmlFor="branchOther">
                  <input
                    id="branchOther"
                    value={step2.values.branchOther}
                    onChange={(e) => step2.handleChange("branchOther", e.target.value)}
                    placeholder="e.g. Chemical Engineering"
                  />
                </FormField>
              )}

              <FormField
                label="Roll number"
                required
                htmlFor="rollNo"
                error={step2.visibleError("rollNo")}
                helpText="3-20 characters — letters, numbers and hyphens only."
              >
                <input
                  id="rollNo"
                  value={step2.values.rollNo}
                  onChange={(e) => step2.handleChange("rollNo", e.target.value)}
                  onBlur={() => step2.handleBlur("rollNo")}
                  placeholder="CS21B045"
                />
              </FormField>
            </>
          )}

          {step === 3 && (
            <>
              <FormField label="Skills" helpText="Press Enter to add a skill. This step is optional.">
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="e.g. React, Python, MongoDB"
                  />
                  <button type="button" className="btn secondary" onClick={addSkill}>Add</button>
                </div>
                {skills.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {skills.map((s) => (
                      <span key={s} className="badge" style={{ gap: 6 }}>
                        {s}
                        <button
                          type="button"
                          onClick={() => removeSkill(s)}
                          style={{ background: "none", border: "none", padding: 0, display: "flex", cursor: "pointer", color: "inherit" }}
                          aria-label={`Remove ${s}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </FormField>

              <FormField label="GitHub username" htmlFor="githubUsername" error={step3.visibleError("githubUsername")}>
                <input
                  id="githubUsername"
                  value={step3.values.githubUsername}
                  onChange={(e) => step3.handleChange("githubUsername", e.target.value)}
                  onBlur={() => step3.handleBlur("githubUsername")}
                  placeholder="octocat"
                />
              </FormField>

              <FormField label="LinkedIn URL" htmlFor="linkedinProfile" error={step3.visibleError("linkedinProfile")}>
                <input
                  id="linkedinProfile"
                  value={step3.values.linkedinProfile}
                  onChange={(e) => step3.handleChange("linkedinProfile", e.target.value)}
                  onBlur={() => step3.handleBlur("linkedinProfile")}
                  placeholder="https://linkedin.com/in/yourname"
                />
              </FormField>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            {step > 1 ? (
              <button type="button" className="btn secondary" onClick={goBack} disabled={submitting}>
                <ChevronLeft size={16} />
                Back
              </button>
            ) : <span />}

            {step < 3 ? (
              <button type="button" className="btn brass" onClick={goNext}>
                Continue
                <ChevronRight size={16} />
              </button>
            ) : (
              <button type="submit" className="btn brass" disabled={submitting}>
                <UserPlus size={16} />
                {submitting ? "Creating account…" : "Create account"}
              </button>
            )}
          </div>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--slate)" }}>
          Already have an account? <Link to="/login" className="gradient-text" style={{ fontWeight: 700 }}>Log in</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default Register;
