import React from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const POINTS = [
  "One profile that pulls in your projects, GitHub and coding activity",
  "Drives from the placement cell, filtered to the ones you can apply to",
  "A plain read on what's missing before a recruiter looks",
];

/**
 * Split screen for login / sign-up: a brand panel on the
 * left, the form on the right. Collapses to just the form on small screens.
 */
const AuthShell = ({ children, heading = "Your placement record, kept sharp." }) => (
  <div className="auth page-fade">
    <section className="auth-brand" aria-hidden="false">
      <Link to="/" className="auth-logo">
        <span className="logo-mark" />
        <span>EduVerse</span>
      </Link>
      <div>
        <h2>{heading}</h2>
        <ul>
          {POINTS.map((p) => (
            <li key={p}><Check size={15} />{p}</li>
          ))}
        </ul>
      </div>
    </section>
    <section className="auth-form">{children}</section>
  </div>
);

export default AuthShell;
