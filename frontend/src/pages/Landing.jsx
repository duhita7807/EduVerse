import React, { useEffect, useRef, useState } from "react";
import useReveal from "../hooks/useReveal.js";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, FileText, MessageSquareText, Target, Building2, ShieldCheck, GraduationCap, Check } from "lucide-react";
import OrbitGauge from "../components/OrbitGauge.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

// Events cycled in the hero feed: they walk through one drive from start to finish.
const FEED = [
  { who: "Acme Tech", what: "posted a drive for SDE Intern", tag: "Recruiter" },
  { who: "Placement cell", what: "verified it and opened it to 142 eligible students", tag: "TPO" },
  { who: "Aarav Sharma", what: "applied, CGPA 8.4 meets the 7.5 cut-off", tag: "Student" },
  { who: "Acme Tech", what: "finished interviews and sent results", tag: "Recruiter" },
  { who: "Placement cell", what: "finalized 6 selections and published results", tag: "TPO" },
];

const STEPS = [
  { icon: Building2, who: "Recruiter", title: "Posts the drive", body: "Company, role, CGPA and branch rules, rounds and a deadline." },
  { icon: ShieldCheck, who: "Placement cell", title: "Verifies it", body: "Checks the details, tunes eligibility, approves or sends it back." },
  { icon: GraduationCap, who: "Students", title: "See it and apply", body: "Only drives you qualify for appear. One tap to apply." },
  { icon: Building2, who: "Recruiter", title: "Runs the rounds", body: "Records every test and interview, then recommends who to pick." },
  { icon: ShieldCheck, who: "Placement cell", title: "Finalizes", body: "Confirms the selection. Each student sees their own result." },
];

const Landing = () => {
  const rootRef = useRef(null);
  useReveal(rootRef, "landing");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 2600);
    return () => clearInterval(id);
  }, []);
  const active = tick % FEED.length;

  return (
    <div className="land page-fade" ref={rootRef}>
      <header className="land-nav">
        <div className="land-brand"><span className="logo-mark" /><span>EduVerse</span></div>
        <nav>
          <ThemeToggle />
          <Link to="/login" className="btn secondary">Log in</Link>
          <Link to="/register" className="btn brass">Create account</Link>
        </nav>
      </header>

      <section className="land-hero">
        <div className="land-copy">
          <p className="land-kicker"><span className="ai-dot" aria-hidden="true" />Placement platform for campuses</p>
          <h1>
            From first project
            <br />
            to <span className="gradient-text">offer letter</span>,
            <br />
            on one record.
          </h1>
          <p className="land-lede">
            Students build a verified profile. Recruiters post drives. The placement cell checks every
            step. EduVerse keeps all three in sync, and tells each student what's still missing before a recruiter looks.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn brass big">Build your profile<ArrowRight size={16} /></Link>
            <Link to="/register-recruiter" className="btn secondary big">I'm hiring</Link>
          </div>
        </div>

        <div className="land-stage">
          <div className="card ai-glow land-gauge">
            <div className="ai-scanline loop" aria-hidden="true" />
            <OrbitGauge
              rings={[
                { label: "Profile", value: 92, color: "var(--primary)" },
                { label: "Readiness", value: 76, color: "var(--ai)" },
                { label: "Drives applied", value: 58, color: "var(--muted)" },
              ]}
              centerValue="76"
              centerCaption="readiness"
            />
            <ul className="legend">
              <li><i style={{ background: "var(--aurum)" }} />Profile</li>
              <li><i style={{ background: "var(--ion)" }} />Readiness</li>
              <li><i style={{ background: "var(--muted)" }} />Drives applied</li>
            </ul>
          </div>

          <div className="card land-feed" aria-live="off">
            <div className="land-feed-head"><span className="ai-dot" aria-hidden="true" />One drive, live</div>
            {FEED.map((e, i) => (
              <div key={e.who + i} className={`feed-row ${i === active ? "on" : i < active ? "past" : ""}`}>
                <span className="feed-tag">{e.tag}</span>
                <span><strong>{e.who}</strong> {e.what}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="land-section">
        <h2>How a drive moves</h2>
        <p className="land-sub">Five hand-offs, each one visible to the people who need to act on it.</p>
        <ol className="steps">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="card step">
                <span className="step-n mono">{i + 1}</span>
                <Icon size={18} />
                <div className="step-who">{s.who}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="land-section">
        <div className="duo">
          <div className="card duo-main">
            <Target size={20} />
            <h3>A readiness score you can act on</h3>
            <p>Skills, projects and coding activity are scored against the roles you're aiming for, then turned into a short list of what to learn next.</p>
            <ul className="ticks">
              <li><Check size={14} />Skill gap analysis per target role</li>
              <li><Check size={14} />Certificates verified by the placement cell</li>
              <li><Check size={14} />GitHub and coding profiles pulled in live</li>
            </ul>
          </div>
          <div className="duo-side">
            <div className="card"><FileText size={20} /><h3>Resume in one click</h3><p>Built from your profile and saved as a clean PDF.</p></div>
            <div className="card"><MessageSquareText size={20} /><h3>Career assistant</h3><p>Ask what to learn, what to fix, how to prepare for a round.</p></div>
          </div>
        </div>
      </section>

      <footer className="land-foot">
        <span>EduVerse</span>
        <span>Training &amp; Placement Cell</span>
      </footer>
    </div>
  );
};

export default Landing;
