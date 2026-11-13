import React from "react";
import { Sparkles } from "lucide-react";

const TypingIndicator = () => (
  <div className="chat-bubble-row">
    <div className="chat-avatar">
      <Sparkles size={15} />
    </div>
    <div className="chat-bubble assistant" style={{ display: "inline-flex", alignItems: "center" }}>
      <span className="typing-dots">
        <span />
        <span />
        <span />
      </span>
    </div>
  </div>
);

export default TypingIndicator;
