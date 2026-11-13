import React, { useCallback, useEffect, useState } from "react";
import useLiveRefresh from "../hooks/useLiveRefresh.js";
import { Link } from "react-router-dom";
import {
  UserCog,
  IdCard,
  Sparkles,
  Target,
  MessageSquareText,
  Code2,
  FolderGit2,
  GitBranch,
  Briefcase,
  ClipboardList,
  Trophy,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import OrbitGauge from "../components/OrbitGauge.jsx";
import DownloadResumeButton from "../components/DownloadResumeButton.jsx";
import { SkeletonCard } from "../components/LoadingSkeleton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import analyticsApi from "../services/analyticsApi.js";
import { studentPlacementApi } from "../services/placementApi.js";

/** One readout in the instrument row: big tabular number, small label, whole tile is a link. */
const Readout = ({ icon: Icon, value, label, to }) => (
  <Link to={to} className="card readout">
    <div className="readout-top">
      <Icon size={16} />
      <ArrowUpRight size={14} className="readout-arrow" />
    </div>
    <div className="readout-value mono">{value}</div>
    <div className="readout-label">{label}</div>
  </Link>
);

/** Picks the single most useful thing to do next, from real profile / placement state. */
const nextStep = ({ completion, readiness, placement }) => {
  const pct = completion.profileCompletion ?? 0;
  if (placement?.latestSelection) return { title: `Selected by ${placement.latestSelection.company}`, body: `You've been picked for ${placement.latestSelection.title}. The placement cell will share the next steps.`, to: "/applications", cta: "See result" };
  if (pct < 100) return { title: "Finish your profile", body: `It's ${pct}% complete. Drives with a CGPA or branch rule can only match you once the details are in.`, to: "/edit-profile", cta: "Complete profile" };
  if (!readiness) return { title: "Run your first analysis", body: "Get a readiness score and a list of the skills holding you back.", to: "/analytics", cta: "Run AI analysis" };
  if (placement?.openDrives > 0) return { title: `${placement.openDrives} drive${placement.openDrives === 1 ? "" : "s"} open for you`, body: "These match your branch, year and CGPA. Apply before the deadline closes.", to: "/drives", cta: "View drives" };
  return { title: "Sharpen your weakest area", body: readiness.weaknesses?.[0] ? `Focus area: ${readiness.weaknesses[0].toLowerCase()}.` : "Ask the career assistant what to learn next.", to: "/career-assistant", cta: "Ask the assistant" };
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

const Dashboard = () => {
  const { student } = useAuth();
  const [completion, setCompletion] = useState({ profileCompletion: student?.profileCompletion || 0, sections: {} });
  const [readiness, setReadiness] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [completionRes, readinessRes, placementRes] = await Promise.allSettled([
        api.get("/profile/completion"),
        analyticsApi.getReadiness(),
        studentPlacementApi.summary(),
      ]);
      if (placementRes.status === "fulfilled") setPlacement(placementRes.value.data);
      if (completionRes.status === "fulfilled") setCompletion(completionRes.value.data);
      if (readinessRes.status === "fulfilled") setReadiness(readinessRes.value.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load); // profile edits / returning to the tab refresh the numbers

  const skillCount = [
    ...(student?.skills?.programmingLanguages || []),
    ...(student?.skills?.webTechnologies || []),
    ...(student?.skills?.databases || []),
    ...(student?.skills?.tools || []),
  ].length;

  const firstName = student?.name?.split(" ")[0] || "there";
  const profilePct = completion.profileCompletion ?? 0;
  const readinessPct = readiness?.overallScore ?? 0;
  const applied = placement?.applied ?? 0;
  const drivePct = applied + (placement?.openDrives ?? 0) > 0 ? Math.round((applied / (applied + placement.openDrives)) * 100) : 0;
  const step = nextStep({ completion, readiness, placement });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="bento">
          <div className="b-8"><SkeletonCard lines={5} /></div>
          <div className="b-4"><SkeletonCard lines={4} /></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bento">
        {/* Hero instrument */}
        <section className="card hero b-8">
          <div className="hero-copy">
            <p className="hero-kicker">{greeting()}</p>
            <h1 className="hero-title">{firstName}, here's where you stand.</h1>
            <p className="hero-sub">
              {readiness
                ? <>You're rated <strong>{readiness.category}</strong> for placements. {readiness.weaknesses?.[0] ? `Biggest gap: ${readiness.weaknesses[0].toLowerCase()}.` : ""}</>
                : "Run an AI analysis to see how placement-ready your profile is."}
            </p>
            <div className="hero-actions">
              <Link to="/analytics" className="btn brass"><Sparkles size={15} />Run AI analysis</Link>
              <DownloadResumeButton variant="secondary" label="Download resume (PDF)" />
            </div>
            <ul className="legend">
              <li><i style={{ background: "var(--aurum)" }} />Profile <b className="mono">{profilePct}%</b></li>
              <li><i style={{ background: "var(--ion)" }} />Readiness <b className="mono">{readiness ? readinessPct : "—"}</b></li>
              <li><i style={{ background: "var(--muted)" }} />Drives applied <b className="mono">{applied}</b></li>
            </ul>
          </div>
          <OrbitGauge
            rings={[
              { label: "Profile", value: profilePct, color: "var(--primary)" },
              { label: "Readiness", value: readinessPct, color: "var(--ai)" },
              { label: "Drives applied", value: drivePct, color: "var(--muted)" },
            ]}
            centerValue={readiness ? readinessPct : `${profilePct}%`}
            centerCaption={readiness ? "readiness" : "profile"}
          />
        </section>

        {/* Next step */}
        <section className="card ai-glow b-4 nextstep">
          <div className="nextstep-tag"><span className="ai-dot" aria-hidden="true" />Next step</div>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
          <Link to={step.to} className="btn brass">{step.cta}<ArrowUpRight size={15} /></Link>
        </section>

        {/* Readouts */}
        <Readout icon={Code2} value={skillCount} label="Skills logged" to="/edit-profile" />
        <Readout icon={FolderGit2} value={student?.projects?.length || 0} label="Projects" to="/digital-profile" />
        <Readout icon={GitBranch} value={student?.githubData?.publicRepos ?? "—"} label={student?.githubUsername ? "GitHub repos" : "Connect GitHub"} to="/integrations" />
        <Readout icon={IdCard} value={student?.certifications?.length || 0} label="Certifications" to="/digital-profile" />

        {/* Placements */}
        <section className="card b-7">
          <div className="card-head"><h3><Briefcase size={16} />Placements</h3><Link to="/drives" className="link-quiet">All drives <ArrowUpRight size={13} /></Link></div>
          {placement ? (
            <>
              <div className="trio">
                <div><div className="trio-n mono">{placement.openDrives}</div><div className="trio-l">Open for you</div></div>
                <div><div className="trio-n mono">{placement.inProgress}</div><div className="trio-l">In progress</div></div>
                <div><div className="trio-n mono">{placement.selected}</div><div className="trio-l">Selected</div></div>
              </div>
              <div className="hero-actions">
                <Link to="/drives" className="btn brass"><Briefcase size={15} />Browse drives</Link>
                <Link to="/applications" className="btn secondary"><ClipboardList size={15} />My applications</Link>
              </div>
            </>
          ) : (
            <p className="muted-p">Drives show up here once your placement cell publishes them.</p>
          )}
        </section>

        {/* Quick actions */}
        <section className="card b-5">
          <div className="card-head"><h3><Sparkles size={16} />Jump in</h3></div>
          <div className="jump">
            <Link to="/edit-profile"><UserCog size={16} />Edit profile</Link>
            <Link to="/resume"><FileText size={16} />Customize resume</Link>
            <Link to="/digital-profile"><IdCard size={16} />Digital profile</Link>
            <Link to="/analytics"><Target size={16} />Skill gap analysis</Link>
            <Link to="/career-assistant"><MessageSquareText size={16} />Career assistant</Link>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
