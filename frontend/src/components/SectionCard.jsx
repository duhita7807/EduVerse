import React from "react";

/**
 * A titled glass/soft card used to group a section of content (Skills,
 * Projects, etc). `index` is optional and only appropriate for genuinely
 * ordered sections (currently not rendered: most dashboard sections are not a sequence). `glow` adds the restrained AI-highlight border,
 * reserved for the single most important AI section on a page.
 */
const SectionCard = ({ title, index, action, children, style, glow = false, icon: Icon }) => (
  <div className={`card hoverable ${glow ? "ai-glow" : ""}`} style={{ marginBottom: 20, ...style }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <h3 style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 10 }}>
        {Icon && <Icon size={17} style={{ color: "var(--accent-purple)", flexShrink: 0 }} />}
        {title}
      </h3>
      {action}
    </div>
    {children}
  </div>
);

export default SectionCard;
