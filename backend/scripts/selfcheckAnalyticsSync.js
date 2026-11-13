// Self-check: AI Analysis scores follow the student's data in MongoDB.
// Throwaway DB (eduverse_selfcheck_analytics, dropped after); Gemini stubbed.
// Run: node scripts/selfcheckAnalyticsSync.js
const B = require("path").join(__dirname, "..");
process.env.JWT_SECRET = "selfcheck";
const assert = require("assert");

const gemini = require(B + "/services/geminiClient");
gemini.isConfigured = () => false; // AI text falls back; scores are what we test

const express = require(B + "/node_modules/express");
const mongoose = require(B + "/node_modules/mongoose");
const Student = require(B + "/models/Student");
const Analytics = require(B + "/models/Analytics");
const gen = require(B + "/utils/generateToken");
const { errorHandler } = require(B + "/middleware/errorHandler");

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/eduverse_selfcheck_analytics");
  await mongoose.connection.dropDatabase();
  const app = express();
  app.use(express.json());
  app.use("/api/analytics", require(B + "/routes/analyticsRoutes"));
  app.use(errorHandler);
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}/api/analytics`;

  const s = await Student.create({
    name: "Sync Test", email: "sync@x.io", password: "x".repeat(8), college: "C", branch: "Computer Science & Engineering", year: "4th Year", rollNo: "R1",
    skills: { programmingLanguages: ["Python"], webTechnologies: [], databases: [], tools: [] },
    profileCompletion: 99, // deliberately wrong stored value
  });
  const call = async (method, path, body) => {
    const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${gen(s._id)}` }, body: body && JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };

  assert.strictEqual((await call("GET", "/cached")).body.data, null); // nothing analysed yet

  let r = await call("GET", "/readiness");
  const before = r.body.data;
  assert.notStrictEqual(before.profileCompleteness, 99, "completion is computed live, not the stored 99");
  assert.strictEqual(before.componentScores.profileCompleteness, before.profileCompleteness);
  assert.strictEqual((await Student.findById(s._id)).profileCompletion, before.profileCompleteness, "stored % synced back to MongoDB");

  r = await call("POST", "/analyze", { targetRole: "Full Stack Developer" });
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  r = await call("GET", "/cached");
  assert.strictEqual(r.body.data.aiOutdated, false, "fresh analysis is not outdated");
  const score0 = r.body.data.readiness.overallScore;

  // Student adds data directly in MongoDB (as profile edits / GitHub sync do).
  await Student.updateOne({ _id: s._id }, {
    $set: {
      "skills.webTechnologies": ["React", "Node.js", "Express"],
      "skills.databases": ["MongoDB", "MySQL"],
      projects: [{ title: "Placement portal", technologies: ["React", "Node.js"] }, { title: "Chat app", technologies: ["Socket.io"] }],
      internships: [{ company: "Acme" }],
      certifications: [{ title: "AWS Cloud Practitioner" }],
      githubUsername: "octocat",
      linkedinProfile: "https://linkedin.com/in/test",
      githubData: { username: "octocat", publicRepos: 8, repositories: [{ name: "a", stars: 15 }] },
    },
  });

  r = await call("GET", "/cached");
  const d = r.body.data;
  assert.ok(d.readiness.overallScore > score0, `overall rose (${score0} -> ${d.readiness.overallScore})`);
  assert.strictEqual(d.readinessScore, d.readiness.overallScore);
  for (const k of ["technicalSkills", "projects", "internships", "coding", "github", "certifications", "profileCompleteness"]) {
    assert.ok(d.readiness.componentScores[k] > before.componentScores[k], `${k} increased`);
  }
  assert.strictEqual(d.readiness.componentScores.coding, 100, "GitHub + LinkedIn = full online-presence credit");
  assert.strictEqual(d.readiness.componentScores.github, 100, "8 repos + 15 stars = full GitHub credit");
  assert.strictEqual(d.aiOutdated, true, "AI text flagged as written for older scores");
  assert.ok(Array.isArray(d.learningRecommendations));

  const saved = await Analytics.findOne({ userId: s._id }).lean();
  assert.strictEqual(saved.readinessScore, d.readiness.overallScore, "new scores written back to MongoDB");
  assert.deepStrictEqual(saved.componentScores, d.readiness.componentScores);

  // Re-running the analysis clears the outdated flag.
  await call("POST", "/analyze", { targetRole: "Full Stack Developer" });
  assert.strictEqual((await call("GET", "/cached")).body.data.aiOutdated, false);

  console.log("ANALYTICS SYNC CHECKS PASSED");
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  srv.close();
})().catch(async (e) => {
  console.error(e);
  await mongoose.connection.dropDatabase().catch(() => {});
  process.exit(1);
});
