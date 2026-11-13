import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { homeForRole } from "../utils/roles.js";

/**
 * Wraps a page element and redirects to /login if there is no authenticated
 * user. Role rules:
 *  - `roles={["tpo","admin"]}` allows only those roles;
 *  - `adminOnly` is kept as shorthand for roles={["admin"]};
 *  - with neither prop the page is student-only.
 * Anyone landing on a page their role can't use is sent to their own home.
 */
const ProtectedRoute = ({ children, adminOnly = false, roles }) => {
  const { student, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <span className="logo-mark" style={{ width: 34, height: 34 }} />
        <span className="mono" style={{ color: "var(--slate)", fontSize: 13 }}>Loading EduVerse…</span>
      </div>
    );
  }

  if (!student) {
    return <Navigate to="/login" replace />;
  }

  const allowed = roles || (adminOnly ? ["admin"] : ["student"]);
  if (!allowed.includes(student.role)) return <Navigate to={homeForRole(student.role)} replace />;

  return children;
};

export default ProtectedRoute;
