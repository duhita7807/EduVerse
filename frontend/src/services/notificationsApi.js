import api from "../api/axios.js";

/** Fired after the user reads notifications, so the top-bar bell can refresh its count. */
export const NOTIFICATIONS_CHANGED = "eduverse:notifications-changed";
export const notificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

const notificationsApi = {
  list: ({ unread, before } = {}) => api.get("/notifications", { params: { ...(unread && { unread: 1 }), ...(before && { before }) } }).then((r) => r.data),
  unread: () => api.get("/notifications/unread").then((r) => r.data),
  markRead: (id) => api.post(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post("/notifications/read-all").then((r) => r.data),
};

export default notificationsApi;
