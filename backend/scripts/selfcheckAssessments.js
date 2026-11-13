// Self-check for practice assessments. Uses a throwaway local DB
// (eduverse_selfcheck_assess, dropped after) and a stubbed Gemini client.
// Run: node scripts/selfcheckAssessments.js
const B = require("path").join(__dirname, "..");
process.env.JWT_SECRET = "selfcheck";
const assert = require("assert");

// Stub the Gemini client before anything requires it.
const gemini = require(B + "/services/geminiClient");
const stub = { configured: false, reply: null };
gemini.isConfigured = () => stub.configured;
gemini.generateJson = async (opts) => {
  if (typeof stub.reply === "function") return stub.reply(opts);
  if (stub.reply instanceof Error) throw stub.reply;
  return stub.reply;
};

const express = require(B + "/node_modules/express");
const mongoose = require(B + "/node_modules/mongoose");
const Student = require(B + "/models/Student");
const gen = require(B + "/utils/generateToken");
const { errorHandler } = require(B + "/middleware/errorHandler");

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/eduverse_selfcheck_assess");
  await mongoose.connection.dropDatabase();
  const app = express();
  app.use(express.json());
  app.use("/api/career-assistant", require(B + "/routes/careerAssistantRoutes"));
  app.use(errorHandler);
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}/api/career-assistant/assessments`;
  const mk = (email) => Student.create({ name: "Test User", email, password: "x".repeat(8), college: "C", branch: "Mechanical Engineering", year: "4th Year", rollNo: "R" + Math.random() });
  const me = await mk("a@x.io");
  const other = await mk("b@x.io");
  const call = async (who, method, path = "", body) => {
    const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${gen(who._id)}` }, body: body && JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };

  // ---- No AI key ----
  let r = await call(me, "GET");
  assert.strictEqual(r.body.data.aiEnabled, false);
  assert.strictEqual((await call(me, "POST", "", { type: "quiz", level: "beginner" })).status, 400);

  // Coding without AI: built-in problems, answers hidden, scored by key points.
  r = await call(me, "POST", "", { type: "coding", level: "intermediate" });
  assert.strictEqual(r.status, 201);
  const code = r.body.data;
  assert.strictEqual(code.source, "bank");
  assert.strictEqual(code.questions.length, 2);
  assert.ok(code.questions.every((q) => !("keyPoints" in q) && !("explanation" in q)), "key points and model answers hidden before submit");
  r = await call(me, "POST", `/${code._id}/submit`, {
    answers: ["Use a hash map of value -> index; for each x look up the complement target - x. One pass, O(n).", ""],
  });
  assert.strictEqual(r.body.data.results[0].score, 10, "all key points covered");
  assert.strictEqual(r.body.data.results[1].score, 0, "blank answer scores 0");
  assert.strictEqual(r.body.data.score, 50);
  assert.ok(r.body.data.results[0].idealAnswer.length > 20, "model answer revealed after submit");
  assert.ok(r.body.data.questions[0].keyPoints.length > 0);

  // Technical without AI: questions match the student's branch (Mechanical here).
  r = await call(me, "POST", "", { type: "technical", level: "beginner" });
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.data.questions.some((q) => q.topic === "Thermodynamics"), "mechanical questions for a mechanical student");

  r = await call(me, "POST", "", { type: "aptitude", level: "beginner" });
  assert.strictEqual(r.status, 201);
  const apt = r.body.data;
  assert.strictEqual(apt.source, "bank");
  assert.strictEqual(apt.questions.length, 5);
  assert.ok(apt.questions.every((q) => !("correctIndex" in q) && !("explanation" in q)), "answers hidden before submit");
  assert.ok(!("correctIndex" in (await call(me, "GET", `/${apt._id}`)).body.data.questions[0]));
  assert.strictEqual((await call(other, "GET", `/${apt._id}`)).status, 404); // not theirs
  assert.strictEqual((await call(me, "POST", `/${apt._id}/submit`, { answers: ["1"] })).status, 400); // wrong count
  assert.strictEqual((await call(me, "POST", `/${apt._id}/submit`, { answers: ["", "", "", "", ""] })).status, 400); // all blank

  // Bank answers: 1, 2, 1, 2, 1 -> answer 3 correctly, 2 wrong.
  r = await call(me, "POST", `/${apt._id}/submit`, { answers: ["1", "2", "1", "0", "0"] });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.data.score, 60);
  assert.strictEqual(r.body.data.status, "completed");
  assert.strictEqual(r.body.data.questions[0].correctIndex, 1, "answers revealed after submit");
  assert.deepStrictEqual(r.body.data.weaknesses, ["Speed & distance", "Verbal"]);
  assert.ok(r.body.data.improvementPlan.length >= 1);
  assert.strictEqual((await call(me, "POST", `/${apt._id}/submit`, { answers: ["1", "2", "1", "2", "1"] })).status, 400); // already done

  r = await call(me, "POST", "", { type: "hr", level: "intermediate" });
  const hr = r.body.data;
  r = await call(me, "POST", `/${hr._id}/submit`, { answers: ["I am a mechanical engineering student; my project was a solar dryer, my skill is CAD, I did an internship and my goal is design.", "", "", "", ""] });
  assert.strictEqual(r.body.data.results[0].score, 10);
  assert.strictEqual(r.body.data.score, 20, "HR scored by key points without AI");
  assert.strictEqual(r.body.data.aiReviewed, false);

  // ---- With AI (stubbed) ----
  const ai = await mk("c@x.io"); // separate student: the AI routes are rate-limited per student
  stub.configured = true;
  stub.reply = { questions: [{ topic: "Thermo", prompt: "Explain the second law." }, { topic: "", prompt: "" }, { prompt: "Q3" }, { prompt: "Q4" }, { prompt: "Q5" }, { prompt: "Q6" }] };
  r = await call(ai, "POST", "", { type: "technical", level: "advanced" });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.data.source, "ai");
  assert.strictEqual(r.body.data.questions.length, 5, "blank prompt dropped, capped at 5");
  const tech = r.body.data;

  stub.reply = {
    overallScore: 140, // out of range -> clamped
    summary: "Solid basics.",
    results: [{ score: 8, feedback: "Good", idealAnswer: "..." }, { score: 99 }, { score: -3 }, { score: "7" }, { score: 5 }],
    strengths: ["Clear"], weaknesses: ["Depth"],
    improvementPlan: [{ title: "Revise entropy", description: "..." }, { description: "no title, dropped" }],
  };
  r = await call(ai, "POST", `/${tech._id}/submit`, { answers: ["a", "b", "c", "d", "e"] });
  assert.strictEqual(r.body.data.score, 100);
  assert.deepStrictEqual(r.body.data.results.map((x) => x.score), [8, 10, 0, 7, 5]);
  assert.strictEqual(r.body.data.improvementPlan.length, 1);
  assert.strictEqual(r.body.data.aiReviewed, true);

  // Malformed MCQs from the model fall back to the bank.
  stub.reply = { questions: [{ prompt: "x", options: ["a", "b"], correctIndex: 5 }] };
  r = await call(ai, "POST", "", { type: "aptitude", level: "advanced" });
  assert.strictEqual(r.body.data.source, "bank");

  // AI-written questions + AI failure during review: no fake score (nothing to check against).
  stub.reply = { questions: [{ prompt: "Q1" }, { prompt: "Q2" }, { prompt: "Q3" }, { prompt: "Q4" }, { prompt: "Q5" }] };
  r = await call(ai, "POST", "", { type: "hr", level: "beginner" });
  stub.reply = new Error("boom");
  r = await call(ai, "POST", `/${r.body.data._id}/submit`, { answers: ["x", "", "", "", ""] });
  assert.strictEqual(r.body.data.score, null);

  // AI failure while generating: falls back to the bank and still scores.
  r = await call(ai, "POST", "", { type: "technical", level: "advanced" });
  assert.strictEqual(r.body.data.source, "bank");

  assert.strictEqual((await call(ai, "GET")).body.data.items.length, 4);
  assert.strictEqual((await call(me, "GET")).body.data.items.length, 4);
  assert.strictEqual((await call(me, "DELETE", `/${apt._id}`)).status, 200);

  // ---- Test series: 3 stages x 10 tests x 10 questions, answers revealed after submit ----
  stub.configured = false;
  const ser = await mk("series@x.io");
  const { buildTest } = require(B + "/config/testSeries");
  assert.strictEqual((await call(ser, "POST", "", { type: "series", level: "beginner", testNo: 11 })).status, 400);
  assert.strictEqual((await call(ser, "POST", "", { type: "series", level: "beginner" })).status, 400);
  r = await call(ser, "POST", "", { type: "series", level: "intermediate", testNo: 4 });
  assert.strictEqual(r.status, 201);
  const st = r.body.data;
  assert.strictEqual(st.testNo, 4);
  assert.strictEqual(st.questions.length, 10);
  assert.ok(st.questions.every((q) => q.options.length === 4 && !("correctIndex" in q) && !("explanation" in q)), "series answers hidden before submit");
  const key = buildTest("intermediate", 4).map((q) => String(q.correctIndex));
  r = await call(ser, "POST", `/${st._id}/submit`, { answers: key });
  assert.strictEqual(r.body.data.score, 100, "all correct = 100");
  r = await call(ser, "POST", "", { type: "series", level: "advanced", testNo: 1 });
  const wrong = buildTest("advanced", 1).map((q, i) => (i < 3 ? String(q.correctIndex) : String((q.correctIndex + 1) % 4)));
  r = await call(ser, "POST", `/${r.body.data._id}/submit`, { answers: wrong });
  assert.strictEqual(r.body.data.score, 30);
  assert.ok(r.body.data.questions.every((q) => Number.isInteger(q.correctIndex) && q.explanation), "correct answers + explanations revealed after submit");
  assert.strictEqual(r.body.data.weaknesses.length > 0, true);
  const list = (await call(ser, "GET")).body.data.items;
  assert.deepStrictEqual(list.map((x) => [x.type, x.level, x.testNo, x.score]), [["series", "advanced", 1, 30], ["series", "intermediate", 4, 100]]);

  console.log("ALL ASSESSMENT CHECKS PASSED");
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  srv.close();
})().catch(async (e) => {
  console.error(e);
  await mongoose.connection.dropDatabase().catch(() => {});
  process.exit(1);
});
