import React from "react";

/**
 * A horizontal pipeline: numbered nodes joined by a line along which a pulse
 * of light travels. stages: [{ label, count, note?, attention? }]. A node with
 * `attention` (work waiting on the viewer) rings softly so the eye lands there.
 */
const PipelineViz = ({ stages }) => (
  <div className="pipe" style={{ "--n": stages.length }}>
    <div className="pipe-line" aria-hidden="true"><span /></div>
    {stages.map((s, i) => (
      <div key={s.label} className={`pipe-node ${s.attention ? "attention" : ""} ${s.count > 0 ? "has" : ""}`}>
        <div className="pipe-dot">
          <span className="mono">{s.count}</span>
        </div>
        <div className="pipe-label">{s.label}</div>
        {s.note && <div className="pipe-note">{s.note}</div>}
      </div>
    ))}
  </div>
);

export default PipelineViz;
