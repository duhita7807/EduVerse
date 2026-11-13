import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Wraps a single form control with a label, required marker, and inline
 * error/success state — the standard shape every form in the app uses.
 */
const FormField = ({ label, required, error, success, helpText, htmlFor, children, style }) => {
  const stateClass = error ? "has-error" : success ? "has-success" : "";

  return (
    <div className={`field ${stateClass}`} style={style}>
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      {children}
      {error && (
        <span className="hint">
          <AlertCircle size={13} />
          {error}
        </span>
      )}
      {!error && success && (
        <span className="hint" style={{ color: "var(--success)" }}>
          <CheckCircle2 size={13} />
          {success}
        </span>
      )}
      {!error && !success && helpText && <span className="help-text">{helpText}</span>}
    </div>
  );
};

export default FormField;
