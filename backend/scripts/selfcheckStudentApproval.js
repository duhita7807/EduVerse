// Self-check: student verification (pending -> approved/rejected) and role-based access.
// Throwaway DB (eduverse_selfcheck_approval, dropped after). Run: node scripts/selfcheckStudentApproval.js
const B = require("path").join(__dirname, "..");
process.env.JWT_SECRET = "selfcheck";
const assert = require("assert");
const express = require(B + "/node_modules/express");
const mongoose = require(B + "/node_modules/mongoose");
const Student = require(B + "/models/Student");
const Drive = require(B + "/models/Drive");
const gen = require(B + "/utils/generateToken");
const { errorHandler } = require(B + "/middleware/errorHandler");

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/eduverse_selfcheck_approval");
  await mongoose.connection.dropDatabase();
  const app = express();
  app.use(express.json());
  for (const [path, file] of [["auth", "authRoutes"], ["profile", "profileRoutes"], ["analytics", "analyticsRoutes"], ["placement", "placementRoutes"], ["career-assistant", "careerAssistantRoutes"], ["tpo", "tpoRoutes"]]) {
    app.use(`/api/${path}`, require(`${B}/routes/${file}`));
  }
  app.use(errorHandler);
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}/api`;
  const call = async (token, method, path, body) => {
    const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  const mk = (o) => Student.create({ password: "x".repeat(8), college: "C", branch: "Computer Science & Engineering", year: "4th Year", rollNo: "R" + Math.random(), ...o });
  const tpo = gen((await mk({ name: "Tpo User", email: "t@x.io", role: "tpo" }))._id);
  const admin = gen((await mk({ name: "Admin User", email: "a@x.io", role: "admin" }))._id);
  const recruiter = await mk({ name: "Rec User", email: "r@x.io", role: "recruiter", recruiterStatus: "approved" });
  const old = gen((await mk({ name: "Existing Student", email: "old@x.io", education: [{ cgpa: 8 }] }))._id); // no studentStatus

  // Sign-up: pending, with sign-up extras saved in the same request.
  let r = await call(null, "POST", "/auth/register", {
    name: "New Student", email: "new@x.io", password: "Passw0rd!", college: "DYP", branch: "Computer Science & Engineering", year: "4th Year", rollNo: "EN123",
    githubUsername: "octocat", linkedinProfile: "https://linkedin.com/in/new", skills: { programmingLanguages: ["Python"] },
  });
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  assert.strictEqual(r.body.student.studentStatus, "pending");
  assert.strictEqual(r.body.student.githubUsername, "octocat", "sign-up extras saved without the profile endpoint");
  const stu = r.body.token;
  const stuId = r.body.student._id;
  assert.strictEqual((await call(null, "POST", "/auth/register", { name: "Bad Link", email: "bad@x.io", password: "Passw0rd!", college: "DYP", branch: "CSE", year: "4th Year", rollNo: "EN124", linkedinProfile: "not-a-url" })).status, 400, "sign-up extras still validated");

  // Pending: can log in and see status; student features blocked.
  assert.strictEqual((await call(null, "POST", "/auth/login", { email: "new@x.io", password: "Passw0rd!" })).status, 200);
  assert.strictEqual((await call(stu, "GET", "/auth/me")).body.student.studentStatus, "pending");
  for (const [m, p] of [["GET", "/profile"], ["PUT", "/profile"], ["GET", "/analytics/readiness"], ["GET", "/placement/drives"], ["GET", "/career-assistant/history"]]) {
    r = await call(stu, m, p, m === "PUT" ? { bio: "x" } : undefined);
    assert.strictEqual(r.status, 403, `${m} ${p} blocked while pending`);
    assert.strictEqual(r.body.code, "STUDENT_NOT_APPROVED");
  }
  // Existing students (no status field) keep access.
  assert.strictEqual((await call(old, "GET", "/profile")).status, 200);

  // Only TPO/admin can see and decide.
  assert.strictEqual((await call(stu, "GET", "/tpo/student-approvals")).status, 403);
  assert.strictEqual((await call(gen(recruiter._id), "PATCH", `/tpo/students/${stuId}/approval`, { status: "approved" })).status, 403);
  r = await call(tpo, "GET", "/tpo/student-approvals?status=pending");
  assert.deepStrictEqual(r.body.data.students.map((s) => s.email), ["new@x.io"]);
  assert.deepStrictEqual(r.body.data.counts, { pending: 1, approved: 1, rejected: 0 }, "existing student counts as approved");
  assert.strictEqual((await call(tpo, "PATCH", `/tpo/students/${stuId}/approval`, { status: "maybe" })).status, 400);

  // Pending students are not shortlisted for drives.
  const d = await Drive.create({ recruiter: recruiter._id, company: { name: "Acme" }, title: "SDE", applicationDeadline: new Date(Date.now() + 1e9) });
  await call(tpo, "PATCH", `/tpo/drives/${d._id}/review`, { decision: "approve" });
  r = await call(tpo, "GET", `/tpo/drives/${d._id}/shortlist`);
  assert.deepStrictEqual(r.body.data.groups.flatMap((g) => g.students.map((s) => s.email)), ["old@x.io"], "pending student not shortlisted");

  // Approve -> access; reject -> blocked again.
  assert.strictEqual((await call(admin, "PATCH", `/tpo/students/${stuId}/approval`, { status: "approved" })).body.data.studentStatus, "approved");
  assert.strictEqual((await call(stu, "GET", "/profile")).status, 200);
  assert.strictEqual((await call(stu, "PUT", "/profile", { bio: "Ready to go" })).status, 200, "can complete profile after approval");
  assert.strictEqual((await call(tpo, "PATCH", `/tpo/students/${stuId}/approval`, { status: "rejected" })).status, 200);
  r = await call(stu, "GET", "/placement/drives");
  assert.strictEqual(r.status, 403);
  assert.match(r.body.message, /not approved/);

  console.log("STUDENT APPROVAL CHECKS PASSED");
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  srv.close();
})().catch(async (e) => {
  console.error(e);
  await mongoose.connection.dropDatabase().catch(() => {});
  process.exit(1);
});
