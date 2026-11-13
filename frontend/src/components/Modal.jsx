import React, { useEffect } from "react";

/**
 * Generic modal shell — reused by ConfirmDialog and any page that needs a
 * focused overlay panel. Closes on overlay click or Escape.
 */
const Modal = ({ open, onClose, children, maxWidth = 420 }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
};

export default Modal;
