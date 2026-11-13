import api from "../api/axios.js";

/** Recruiter <-> placement cell chat. A thread is identified by the recruiter's id. */
const messagesApi = {
  listThreads: () => api.get("/messages/threads").then((r) => r.data),
  unread: () => api.get("/messages/unread").then((r) => r.data),
  getMessages: (recruiterId, before) => api.get(`/messages/threads/${recruiterId}/messages`, { params: before ? { before } : {} }).then((r) => r.data),
  send: (recruiterId, body) => api.post(`/messages/threads/${recruiterId}/messages`, { body }).then((r) => r.data),
  markRead: (recruiterId) => api.post(`/messages/threads/${recruiterId}/read`).then((r) => r.data),
};

/*
 * One shared live connection per tab (Server-Sent Events read with fetch, so the
 * JWT travels in the Authorization header rather than the URL). Subscribers get
 * { type: "open" | "message" | "read" | "notification", data }. "open" also fires after a reconnect,
 * so pages can refetch anything they missed while offline.
 */
const listeners = new Set();
let controller = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const emit = (event) => listeners.forEach((fn) => fn(event));

const connect = async (ctrl) => {
  let delay = 1000;
  while (!ctrl.signal.aborted) {
    try {
      const token = localStorage.getItem("eduverse_token");
      if (!token) return;
      const res = await fetch(`${api.defaults.baseURL}/notifications/stream`, { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal });
      if (res.status === 401 || res.status === 403) return; // not allowed: retrying would not help
      if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
      delay = 1000;
      emit({ type: "open" });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let end;
        while ((end = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const type = /^event: (.*)$/m.exec(frame)?.[1];
          const data = /^data: (.*)$/m.exec(frame)?.[1];
          if (type && data) emit({ type, data: JSON.parse(data) });
        }
      }
    } catch {
      /* network drop or abort: retry below unless aborted */
    }
    if (ctrl.signal.aborted) return;
    await sleep(delay);
    delay = Math.min(delay * 2, 30000);
  }
};

/** Subscribes to live chat and notification events; returns an unsubscribe function. */
export const subscribeLive = (fn) => {
  listeners.add(fn);
  if (!controller) {
    controller = new AbortController();
    connect(controller);
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size && controller) {
      controller.abort();
      controller = null;
    }
  };
};

export default messagesApi;
