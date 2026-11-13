import AuthShell from "../components/AuthShell.jsx";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import FormField from "../components/FormField.jsx";
import { useFormValidation } from "../hooks/useFormValidation.js";
import { validators } from "../utils/validators.js";
import { getErrorMessage } from "../utils/apiError.js";
import { homeForRole } from "../utils/roles.js";

const SCHEMA = {
  email: validators.email,
  password: validators.required("Password"),
};

const Login = () => {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const form = useFormValidation({ email: "", password: "" }, SCHEMA);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.validateAll()) return;

    setError("");
    setSubmitting(true);
    try {
      const loggedInStudent = await login(form.values.email.trim(), form.values.password);
      toast.success("Welcome back!");
      navigate(homeForRole(loggedInStudent?.role));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-panel" style={{ maxWidth: 420 }}>
        <Link to="/" className="auth-mobile-logo"><span className="logo-mark" style={{ width: 24, height: 24 }} /><span>EduVerse</span></Link>
        <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Welcome back</h1>
        <p style={{ color: "var(--slate)", marginBottom: 24, fontSize: 14 }}>Log in to your student record.</p>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Email" required htmlFor="email" error={form.visibleError("email")}>
            <input
              id="email"
              type="email"
              value={form.values.email}
              onChange={(e) => form.handleChange("email", e.target.value)}
              onBlur={() => form.handleBlur("email")}
              autoFocus
            />
          </FormField>
          <FormField label="Password" required htmlFor="password" error={form.visibleError("password")}>
            <input
              id="password"
              type="password"
              value={form.values.password}
              onChange={(e) => form.handleChange("password", e.target.value)}
              onBlur={() => form.handleBlur("password")}
            />
          </FormField>

          <button type="submit" className="btn brass" style={{ width: "100%", marginTop: 8 }} disabled={submitting}>
            <LogIn size={16} />
            {submitting ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--slate)" }}>
          New to EduVerse? <Link to="/register" className="gradient-text" style={{ fontWeight: 700 }}>Create an account</Link>
        </p>
        <p style={{ textAlign: "center", marginTop: 6, fontSize: 13, color: "var(--slate)" }}>
          Hiring for your company? <Link to="/register-recruiter" className="gradient-text" style={{ fontWeight: 700 }}>Register as a recruiter</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default Login;
