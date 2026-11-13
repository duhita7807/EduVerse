import React from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export const STATUS_META = {
  pending: { icon: Clock, label: "Pending review", color: "var(--warning, #b8860b)" },
  verified: { icon: CheckCircle2, label: "Verified", color: "var(--success, #1f9d55)" },
  rejected: { icon: XCircle, label: "Rejected", color: "var(--danger, #d64545)" },
};

/** Small inline status chip for a certificate's admin verification state. */
const VerificationBadge = ({ status, note }) => {
  const meta = STATUS_META[status];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span
      title={status === "rejected" ? note : undefined}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: meta.color }}
    >
      <Icon size={13} />
      {meta.label}
    </span>
  );
};

export default VerificationBadge;
