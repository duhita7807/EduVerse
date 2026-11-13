import React from "react";
import { Mail, ChevronRight } from "lucide-react";
import EmptyState from "./EmptyState.jsx";

/**
 * Shortlisted students grouped by branch ([{ branch, students }]). Admin rows
 * carry `shortlists` (company names); recruiter rows only `shortlistCount`;
 * drive auto-shortlist rows neither. `action(student)` renders an extra cell.
 * Each branch is a collapsible section (first open) and its table scrolls
 * inside a fixed height, so long lists don't stretch the page.
 */
const ShortlistGroups = ({ groups, action }) => {
  if (!groups.length) return <EmptyState title="No shortlisted students" description="Students recommended or selected in a drive appear here." />;

  return groups.map((g, i) => {
    const showBy = g.students.some((s) => s.shortlists || s.shortlistCount != null);
    const headers = ["Student", "Roll no.", "Year", "CGPA", ...(showBy ? ["Shortlisted by"] : []), ...(action ? [""] : [])];
    return (
      <details key={g.branch} className="sl-group" open={i === 0}>
        <summary>
          <ChevronRight size={16} className="sl-chevron" />
          <span className="sl-branch">{g.branch}</span>
          <span className="badge neutral">{g.students.length} student{g.students.length === 1 ? "" : "s"}</span>
        </summary>
        <div className="sl-scroll">
          <table className="sl-table">
            <thead>
              <tr>{headers.map((h, j) => <th key={j}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {g.students.map((s) => (
                <tr key={s._id}>
                  <td>
                    <div className="sl-name">{s.name}</div>
                    <div className="sl-sub"><Mail size={11} /> {s.email}</div>
                  </td>
                  <td className="tabular">{s.rollNo}</td>
                  <td>{s.year}</td>
                  <td className="tabular">{s.cgpa ?? "—"}</td>
                  {showBy && (
                    <td>
                      {s.shortlists
                        ? s.shortlists.map((x) => `${x.company || "—"}${x.finalStatus === "selected" ? " (selected)" : ""}`).join(", ")
                        : `${s.shortlistCount} compan${s.shortlistCount === 1 ? "y" : "ies"}`}
                    </td>
                  )}
                  {action && <td style={{ textAlign: "right" }}>{action(s)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    );
  });
};

export default ShortlistGroups;
