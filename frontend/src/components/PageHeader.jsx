import React from "react";

/**
 * Header used across dashboard pages: optional eyebrow badge, a large title,
 * a subtitle and an action slot on the right. A hairline under it draws in
 * once on load.
 */
const PageHeader = ({ eyebrow, title, subtitle, actions }) => (
  <div className="ph">
    <div className="ph-text">
      {eyebrow && <span className="badge">{eyebrow}</span>}
      <h1 className="ph-title">{title}</h1>
      {subtitle && <p className="ph-sub">{subtitle}</p>}
    </div>
    {actions && <div className="ph-actions">{actions}</div>}
  </div>
);

export default PageHeader;
