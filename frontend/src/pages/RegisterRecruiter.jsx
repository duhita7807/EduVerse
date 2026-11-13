import AuthShell from "../components/AuthShell.jsx";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import FormField from "../components/FormField.jsx";
import { useFormValidation } from "../hooks/useFormValidation.js";
import { validators } from "../utils/validators.js";
import { getErrorMessage } from "../utils/apiError.js";

const SCHEMA = {
  name: validators.name,
  email: validators.email,
  password: validators.password,
  organization: validators.required("Company name"),
};

const RegisterRecruiter = () => {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { registerRecruiter } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const form = useFormValidation({ name: "", email: "", password: "", organization: "" }, SCHEMA);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !form.validateAll()) return;
    setError("");
    setSubmitting(true);
    try {
      await registerRecruiter({
        name: form.values.name.trim(),
        email: form.values.email.trim(),
        password: form.values.password,
        organization: form.values.organization.trim(),
      });
      toast.success("Recruiter account created!");
      navigate("/recruiter");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key, label, type = "text", extra = {}) => (
    <FormField label={label} required htmlFor={key} error={form.visibleError(key)} {...extra}>
      <input
        id={key}
        type={type}
        value={form.values[key]}
        onChange={(e) => form.handleChange(key, e.target.value)}
        onBlur={() => form.handleBlur(key)}
      />
    </FormField>
  );

  return (
    <AuthShell>
      <div className="auth-panel" style={{ maxWidth: 440 }}>
        <Link to="/" className="auth-mobile-logo"><span className="logo-mark" style={{ width: 24, height: 24 }} /><span>EduVerse</span></Link>
        <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Recruiter sign-up</h1>
        <p style={{ color: "var(--slate)", marginBottom: 24, fontSize: 14 }}>
          Post your company's drive. The placement cell verifies it before students see it.
        </p>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {field("name", "Your full name")}
          {field("organization", "Company name")}
          {field("email", "Work email", "email")}
          {field("password", "Password", "password")}
          <button type="submit" className="btn brass" style={{ width: "100%", marginTop: 8 }} disabled={submitting}>
            <Building2 size={16} />
            {submitting ? "Creating account…" : "Create recruiter account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--slate)" }}>
          Already registered? <Link to="/login" className="gradient-text" style={{ fontWeight: 700 }}>Log in</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default RegisterRecruiter;
