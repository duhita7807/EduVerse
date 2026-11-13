import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  IdCard,
  Sparkles,
  MessageSquareText,
  Plug,
  SquarePen,
  LogOut,
  Menu,
  X,
  Users,
  FileCheck2,
  ShieldCheck,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  Building2,
  PlusCircle,
  BadgeCheck,
  FileText,
  Search,
  GraduationCap,
  UserCheck,
  Target,
  ListChecks,
  MessagesSquare,
  Bell,
} from "lucide-react";
import CommandPalette from "./CommandPalette.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import useReveal from "../hooks/useReveal.js";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import messagesApi, { subscribeLive } from "../services/messagesApi.js";
import notificationsApi, { NOTIFICATIONS_CHANGED } from "../services/notificationsApi.js";
import { assetUrl } from "../utils/assetUrl.js";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/my-profile", label: "My Profile", icon: UserRound },
  { to: "/digital-profile", label: "Digital Profile", icon: IdCard },
  { to: "/analytics", label: "AI Analytics", icon: Sparkles, ai: true },
  { to: "/career-assistant", label: "AI Career Assistant", icon: MessageSquareText, ai: true },
  { to: "/practice", label: "Interview & Test Prep", icon: Target, ai: true },
  { to: "/drives", label: "Placement Drives", icon: Briefcase },
  { to: "/applications", label: "My Applications", icon: ClipboardList },
  { to: "/resume", label: "Resume", icon: FileText },
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/edit-profile", label: "Edit Profile", icon: SquarePen },
];

const ADMIN_NAV_ITEMS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/certificates", label: "Certificate Review", icon: FileCheck2 },
  { to: "/admin/shortlisted", label: "Shortlisted Students", icon: ListChecks },
  { to: "/tpo", label: "Placement Overview", icon: Briefcase, end: true },
  { to: "/tpo/drives", label: "Drive Approvals", icon: BadgeCheck },
  { to: "/tpo/students", label: "Student Data", icon: GraduationCap },
  { to: "/tpo/student-approvals", label: "Student Approvals", icon: UserCheck },
  { to: "/tpo/recruiters", label: "Recruiters", icon: UserCheck },
  { to: "/messages", label: "Messages", icon: MessagesSquare, chat: true },
];

const TPO_NAV_ITEMS = [
  { to: "/tpo", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/tpo/drives", label: "Drives", icon: ClipboardCheck },
  { to: "/tpo/students", label: "Students", icon: GraduationCap },
  { to: "/tpo/student-approvals", label: "Student Approvals", icon: UserCheck },
  { to: "/tpo/recruiters", label: "Recruiters", icon: UserCheck },
  { to: "/messages", label: "Messages", icon: MessagesSquare, chat: true },
];

const RECRUITER_NAV_ITEMS = [
  { to: "/recruiter", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/recruiter/drives", label: "My Drives", icon: Building2, end: true },
  { to: "/recruiter/drives/new", label: "Post a Drive", icon: PlusCircle },
  { to: "/messages", label: "Messages", icon: MessagesSquare, chat: true },
];

const PORTAL_LABEL = { admin: "Admin console", tpo: "Placement cell", recruiter: "Recruiter portal" };

/**
 * Shared shell for every authenticated page.
 *  - a floating rail on the left: icons only until you point at it, then it
 *    opens over the page (it never pushes content around);
 *  - a top bar with where you are, a Ctrl/Cmd+K quick-jump, and your account;
 *  - under 960px the rail becomes a slide-in drawer.
 */
const DashboardLayout = ({ children }) => {
  const { student, logout, updateStudentInState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const mainRef = useRef(null);
  useReveal(mainRef, location.pathname);
  // On navigation: close the drawer and move focus to the new page for keyboard/screen-reader users.
  useEffect(() => {
    setMobileOpen(false);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const role = student?.role;
  const isStaff = role === "admin" || role === "tpo" || role === "recruiter";
  // Students and recruiters wait for TPO/admin approval; until then only the status screen shows.
  const approval = role === "student" ? student?.studentStatus || "approved" : role === "recruiter" ? student?.recruiterStatus || "approved" : "approved";
  const gated = approval !== "approved";
  const navItems = gated ? [] : { admin: ADMIN_NAV_ITEMS, tpo: TPO_NAV_ITEMS, recruiter: RECRUITER_NAV_ITEMS }[role] || NAV_ITEMS;

  // Unread chat badge, kept live by the shared message stream.
  const hasChat = !gated && ["recruiter", "tpo", "admin"].includes(role);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!hasChat) return undefined;
    const refresh = () => messagesApi.unread().then((r) => setUnread(r.data.count)).catch(() => {});
    refresh();
    return subscribeLive(({ type }) => ["open", "message", "read"].includes(type) && refresh());
  }, [hasChat]);

  // Notification bell: count stays live through the same stream.
  const [notifCount, setNotifCount] = useState(0);
  useEffect(() => {
    if (gated || !role) return undefined;
    const refresh = () => notificationsApi.unread().then((r) => setNotifCount(r.data.count)).catch(() => {});
    refresh();
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    const stop = subscribeLive(({ type }) => ["open", "notification"].includes(type) && refresh());
    return () => { stop(); window.removeEventListener(NOTIFICATIONS_CHANGED, refresh); };
  }, [gated, role]);

  const [checking, setChecking] = useState(false);
  const checkStatus = async () => {
    setChecking(true);
    try {
      const { data } = await api.get("/auth/me");
      updateStudentInState(data.student);
    } finally {
      setChecking(false);
    }
  };

  // The most specific nav entry that matches the current URL names the page in the top bar.
  const here = [...navItems]
    .sort((a, b) => b.to.length - a.to.length)
    .find((i) => location.pathname === i.to || location.pathname.startsWith(`${i.to}/`));

  const initials = (student?.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">Skip to main content</a>
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`rail ${mobileOpen ? "rail-open" : ""}`} aria-label="Main navigation">
        <div className="rail-head">
          <NavLink to="/" className="rail-brand" aria-label="EduVerse home">
            <span className="logo-mark" />
            <span className="rail-label rail-wordmark">EduVerse</span>
          </NavLink>
          <button className="icon-btn mobile-only" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="rail-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} title={item.label} className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
                <Icon size={18} strokeWidth={1.9} />
                <span className="rail-label">{item.label}</span>
                {item.ai && <Sparkles size={11} className="nav-item-sparkle rail-label" />}
                {item.chat && unread > 0 && <span className="nav-badge" aria-label={`${unread} unread messages`}>{unread > 99 ? "99+" : unread}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="rail-foot">
          <button className="nav-item" onClick={handleLogout} title="Log out">
            <LogOut size={18} strokeWidth={1.9} />
            <span className="rail-label">Log out</span>
          </button>
        </div>
      </aside>

      <div className="stage">
        <header className="topbar">
          <button className="icon-btn mobile-only" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div className="topbar-where">
            <span className="topbar-portal">
              {isStaff ? <ShieldCheck size={13} /> : <span className="ai-dot" aria-hidden="true" />}
              {PORTAL_LABEL[role] || "Career intelligence"}
            </span>
            {here && <span className="topbar-page">{here.label}</span>}
          </div>

          <button className="topbar-search" onClick={() => setPaletteOpen(true)} aria-label="Open quick jump">
            <Search size={14} />
            <span>Jump to…</span>
            <kbd>{isMac ? "⌘" : "Ctrl"} K</kbd>
          </button>

          {!gated && (
            <NavLink to="/notifications" className="icon-btn notif-bell" aria-label={notifCount ? `Notifications, ${notifCount} unread` : "Notifications"} title="Notifications">
              <Bell size={17} />
              {notifCount > 0 && <span className="notif-count">{notifCount > 99 ? "99+" : notifCount}</span>}
            </NavLink>
          )}
          <ThemeToggle />
          <div className="topbar-user" title={student?.email}>
            <div className="avatar-gradient" style={{ width: 34, height: 34, fontSize: 13 }}>
              {student?.profilePhoto ? (
                <img src={assetUrl(student.profilePhoto)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              ) : (
                initials
              )}
            </div>
            <span className="topbar-name">{student?.name}</span>
          </div>
        </header>

        <main id="main" ref={mainRef} tabIndex={-1} className="dashboard-main">
          <div className="page-fade" style={{ maxWidth: 1080, margin: "0 auto" }}>
            {gated ? (
              <div className="card approval-card" role="status">
                <span className={`badge ${approval === "rejected" ? "danger" : "warning"}`}>{approval === "rejected" ? "Not approved" : "Pending approval"}</span>
                <h2>{approval === "rejected" ? "Your account was not approved" : "Your account is awaiting approval"}</h2>
                <p>
                  {approval === "rejected"
                    ? "The placement cell did not approve this account. Please contact your TPO if you think this is a mistake."
                    : role === "student"
                    ? "The placement cell (Admin/TPO) is verifying your registration. Once approved you can complete your profile, see placement drives and use the AI tools."
                    : "The placement cell is reviewing your account. You'll get access to recruiter features once it's approved."}
                </p>
                {approval === "pending" && (
                  <button className="btn brass" onClick={checkStatus} disabled={checking}>{checking ? "Checking…" : "Check approval status"}</button>
                )}
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>

      {paletteOpen && <CommandPalette items={navItems} onClose={() => setPaletteOpen(false)} onLogout={handleLogout} />}
    </div>
  );
};

export default DashboardLayout;
