/**
 * Offline Career Assistant — answers from the student's own EduVerse data
 * (readiness, skill gaps, career matches, roadmap, project ideas, question
 * bank) when Gemini is unavailable (no key, invalid key, quota, network).
 * Same reply shape as the AI path: { message, suggestedActions, roadmapSteps }.
 */
const { predict } = require("./predictionService");
const { analyzeSkillGap, matchAllRoles, getCareerInsights } = require("./skillGapService");
const { generateLearningRoadmap, SKILL_LIBRARY } = require("./learningRecommendationService");
const { recommendProjects } = require("./projectRecommendationService");
const { TECHNICAL, branchGroup } = require("../config/questionBank");
const { CAREER_ROLES } = require("../config/careerRoles");

const COMPONENT_LABELS = {
  technicalSkills: ["Technical skills", "List every language, framework, database and tool you have actually used in Edit Profile."],
  projects: ["Projects", "Add 2–3 projects with a clear description and the technologies used."],
  internships: ["Internships", "Add any internship, training or industrial visit experience."],
  coding: ["Online presence", "Link both your GitHub and LinkedIn profiles in Integrations."],
  github: ["GitHub activity", "Push your projects to public GitHub repositories and sync GitHub."],
  certifications: ["Certifications", "Add relevant course certificates (NPTEL, Coursera, etc.) and upload the files."],
  profileCompleteness: ["Profile completeness", "Fill the remaining sections of your profile."],
};

const lastUserText = (history) => [...history].reverse().find((m) => m.role === "user")?.content || "";
const list = (items) => items.map((s) => `• ${s}`).join("\n");
const has = (text, words) => words.some((w) => text.includes(w));

/** The student's saved target role if valid, otherwise their best-matching branch role. */
const pickRole = (student, latestAnalytics, text = "") => {
  const named = Object.keys(CAREER_ROLES).find((r) => text.includes(r.toLowerCase()));
  if (named) return named;
  if (latestAnalytics?.targetRole && CAREER_ROLES[latestAnalytics.targetRole]) return latestAnalytics.targetRole;
  return matchAllRoles(student)[0]?.targetRole;
};

const levelFor = (score) => (score >= 71 ? "advanced" : score >= 51 ? "intermediate" : "beginner");

const skillGapReply = (student, role) => {
  const g = analyzeSkillGap(student, role);
  return {
    message:
      `For **${role}** your profile covers about **${g.coveragePercentage}%** of the required skills.\n\n` +
      (g.strongSkills.length ? `Strong: ${g.strongSkills.join(", ")}.\n` : "") +
      (g.partialSkills.length ? `Partly there: ${g.partialSkills.join(", ")}.\n` : "") +
      (g.missingSkills.length ? `\nYour biggest gaps:\n${list(g.missingSkills.slice(0, 6))}` : "\nYou already cover this role's core skills — deepen them with a strong project."),
    suggestedActions: g.missingSkills.slice(0, 3).map((s) => `Learn ${s} and use it in a small project`),
  };
};

const careerReply = (student) => {
  const top = getCareerInsights(student, 3);
  return {
    message: `Based on your current skills, the roles that fit you best are:\n\n${list(top.map((c) => `**${c.career}** — ${c.matchScore}% match. ${c.nextSteps}`))}\n\nThese are suggestions from your profile, not guarantees — your interests matter too.`,
    suggestedActions: [`Open AI Analytics and select "${top[0]?.career}" to see the full skill gap`, "Add your career interests in Edit Profile"],
  };
};

const readinessReply = (student) => {
  const r = predict(student);
  const weakest = Object.entries(r.componentScores).sort((a, b) => a[1] - b[1]).slice(0, 3);
  return {
    message:
      `Your placement readiness is **${r.overallScore}/100 (${r.category})**.\n\nThe quickest improvements come from your lowest components:\n` +
      list(weakest.map(([k, v]) => `**${COMPONENT_LABELS[k][0]}** (${v}/100): ${COMPONENT_LABELS[k][1]}`)),
    suggestedActions: weakest.map(([k]) => COMPONENT_LABELS[k][1]),
  };
};

const projectReply = (student, role) => {
  const { recommendations } = recommendProjects(student, role);
  return {
    message: `Project ideas for **${role}**:\n\n${list(recommendations.map((p) => `**${p.title}** (${p.difficulty}) — ${p.description} ${p.whyItHelps}`))}`,
    suggestedActions: recommendations.slice(0, 2).map((p) => `Build: ${p.title}`),
  };
};

const learnReply = (student, role, text) => {
  const skill = Object.keys(SKILL_LIBRARY).find((s) => text.includes(s.toLowerCase()));
  if (skill) {
    const e = SKILL_LIBRARY[skill];
    return {
      message: `Plan for **${skill}** (about ${e.durationWeeks} week${e.durationWeeks > 1 ? "s" : ""}):\n\n${list([`Goal: ${e.objective}`, `Practice: ${e.practiceTask}`, `Project: ${e.suggestedProject}`])}`,
      suggestedActions: [e.practiceTask],
    };
  }
  const { roadmap } = generateLearningRoadmap(student, role);
  if (!roadmap.length) return { message: `You already cover the core skills for **${role}**. Next, build a larger project and practise interviews.`, suggestedActions: ["Take a test in Interview & Test Prep"] };
  return {
    message: `What to learn next for **${role}**, in order:\n\n${list(roadmap.slice(0, 5).map((s) => `**${s.skill}** (${s.priority}, ${s.weekRange}) — ${s.learningObjective}`))}`,
    suggestedActions: roadmap.slice(0, 3).map((s) => s.practiceTask),
  };
};

const interviewTips = (student) => {
  const level = levelFor(predict(student).overallScore);
  const qs = TECHNICAL[branchGroup(student.branch)][level];
  return {
    message:
      `Practise these ${level}-level technical questions for your branch:\n\n${list(qs.map((q) => `${q.prompt} _(${q.topic})_`))}\n\n` +
      "For HR rounds, answer with the STAR method (Situation, Task, Action, Result) and keep a 1-minute introduction ready covering your branch, projects, skills and goal.",
    suggestedActions: ["Use the Mock Interview tab to answer one question at a time", "Take the Technical and HR test series in Interview & Test Prep"],
  };
};

/** Mock interview without AI: asks bank questions in turn and scores the previous answer by key points. */
const interviewTurn = (student, history) => {
  const level = levelFor(predict(student).overallScore);
  const qs = TECHNICAL[branchGroup(student.branch)][level];
  const asked = history.filter((m) => m.role === "assistant").length;
  const prev = asked > 0 ? qs[(asked - 1) % qs.length] : null;
  const next = qs[asked % qs.length];
  let feedback = "";
  if (prev) {
    const answer = lastUserText(history).toLowerCase();
    const hit = prev.keyPoints.filter((k) => k.split("|").some((w) => answer.includes(w))).length;
    feedback = `**Feedback:** you covered ${hit} of ${prev.keyPoints.length} key points.\n**Model answer:** ${prev.idealAnswer}\n\n`;
  }
  return { message: `${feedback}**Question ${asked + 1} (${next.topic}):** ${next.prompt}`, suggestedActions: [] };
};

const roadmapReply = (student, role) => {
  const g = analyzeSkillGap(student, role);
  const { roadmap } = generateLearningRoadmap(student, role);
  const steps = [
    ["Current Skills", g.strongSkills.length ? `You already have ${g.strongSkills.slice(0, 4).join(", ")}.` : "Start by listing every skill you have used in Edit Profile."],
    ["Skill Gaps", g.missingSkills.length ? `Missing for ${role}: ${g.missingSkills.slice(0, 4).join(", ")}.` : `You cover the core skills for ${role}.`],
    ["Learning", roadmap.length ? `Learn ${roadmap.slice(0, 3).map((s) => s.skill).join(", ")} over the next ${roadmap.slice(0, 3).length * 2} weeks.` : "Deepen your strongest skills with advanced material."],
    ["Practice", "Solve problems daily and take the Coding and Technical test series in Interview & Test Prep."],
    ["Projects", `Build one portfolio project for ${role} and push it to GitHub.`],
    ["Interview Prep", "Practise technical questions and STAR-format HR answers in Mock Interview."],
    ["Placement Prep", "Keep your profile complete, apply to eligible drives and track them in My Applications."],
  ].map(([title, description], i) => ({ step: i + 1, title, description }));
  return { message: `Here is your roadmap towards **${role}**:`, suggestedActions: [], roadmapSteps: steps };
};

const NOTE = "\n\n_Answered from your EduVerse profile (AI service offline)._";

const offlineReply = ({ student, latestAnalytics, history, mode = "chat" }) => {
  const text = lastUserText(history).toLowerCase();
  const role = pickRole(student, latestAnalytics, text);
  let reply;
  if (mode === "interview") reply = interviewTurn(student, history);
  else if (mode === "roadmap") reply = roadmapReply(student, role);
  else if (mode === "learning-plan" || has(text, ["learn", "roadmap", "study", "course"])) reply = learnReply(student, role, text);
  else if (has(text, ["gap", "missing", "lack", "weak"])) reply = skillGapReply(student, role);
  else if (has(text, ["project"])) reply = projectReply(student, role);
  else if (has(text, ["interview", "prepare", "question"])) reply = interviewTips(student);
  else if (has(text, ["career", "suitable", "role", "job", "field"])) reply = careerReply(student);
  else reply = readinessReply(student); // "improve", "readiness", "placement" and anything else
  return { roadmapSteps: [], suggestedActions: [], ...reply, message: reply.message + (mode === "interview" ? "" : NOTE) };
};

module.exports = { offlineReply };
