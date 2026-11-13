import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import SectionCard from "../components/SectionCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../utils/apiError.js";
import analyticsApi from "../services/analyticsApi.js";
import useLiveRefresh from "../hooks/useLiveRefresh.js";

import ReadinessScore from "../components/analytics/ReadinessScore.jsx";
import ScoreBreakdown from "../components/analytics/ScoreBreakdown.jsx";
import StrengthsCard from "../components/analytics/StrengthsCard.jsx";
import SkillGapCard from "../components/analytics/SkillGapCard.jsx";
import CareerInsightCard from "../components/analytics/CareerInsightCard.jsx";
import LearningRoadmap from "../components/analytics/LearningRoadmap.jsx";
import ProjectRecommendation from "../components/analytics/ProjectRecommendation.jsx";
import AIInsightCard from "../components/analytics/AIInsightCard.jsx";

const AIAnalytics = () => {
  const { student } = useAuth();

  // Populated from GET /analytics/career-roles once the student's branch is
  // known server-side — previously this was a hardcoded, CS-only list, so
  // every student (regardless of branch) saw the same 9 software roles with
  // "Full Stack Developer" pre-selected by default.
  const [recommendedRoles, setRecommendedRoles] = useState([]);
  const [branchGroup, setBranchGroup] = useState(null);
  const [roleGroups, setRoleGroups] = useState([]);
  const [targetRole, setTargetRole] = useState("");
  const [readiness, setReadiness] = useState(null);
  const [careerInsights, setCareerInsights] = useState([]);
  const [skillGap, setSkillGap] = useState(null);
  const [learningRoadmap, setLearningRoadmap] = useState([]);
  const [projectRecs, setProjectRecs] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [aiOutdated, setAiOutdated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);
  const [previousScores, setPreviousScores] = useState(null);
  const lastScores = useRef(null);
  // Role the saved AI insights were written for, and whether the student picked a role this visit.
  const [aiRole, setAiRole] = useState("");
  const pickedRole = useRef(false);
  const roleRef = useRef("");
  roleRef.current = targetRole;

  // Live from the server (computed from current MongoDB data), never the cached login copy.
  const completion = readiness?.profileCompleteness ?? student?.profileCompletion ?? 0;
  const hasEnoughData = !readiness?.lowDataWarning;

  /** Scores + rule-based sections recalculated from the student's current data. */
  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const [readinessRes, cachedRes] = await Promise.all([analyticsApi.getReadiness(), analyticsApi.getCachedAnalysis()]);
      const next = readinessRes.data;
      // Remember what changed so the breakdown can mark it for a few seconds.
      if (lastScores.current && JSON.stringify(lastScores.current) !== JSON.stringify(next.componentScores)) {
        setPreviousScores(lastScores.current);
        setTimeout(() => setPreviousScores(null), 6000);
      }
      lastScores.current = next.componentScores;
      setReadiness(next);

      const cached = cachedRes.data;
      if (cached) {
        // A re-sync must not undo the role the student just picked.
        if (cached.targetRole && !pickedRole.current) setTargetRole(cached.targetRole);
        setAiRole(cached.targetRole || "");
        if (cached.careerInsights?.length) setCareerInsights(cached.careerInsights);
        setAiInsights(cached.aiSummary ? { summary: cached.aiSummary, ...cached.aiInsights } : null);
        setAiOutdated(Boolean(cached.aiOutdated));
        setLastUpdated(cached.updatedAt);
      }
      setSyncedAt(new Date());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  }, []);

  useLiveRefresh(sync);

  // On first load: show the (cheap, non-AI) readiness score immediately,
  // and load any previously cached full analysis so we don't force a
  // fresh AI call just to open the page (spec section 21).
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const rolesRes = await analyticsApi.getCareerRoles();
        const recommended = rolesRes.data.recommendedRoles || [];
        setRecommendedRoles(recommended);
        setBranchGroup(rolesRes.data.branchGroup);
        setRoleGroups(rolesRes.data.roleGroups || []);

        // Career insights are already branch-scoped server-side (see
        // skillGapService.getCareerInsights), so the top entry here is a
        // sensible branch-appropriate default — fall back to the first
        // recommended role for the branch if insights come back empty
        // (e.g. a brand-new profile with no skills entered yet).
        const insightsRes = await analyticsApi.getCareerInsights();
        const insights = insightsRes.data.careerInsights || [];
        setCareerInsights(insights);
        setTargetRole(insights[0]?.career || recommended[0] || rolesRes.data.allRoles?.[0] || "");

        await sync();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoadingInitial(false);
      }
    };
    bootstrap();
  }, [sync]);

  // Role-specific sections are cheap (no AI): refresh them whenever the role changes.
  useEffect(() => {
    if (!targetRole) return;
    let live = true;
    Promise.all([analyticsApi.getSkillGap(targetRole), analyticsApi.getLearningRecommendations(targetRole)])
      .then(([gap, learning]) => {
        if (!live || roleRef.current !== targetRole) return;
        setSkillGap(gap.data);
        setLearningRoadmap(learning.data.roadmap || []);
        setProjectRecs(learning.data.projectRecommendations || []);
      })
      .catch((err) => live && setError(getErrorMessage(err)));
    return () => { live = false; };
  }, [targetRole]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError("");
    try {
      const { data } = await analyticsApi.runFullAnalysis(targetRole);
      setReadiness(data.readiness);
      setSkillGap(data.skillGap);
      setCareerInsights(data.careerInsights || []);
      setLearningRoadmap(data.learningRecommendations || []);
      setProjectRecs(data.projectRecommendations || []);
      setAiInsights(data.aiInsights);
      setAiRole(targetRole);
      setLastUpdated(data.updatedAt);
      setAiOutdated(false);
      lastScores.current = data.readiness.componentScores;
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  };

  if (loadingInitial) {
    return (
      <DashboardLayout>
        <p className="mono" style={{ color: "var(--slate)" }}>Loading analytics…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <span className="badge"><Sparkles size={12} />AI Analytics</span>
          <h1 className="ph-title" style={{ fontSize: 26, margin: "10px 0 6px" }}>Placement readiness & career insights</h1>
          <div className="live-status" aria-live="polite">
            <span className={`live-dot ${syncing ? "busy" : ""}`} aria-hidden="true" />
            {syncing ? "Syncing with your profile…" : syncedAt ? `Scores synced with your profile at ${syncedAt.toLocaleTimeString()}` : "Scores calculated from your profile"}
            <button type="button" className="link-quiet live-sync-btn" onClick={sync} disabled={syncing}>
              <RefreshCw size={12} className={syncing ? "spin" : ""} />Sync now
            </button>
          </div>
          {lastUpdated && <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>AI insights generated {new Date(lastUpdated).toLocaleString()}</p>}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", maxWidth: "100%", minWidth: 0 }}>
          <select value={targetRole} onChange={(e) => { pickedRole.current = true; setTargetRole(e.target.value); }} aria-label="Target role" style={{ maxWidth: "100%" }}>
            {roleGroups.map((g) => (
              <optgroup key={g.group} label={g.own ? `${g.group} (your branch)` : g.group}>
                {g.roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </optgroup>
            ))}
          </select>
          <button className="btn brass" onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? <><RefreshCw size={14} className="spin" />Analyzing…</> : lastUpdated ? "Refresh AI insights" : "Run AI Analysis"}
          </button>
        </div>
      </div>

      {branchGroup && (
        <p style={{ fontSize: 12.5, color: "var(--slate)", marginTop: -16, marginBottom: 20 }}>
          Showing roles recommended for <strong>{branchGroup}</strong> based on your branch. Switch to "All roles" in the dropdown to explore other paths.
        </p>
      )}

      {!hasEnoughData && (
        <div className="alert error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span>Complete your profile to get more accurate AI analytics. ({completion}% complete)</span>
          <Link to="/edit-profile" className="btn secondary" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
            Complete Profile
          </Link>
        </div>
      )}

      {error && <div className="alert error">{error}</div>}

      {aiInsights && aiRole && aiRole !== targetRole && !analyzing && (
        <div className="alert info" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <span>The skill gap, roadmap and projects now show <b>{targetRole}</b>. The AI-written insights are still for {aiRole}; refresh to rewrite them for this role.</span>
          <button className="btn secondary" onClick={runAnalysis}><RefreshCw size={14} />Refresh AI insights</button>
        </div>
      )}

      {aiOutdated && !analyzing && (
        <div className="alert info" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <span>Your profile changed since the last AI analysis. The scores below are already up to date; refresh to update the AI-written insights too.</span>
          <button className="btn secondary" onClick={runAnalysis}><RefreshCw size={14} />Refresh AI insights</button>
        </div>
      )}

      {analyzing && (
        <div className="card ai-glow analyzing-card" role="status">
          <div className="ai-scanline" aria-hidden="true" />
          <div className="analyzing-bars" aria-hidden="true"><span /><span /><span /></div>
          <p>Analyzing your profile and writing personalised insights…</p>
        </div>
      )}

      {readiness && (
        <SectionCard title="Placement Readiness" index="01" glow>
          {(syncing || analyzing) && <div className="ai-scanline" aria-hidden="true" />}
          <ReadinessScore
            score={readiness.overallScore}
            category={readiness.category}
            subtitle="Overall readiness is measured from your whole profile (the seven components below), so it does not change with the selected role. It rises as you add skills, projects, internships and certificates."
          />
          {skillGap && skillGap.targetRole === targetRole && (
            <div className="role-fit" role="status">
              <span>Fit for <b>{targetRole}</b></span>
              <b className="role-fit-score">{skillGap.coveragePercentage}%</b>
              <span className="role-fit-note">of this role’s required skills ({skillGap.strongSkills.length} strong, {skillGap.partialSkills.length} partial, {skillGap.missingSkills.length} missing). Changes when you pick another role.</span>
            </div>
          )}
          <div style={{ marginTop: 24 }}>
            <ScoreBreakdown componentScores={readiness.componentScores} weights={readiness.weights} previous={previousScores} />
          </div>
        </SectionCard>
      )}

      {readiness && (
        <div className="two-col-grid">
          <SectionCard title="Strengths" index="02">
            <StrengthsCard items={readiness.strengths} variant="strength" />
          </SectionCard>
          <SectionCard title="Weaknesses" index="03">
            <StrengthsCard items={readiness.weaknesses} variant="weakness" />
          </SectionCard>
        </div>
      )}

      {skillGap && (
        <SectionCard title="Skill Gap Analysis" index="04">
          <SkillGapCard gap={skillGap} />
        </SectionCard>
      )}

      {careerInsights.length > 0 && (
        <SectionCard title="Career Insights" index="05">
          <p style={{ fontSize: 13, color: "var(--slate)", marginTop: -8, marginBottom: 16 }}>
            Based on your current profile — potentially suitable career paths, not guaranteed outcomes.
          </p>
          <div className="two-col-grid">
            {careerInsights.map((insight) => (
              <CareerInsightCard
                key={insight.career}
                insight={insight}
                selected={insight.career === targetRole}
                onSelect={setTargetRole}
              />
            ))}
          </div>
        </SectionCard>
      )}

      {learningRoadmap.length > 0 && (
        <SectionCard title="Learning Roadmap" index="06">
          <LearningRoadmap roadmap={learningRoadmap} />
        </SectionCard>
      )}

      {projectRecs.length > 0 && (
        <SectionCard title="Project Recommendations" index="07">
          <div className="two-col-grid">
            {projectRecs.map((p, i) => <ProjectRecommendation key={i} project={p} />)}
          </div>
        </SectionCard>
      )}

      <SectionCard title="AI Insights" index="08">
        <AIInsightCard insights={aiInsights} />
      </SectionCard>
    </DashboardLayout>
  );
};

export default AIAnalytics;
