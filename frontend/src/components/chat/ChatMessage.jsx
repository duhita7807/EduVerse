import React from "react";
import { Sparkles, User, Map } from "lucide-react";

const formatTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

// Markdown-lite used by assistant replies: **bold** and _italic_ (rendered as elements, never as HTML).
const renderInline = (text) =>
  String(text).split(/(\*\*[^*]+\*\*|(?<![\w])_[^_\n]+_(?![\w]))/).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part.startsWith("_") && part.endsWith("_") && part.length > 2 ? <em key={i}>{part.slice(1, -1)}</em>
      : part);

/**
 * One chat turn: avatar + bubble + timestamp, plus optional suggested-action
 * chips and a roadmap step list when the assistant's reply carries them.
 */
const ChatMessage = ({ role, content, timestamp, suggestedActions = [], roadmapSteps = [], onActionClick }) => {
  const isUser = role === "user";

  return (
    <div className={`chat-bubble-row ${isUser ? "user" : ""}`}>
      <div className={`chat-avatar ${isUser ? "user-avatar" : ""}`}>
        {isUser ? <User size={15} /> : <Sparkles size={15} />}
      </div>
      <div style={{ maxWidth: "72%" }}>
        <div className={`chat-bubble ${isUser ? "user" : "assistant"}`}>{isUser ? content : renderInline(content)}</div>

        {roadmapSteps.length > 0 && (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {roadmapSteps.map((step) => (
              <div key={step.step} className="card" style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 26, height: 26, borderRadius: 8, background: "var(--gradient-accent)", color: "var(--on-accent)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {step.step}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{step.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--slate)" }}>{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {suggestedActions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {suggestedActions.map((action) => (
              <button key={action} type="button" className="quick-prompt-chip" onClick={() => onActionClick?.(action)}>
                {action}
              </button>
            ))}
          </div>
        )}

        {timestamp && (
          <div className="chat-timestamp" style={{ textAlign: isUser ? "right" : "left" }}>
            {formatTime(timestamp)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
