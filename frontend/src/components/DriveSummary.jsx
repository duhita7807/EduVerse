import React from "react";
import { MapPin, Wallet, Users, CalendarClock, GraduationCap } from "lucide-react";
import { fmtDate, fmtDateTime, eligibilitySummary, JOB_TYPE_LABEL } from "../utils/format.js";

const Meta = ({ icon: Icon, children }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--slate)" }}>
    <Icon size={14} />
    {children}
  </span>
);

/** Read-only drive details block shared by recruiter, TPO and student views. */
const DriveSummary = ({ drive, showRounds = true }) => (
  <div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginBottom: 12 }}>
      <Meta icon={GraduationCap}>{JOB_TYPE_LABEL[drive.jobType] || drive.jobType}</Meta>
      {drive.location && <Meta icon={MapPin}>{drive.location}</Meta>}
      {drive.ctc && <Meta icon={Wallet}>{drive.ctc}</Meta>}
      <Meta icon={Users}>{drive.openings} opening{drive.openings === 1 ? "" : "s"}</Meta>
      <Meta icon={CalendarClock}>Apply by {fmtDate(drive.applicationDeadline)}</Meta>
    </div>
    {drive.company?.about && <p style={{ fontSize: 13.5, margin: "0 0 10px" }}>{drive.company.about}</p>}
    {drive.description && <p style={{ fontSize: 13.5, margin: "0 0 10px", whiteSpace: "pre-wrap" }}>{drive.description}</p>}
    <div style={{ fontSize: 13, marginBottom: 6 }}><strong>Eligibility:</strong> {eligibilitySummary(drive.eligibility)}</div>
    {showRounds && drive.rounds?.length > 0 && (
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Selection rounds</div>
        {drive.rounds.map((r, i) => (
          <div key={r._id || i} style={{ fontSize: 13, color: "var(--slate)", padding: "3px 0" }}>
            {i + 1}. {r.name} · {r.type} · {r.mode}{r.scheduledAt ? ` · ${fmtDateTime(r.scheduledAt)}` : ""}{r.venue ? ` · ${r.venue}` : ""}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default DriveSummary;
