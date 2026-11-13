// Self-check: without Gemini, the AI analysis is built from the student's data and follows the chosen role.
// No database needed. Run: node scripts/selfcheckAnalyticsFallback.js
const assert = require("assert");
delete process.env.GEMINI_API_KEY; // force the no-AI path
const { generateAiPlacementAnalysis } = require("../services/aiAnalyticsService");
const { calculateReadinessAnalysis } = require("../services/analyticsService");

const student = {
  name: "x", branch: "Computer Science & Engineering", year: "4th Year", careerInterests: [],
  skills: { programmingLanguages: ["Python", "JavaScript"], webTechnologies: ["React", "Node.js"], databases: ["MongoDB"], tools: ["Git"] },
  projects: [{ title: "P", technologies: ["React", "Node.js"] }], internships: [], certifications: [], education: [{ cgpa: 8 }],
};

(async () => {
  const readiness = calculateReadinessAnalysis(student);
  const a = await generateAiPlacementAnalysis(student, readiness, "Frontend Developer");
  const b = await generateAiPlacementAnalysis(student, readiness, "Data Scientist");
  assert.match(a.summary, new RegExp(`${readiness.overallScore}/100`), "summary states the readiness score");
  assert.match(a.summary, /Frontend Developer/);
  assert.match(b.summary, /Data Scientist/);
  assert.notDeepStrictEqual(a.skillRecommendations, b.skillRecommendations, "skill advice changes with the role");
  for (const r of [a, b]) {
    for (const k of ["strengths", "weaknesses", "careerInsights", "skillRecommendations", "learningRecommendations", "projectRecommendations"]) {
      assert.ok(Array.isArray(r[k]) && r[k].every((x) => typeof x === "string"), `${k} is a list of text`);
    }
    assert.ok(r.skillRecommendations.length && r.learningRecommendations.length && r.projectRecommendations.length, "role-specific sections filled");
    assert.ok(!/undefined|NaN|\[object/.test(JSON.stringify(r)), "no broken values");
  }
  const none = await generateAiPlacementAnalysis(student, readiness, "");
  assert.match(none.summary, /readiness/, "works without a role");
  console.log("ANALYTICS FALLBACK CHECKS PASSED");
})().catch((e) => { console.error(e); process.exit(1); });
