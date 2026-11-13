import React from "react";

export const DRIVE_STATUS = {
  pending: { label: "Awaiting TPO verification", cls: "warning" },
  rejected: { label: "Changes requested", cls: "danger" },
  approved: { label: "Approved · open", cls: "success" },
  results_submitted: { label: "Results with TPO", cls: "warning" },
  finalized: { label: "Finalized", cls: "neutral" },
};

/** Coloured chip for a drive's lifecycle status. */
const DriveStatusBadge = ({ status }) => {
  const meta = DRIVE_STATUS[status] || { label: status, cls: "neutral" };
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>;
};

export default DriveStatusBadge;
