import { Link } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  Trash2,
  Plus,
  MessageCircle,
  UserCheck,
  Map,
  BookOpen,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import ChatMessage from "../components/chat/ChatMessage.jsx";
import TypingIndicator from "../components/chat/TypingIndicator.jsx";
import { useToast } from "../context/ToastContext.jsx";
import careerAssistantApi from "../services/careerAssistantApi.js";
import { getErrorMessage } from "../utils/apiError.js";

const QUICK_PROMPTS = [
  "What career is suitable for my skills?",
  "How can I improve my placement readiness?",
  "What skills should I learn next?",
  "Help me prepare for a technical interview.",
  "Suggest projects for my target role.",
  "Create a learning roadmap for me.",
  "What are my biggest skill gaps?",
];

const MODES = [
  { id: "chat", label: "Chat", icon: MessageCircle, placeholder: "Ask anything about your career..." },
  { id: "interview", label: "Mock Interview", icon: UserCheck, placeholder: "e.g. \"Start a React technical interview\"" },
  { id: "roadmap", label: "Career Roadmap", icon: Map, placeholder: "Target role (optional), e.g. Full Stack Developer" },
  { id: "learning-plan", label: "Learning Plan", icon: BookOpen, placeholder: "What do you want to learn? e.g. Docker" },
];

const MAX_MESSAGE_LENGTH = 2000;

const CareerAssistant = () => {
  const toast = useToast();

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("chat");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title } | 'all'
  const [deleting, setDeleting] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const loadHistory = async () => {
    try {
      const { data } = await careerAssistantApi.listHistory();
      setHistory(data.conversations || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setMode("chat");
    setInput("");
  };

  const openConversation = async (id) => {
    try {
      const { data } = await careerAssistantApi.getConversation(id);
      setActiveConversationId(id);
      setMessages(data.conversation.messages || []);
      const lastMode = data.conversation.messages?.[data.conversation.messages.length - 1]?.mode;
      setMode(lastMode || "chat");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const currentMode = MODES.find((m) => m.id === mode) || MODES[0];

  const validateInput = () => {
    const trimmed = input.trim();
    if (mode === "roadmap") return ""; // roadmap works with an empty/default input
    if (!trimmed) return "Message cannot be empty.";
    if (trimmed.length > MAX_MESSAGE_LENGTH) return `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`;
    return "";
  };

  const sendTurn = async (rawMessage) => {
    const trimmed = rawMessage.trim();
    const validationError = validateInput();
    if (validationError && rawMessage === input) {
      toast.warning(validationError);
      return;
    }

    // Optimistic user bubble (skipped for roadmap with no text, since the
    // backend fills in a default prompt we don't know client-side yet).
    if (trimmed) {
      setMessages((prev) => [...prev, { role: "user", content: trimmed, timestamp: new Date().toISOString() }]);
    }
    setInput("");
    setSending(true);

    try {
      let data;
      if (mode === "chat") data = (await careerAssistantApi.chat(trimmed, activeConversationId)).data;
      else if (mode === "interview") data = (await careerAssistantApi.interview(trimmed, activeConversationId)).data;
      else if (mode === "roadmap") data = (await careerAssistantApi.roadmap(trimmed, activeConversationId)).data;
      else data = (await careerAssistantApi.learningPlan(trimmed, activeConversationId)).data;

      setActiveConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          suggestedActions: data.suggestedActions || [],
          roadmapSteps: data.roadmapSteps || [],
          timestamp: new Date().toISOString(),
        },
      ]);
      loadHistory(); // refresh sidebar order/title without a full page reload
    } catch (err) {
      toast.error(getErrorMessage(err));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't process that just now. Please try again in a moment.", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (sending) return;
    sendTurn(input);
  };

  const handleQuickPrompt = (prompt) => {
    if (sending) return;
    setMode("chat");
    sendTurn(prompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearConversation = async () => {
    if (activeConversationId) {
      try {
        await careerAssistantApi.deleteConversation(activeConversationId);
      } catch (err) {
        toast.error(getErrorMessage(err));
        return;
      }
    }
    startNewChat();
    loadHistory();
    toast.info("Conversation cleared.");
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteTarget === "all") {
        await careerAssistantApi.clearHistory();
        setHistory([]);
        toast.success("All conversations cleared.");
      } else if (deleteTarget) {
        await careerAssistantApi.deleteConversation(deleteTarget.id);
        setHistory((prev) => prev.filter((c) => c._id !== deleteTarget.id));
        toast.success("Conversation deleted.");
      }
      if (deleteTarget === "all" || deleteTarget?.id === activeConversationId) {
        startNewChat();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="card ai-glow ai-hero-glow" style={{ marginBottom: 20 }}>
        <PageHeader
          eyebrow={<><Sparkles size={12} /> Module 4</>}
          title="EduVerse AI Career Assistant"
          subtitle="Your personalized AI guide for career, skills and placement preparation."
          actions={<Link to="/practice" className="btn secondary">Take a scored mock test</Link>}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className="btn"
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  background: active ? "var(--gradient-accent)" : "var(--surface)",
                  color: active ? "var(--on-accent)" : "var(--ink-soft)",
                  borderColor: active ? "transparent" : "var(--border)",
                  boxShadow: active ? "var(--glow-accent)" : "none",
                }}
              >
                <Icon size={14} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="chat-shell">
        <aside className="chat-history-panel">
          <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
            <button className="btn brass" style={{ width: "100%" }} onClick={startNewChat}>
              <Plus size={15} />
              New chat
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {historyLoading ? (
              <div style={{ padding: 14, fontSize: 13, color: "var(--slate)" }}>Loading conversations…</div>
            ) : history.length === 0 ? (
              <div style={{ padding: 14, fontSize: 13, color: "var(--slate)" }}>No conversations yet.</div>
            ) : (
              history.map((c) => (
                <div key={c._id} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <button
                    className={`chat-history-item ${activeConversationId === c._id ? "active" : ""}`}
                    onClick={() => openConversation(c._id)}
                    style={{ paddingRight: 34 }}
                  >
                    {c.title}
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: c._id, title: c.title })}
                    aria-label={`Delete conversation: ${c.title}`}
                    style={{ position: "absolute", right: 8, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          {history.length > 0 && (
            <div style={{ padding: 10, borderTop: "1px solid var(--border)" }}>
              <button className="btn danger-outline" style={{ width: "100%", fontSize: 12.5 }} onClick={() => setDeleteTarget("all")}>
                <Trash2 size={13} />
                Clear all history
              </button>
            </div>
          )}
        </aside>

        <div className="chat-window">
          <div className="chat-messages">
            {messages.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Start a conversation with your AI Career Assistant"
                description="Ask a question, or try one of these:"
              />
            ) : (
              messages.map((m, i) => (
                <ChatMessage
                  key={i}
                  role={m.role}
                  content={m.content}
                  timestamp={m.timestamp}
                  suggestedActions={m.suggestedActions}
                  roadmapSteps={m.roadmapSteps}
                  onActionClick={(action) => {
                    setMode("chat");
                    sendTurn(action);
                  }}
                />
              ))
            )}
            {sending && <TypingIndicator />}

            {messages.length === 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {QUICK_PROMPTS.map((p) => (
                  <button key={p} type="button" className="quick-prompt-chip" onClick={() => handleQuickPrompt(p)}>
                    {p}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-row">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentMode.placeholder}
              disabled={sending}
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <button className="btn secondary" onClick={handleClearConversation} disabled={sending} title="Clear conversation">
              <Trash2 size={16} />
            </button>
            <button className="btn brass" onClick={handleSend} disabled={sending}>
              <Send size={15} />
              {sending ? "Thinking…" : "Send"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget === "all" ? "Clear all conversations?" : "Delete this conversation?"}
        description={
          deleteTarget === "all"
            ? "This will permanently delete all of your AI Career Assistant conversations."
            : `"${deleteTarget?.title}" will be permanently deleted.`
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </DashboardLayout>
  );
};

export default CareerAssistant;
