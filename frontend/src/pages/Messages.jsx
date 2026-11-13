import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Building2, ShieldCheck, Search, Loader2, Check, CheckCheck } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import messagesApi, { subscribeLive } from "../services/messagesApi.js";
import { getErrorMessage } from "../utils/apiError.js";
import { fmtDateTime } from "../utils/format.js";

const MAX = 2000;
const STAFF = ["tpo", "admin"];
const byId = (list, m) => (list.some((x) => x._id === m._id) ? list : [...list, m]);

/** Real-time chat between recruiters and the placement cell (TPO and admin share one inbox). */
const Messages = () => {
  const { student } = useAuth();
  const toast = useToast();
  const staff = STAFF.includes(student?.role);
  const myId = student?._id;
  const [params, setParams] = useSearchParams();

  const [threads, setThreads] = useState([]);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(staff ? params.get("with") || "" : myId);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [otherReadAt, setOtherReadAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [olderLoading, setOlderLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const activeRef = useRef(activeId);
  activeRef.current = activeId;

  const isOwn = (m) => (staff ? STAFF.includes(m.senderRole) : m.senderRole === "recruiter");
  const fromOtherSide = (m) => !isOwn(m);

  const scrollToEnd = () => requestAnimationFrame(() => listRef.current && (listRef.current.scrollTop = listRef.current.scrollHeight));
  const nearEnd = () => {
    const el = listRef.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const loadThreads = useCallback(async () => {
    if (!staff) return;
    try {
      const { data } = await messagesApi.listThreads();
      setThreads(data);
      setActiveId((cur) => cur || data[0]?.recruiter._id || "");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [staff, toast]);

  const markRead = useCallback((id) => {
    if (!id || document.visibilityState !== "visible") return;
    messagesApi.markRead(id).catch(() => {});
    setThreads((list) => list.map((t) => (t.recruiter._id === id ? { ...t, unread: 0 } : t)));
  }, []);

  const loadMessages = useCallback(async (id) => {
    if (!id) return setLoading(false);
    setLoading(true);
    try {
      const { data } = await messagesApi.getMessages(id);
      if (activeRef.current !== id) return;
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setOtherReadAt(staff ? data.recruiterReadAt : data.staffReadAt);
      markRead(id);
      scrollToEnd();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [staff, markRead, toast]);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => { loadMessages(activeId); }, [activeId, loadMessages]);

  // Live updates.
  useEffect(() => subscribeLive(({ type, data }) => {
    if (type === "open") { // first connect or reconnect: catch up on anything missed
      loadThreads();
      if (activeRef.current) messagesApi.getMessages(activeRef.current).then(({ data: d }) => { setMessages(d.messages); setHasMore(d.hasMore); }).catch(() => {});
      return;
    }
    if (type === "message") {
      const { recruiterId, message } = data;
      const open = recruiterId === activeRef.current;
      if (open) {
        const stick = nearEnd();
        setMessages((list) => byId(list, message));
        if (stick || isOwn(message)) scrollToEnd();
        if (fromOtherSide(message)) markRead(recruiterId);
      }
      setThreads((list) => {
        const next = list.map((t) => (t.recruiter._id === recruiterId
          ? { ...t, lastMessage: message.body.slice(0, 140), lastMessageAt: message.createdAt, unread: !open && fromOtherSide(message) ? t.unread + 1 : t.unread }
          : t));
        return next.sort((a, b) => +new Date(b.lastMessageAt || 0) - +new Date(a.lastMessageAt || 0));
      });
    }
    if (type === "read" && data.recruiterId === activeRef.current) {
      const otherSide = staff ? "recruiter" : "staff";
      if (data.side === otherSide) setOtherReadAt(data.at);
    }
    if (type === "read" && staff && data.side === "staff") setThreads((list) => list.map((t) => (t.recruiter._id === data.recruiterId ? { ...t, unread: 0 } : t)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [staff, loadThreads, markRead]);

  // Coming back to the tab counts as reading the open conversation.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && markRead(activeRef.current);
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  const openThread = (id) => {
    if (id === activeId) return;
    setMessages([]);
    setActiveId(id);
    setParams({ with: id }, { replace: true });
  };

  const loadOlder = async () => {
    if (!messages.length) return;
    setOlderLoading(true);
    const el = listRef.current;
    const before = el ? el.scrollHeight : 0;
    try {
      const { data } = await messagesApi.getMessages(activeId, messages[0].createdAt);
      setMessages((list) => [...data.messages, ...list]);
      setHasMore(data.hasMore);
      requestAnimationFrame(() => el && (el.scrollTop = el.scrollHeight - before)); // keep the reader's place
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setOlderLoading(false);
    }
  };

  const send = async (e) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending || !activeId) return;
    setSending(true);
    try {
      const { data } = await messagesApi.send(activeId, body);
      setMessages((list) => byId(list, data));
      setDraft("");
      scrollToEnd();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const active = staff ? threads.find((t) => t.recruiter._id === activeId) : null;
  const title = staff ? active ? `${active.recruiter.name}${active.recruiter.organization ? ` · ${active.recruiter.organization}` : ""}` : "" : "Placement Cell (TPO & Admin)";
  const lastOwn = [...messages].reverse().find(isOwn);
  const seen = lastOwn && otherReadAt && new Date(otherReadAt) >= new Date(lastOwn.createdAt);
  const q = search.trim().toLowerCase();
  const shown = threads.filter((t) => !q || `${t.recruiter.name} ${t.recruiter.organization} ${t.recruiter.email}`.toLowerCase().includes(q));

  return (
    <DashboardLayout>
      <PageHeader
        title="Messages"
        subtitle={staff ? "Chat with recruiters in real time. TPO and admin share this inbox." : "Chat with the placement cell (TPO and admin) in real time."}
      />
      <div className="chat-shell">
        {staff && (
          <aside className="chat-history-panel" aria-label="Recruiter conversations">
            <div className="msg-search">
              <Search size={14} aria-hidden="true" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recruiters" aria-label="Search recruiters" />
            </div>
            {shown.length === 0 && <p className="muted-p" style={{ padding: 12 }}>{threads.length ? "No recruiter matches." : "No approved recruiters yet."}</p>}
            {shown.map((t) => (
              <button key={t.recruiter._id} type="button" className={`chat-history-item msg-thread ${t.recruiter._id === activeId ? "active" : ""}`} onClick={() => openThread(t.recruiter._id)}>
                <span className="msg-thread-top">
                  <b>{t.recruiter.name}</b>
                  {t.unread > 0 && <span className="msg-unread" aria-label={`${t.unread} unread`}>{t.unread}</span>}
                </span>
                <span className="msg-thread-org">{t.recruiter.organization || t.recruiter.email}</span>
                <span className="msg-thread-last">{t.lastMessage || "No messages yet"}</span>
              </button>
            ))}
          </aside>
        )}

        <section className="chat-window" aria-label="Conversation">
          {!activeId ? (
            <EmptyState icon={Building2} title="Select a recruiter" description="Pick a conversation on the left to start chatting." />
          ) : (
            <>
              <div className="msg-head">
                {staff ? <Building2 size={16} /> : <ShieldCheck size={16} />}
                <b>{title}</b>
              </div>
              <div className="chat-messages" ref={listRef} aria-live="polite">
                {hasMore && (
                  <button type="button" className="btn secondary" style={{ alignSelf: "center" }} onClick={loadOlder} disabled={olderLoading}>
                    {olderLoading ? "Loading…" : "Load earlier messages"}
                  </button>
                )}
                {loading ? (
                  <p className="muted-p" style={{ textAlign: "center" }}><Loader2 size={14} className="spin" /> Loading messages…</p>
                ) : messages.length === 0 ? (
                  <EmptyState title="No messages yet" description={staff ? "Send the first message to this recruiter." : "Ask the placement cell anything about your drives."} />
                ) : (
                  messages.map((m) => {
                    const own = isOwn(m);
                    return (
                      <div key={m._id} className={`chat-bubble-row ${own ? "user" : ""}`}>
                        <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: own ? "flex-end" : "flex-start" }}>
                          <div className={`chat-bubble ${own ? "user" : "assistant"}`} style={{ maxWidth: "100%" }}>{m.body}</div>
                          <span className="chat-timestamp">
                            {m.senderRole === "recruiter" ? (own ? "You" : m.sender?.name) : `${own && m.sender?._id === myId ? "You" : m.sender?.name || "Placement cell"} · ${m.senderRole === "admin" ? "Admin" : "TPO"}`}
                            {" · "}{fmtDateTime(m.createdAt)}
                            {m === lastOwn && (seen ? <span className="msg-seen"> · <CheckCheck size={12} /> Seen</span> : <span> · <Check size={12} /> Sent</span>)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form className="chat-input-row" onSubmit={send}>
                <textarea
                  rows={2}
                  value={draft}
                  maxLength={MAX}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) send(e); }}
                  placeholder="Type a message. Enter to send, Shift+Enter for a new line"
                  aria-label="Message"
                />
                <button type="submit" className="btn brass" disabled={sending || !draft.trim()} aria-label="Send message">
                  {sending ? <Loader2 size={15} className="spin" /> : <Send size={15} />}Send
                </button>
              </form>
              {draft.length > MAX - 200 && <p className="muted-p" style={{ textAlign: "right", padding: "0 14px 8px" }}>{draft.length} / {MAX}</p>}
            </>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
