import React from "react";
import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";

/**
 * Reusable empty/error state block (spec Part 7 & global components list).
 * Used anywhere a list/section has nothing to show yet, with an optional
 * action button (e.g. "Add Project", "Run AI Analysis").
 */
const EmptyState = ({ icon: Icon = Inbox, title, description, actionLabel, onAction, actionTo }) => {
  return (
    <div className="state-block">
      <div className="state-icon">
        <Icon size={20} />
      </div>
      {title && <h4>{title}</h4>}
      {description && <p>{description}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn brass" style={{ display: "inline-flex" }}>
          {actionLabel}
        </Link>
      )}
      {actionLabel && !actionTo && onAction && (
        <button className="btn brass" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
