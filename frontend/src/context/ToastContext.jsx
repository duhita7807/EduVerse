import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const DEFAULT_DURATION = 4500;

/**
 * App-wide toast notifications (spec Part 6). Call useToast() anywhere to
 * push a transient success/error/warning/info message — used for things
 * like "Profile updated successfully" that don't need a full inline alert.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "info", duration = DEFAULT_DURATION) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (msg, duration) => push(msg, "success", duration),
    error: (msg, duration) => push(msg, "error", duration),
    warning: (msg, duration) => push(msg, "warning", duration),
    info: (msg, duration) => push(msg, "info", duration),
    dismiss,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-viewport" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={t.id} className={`toast ${t.type}`} role="status">
              <Icon size={17} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{t.message}</span>
              <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};
