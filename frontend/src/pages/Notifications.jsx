import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, UserCheck, Briefcase, Trophy, ListChecks, FileCheck2 } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useToast } from "../context/ToastContext.jsx";
import notificationsApi, { notificationsChanged } from "../services/notificationsApi.js";
import { subscribeLive } from "../services/messagesApi.js";
import { getErrorMessage } from "../utils/apiError.js";
import { fmtDateTime } from "../utils/format.js";

const ICON = { account: UserCheck, drive: Briefcase, result: Trophy, shortlist: ListChecks, certificate: FileCheck2 };

/** Every role's notification list: newest first, live, with read state. */
const Notifications = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await notificationsApi.list({ unread: onlyUnread });
      setItems(data.notifications);
      setHasMore(data.hasMore);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [onlyUnread, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeLive(({ type, data }) => {
    if (type === "notification") setItems((list) => (list.some((n) => n._id === data._id) ? list : [data, ...list]));
    if (type === "open") load();
  }), [load]);

  const loadMore = async () => {
    try {
      const { data } = await notificationsApi.list({ unread: onlyUnread, before: items[items.length - 1].createdAt });
      setItems((list) => [...list, ...data.notifications]);
      setHasMore(data.hasMore);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const open = async (n) => {
    if (!n.readAt) {
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x)));
      notificationsApi.markRead(n._id).then(notificationsChanged).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    try {
      await notificationsApi.markAllRead();
      notificationsChanged();
      if (onlyUnread) setItems([]);
      else setItems((list) => list.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <DashboardLayout>
      <PageHeader
        title="Notifications"
        subtitle="Approvals, drives, shortlists, results and certificate reviews, as they happen."
        actions={<button className="btn secondary" onClick={readAll} disabled={!unread}><CheckCheck size={15} />Mark all as read</button>}
      />
      <div className="pr-levels" role="tablist" aria-label="Filter" style={{ marginBottom: 14 }}>
        {[["All", false], ["Unread", true]].map(([label, value]) => (
          <button key={label} type="button" role="tab" aria-selected={onlyUnread === value} className={`pr-level ${onlyUnread === value ? "on" : ""}`} style={{ border: 0 }} onClick={() => { setLoading(true); setOnlyUnread(value); }}>
            {label}
          </button>
        ))}
      </div>
      <section className="card" style={{ padding: 0 }} aria-live="polite">
        {loading ? (
          <p className="muted-p" style={{ padding: 18 }}>Loading notifications…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={Bell} title={onlyUnread ? "You're all caught up" : "No notifications yet"} description="You'll be notified here about approvals, drives, results and reviews." />
        ) : (
          <ul className="notif-list">
            {items.map((n) => {
              const Icon = ICON[n.type] || Bell;
              return (
                <li key={n._id}>
                  <button type="button" className={`notif-item ${n.readAt ? "" : "unread"}`} onClick={() => open(n)}>
                    <span className="notif-icon"><Icon size={16} /></span>
                    <span className="notif-text">
                      <b>{n.title}</b>
                      {n.body && <span>{n.body}</span>}
                      <time dateTime={n.createdAt}>{fmtDateTime(n.createdAt)}</time>
                    </span>
                    {!n.readAt && <span className="notif-dot" aria-label="Unread" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {hasMore && <button className="btn secondary" style={{ marginTop: 12 }} onClick={loadMore}>Load older notifications</button>}
    </DashboardLayout>
  );
};

export default Notifications;
