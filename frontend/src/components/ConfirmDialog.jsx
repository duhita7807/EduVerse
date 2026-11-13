import React from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal.jsx";

/**
 * Reusable "are you sure?" dialog — used for destructive actions like
 * deleting a chat conversation, instead of a raw browser confirm().
 */
const ConfirmDialog = ({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  return (
    <Modal open={open} onClose={onCancel}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: danger ? "var(--danger-soft)" : "var(--gradient-accent-soft)",
            color: danger ? "var(--danger)" : "var(--accent-indigo)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={18} />
        </div>
        <div>
          <h3 style={{ fontSize: 17, marginBottom: 4 }}>{title}</h3>
          {description && <p style={{ fontSize: 13.5, color: "var(--slate)", margin: 0 }}>{description}</p>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <button className="btn secondary" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </button>
        <button className={danger ? "btn danger-outline" : "btn brass"} onClick={onConfirm} disabled={loading}>
          {loading ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
