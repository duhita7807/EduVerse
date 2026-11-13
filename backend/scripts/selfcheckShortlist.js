// Self-check for the shortlist flow. Uses a throwaway local DB (eduverse_selfcheck), dropped after.
// Run: node scripts/selfcheckShortlist.js
const B = require("path").join(__dirname, "..");
process.env.JWT_SECRET = "selfcheck";
const assert = require("assert");
const express = require(B + "/node_modules/express");
const mongoose = require(B + "/node_modules/mongoose");
const Student = require(B + "/models/Student");
const Drive = require(B + "/models/Drive");
const Application = require(B + "/models/Application");
const gen = require(B + "/utils/generateToken");
const { errorHandler } = require(B + "/middleware/errorHandler");

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/eduverse_selfcheck");
  await mongoose.connection.dropDatabase();
  const app = express(); app.use(express.json());
  app.use("/api/admin", require(B + "/routes/adminRoutes"));
  app.use("/api/tpo", require(B + "/routes/tpoRoutes"));
  app.use("/api/recruiter", require(B + "/routes/recruiterRoutes"));
  app.use((req, res) => res.status(404).json({ success: false })); // unknown routes, as in server.js
  app.use(errorHandler);
  const srv = app.listen(0); const base = `http://127.0.0.1:${srv.address().port}/api`;
  const mk = (o) => Student.create({ password: "x".repeat(8), college: "C", branch: "CSE", year: "4th Year", rollNo: "R" + Math.random(), ...o });
  const admin = await mk({ name: "Ad", email: "a@x.io", role: "admin" });
  const tpo = await mk({ name: "Tp", email: "t@x.io", role: "tpo" });
  const rec = await mk({ name: "Re", email: "r@x.io", role: "recruiter", recruiterStatus: "approved", organization: "Acme" });
  const pend = await mk({ name: "Pe", email: "p@x.io", role: "recruiter", recruiterStatus: "pending" });
  const s1 = await mk({ name: "Sa", email: "s1@x.io", branch: "CSE", education: [{ cgpa: 8.5 }] });
  const s2 = await mk({ name: "Sb", email: "s2@x.io", branch: "ECE" });
  const s3 = await mk({ name: "Sc", email: "s3@x.io", branch: "CSE" });
  const d = await Drive.create({ recruiter: rec._id, company: { name: "Acme" }, title: "SDE", applicationDeadline: new Date(Date.now() + 1e9), status: "approved" });
  await Application.create([{ drive: d._id, student: s1._id, recruiterDecision: "recommended" }, { drive: d._id, student: s2._id, finalStatus: "selected" }, { drive: d._id, student: s3._id, recruiterDecision: "not_recommended" }]);

  const call = async (who, method, path, body) => {
    const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${gen(who._id)}` }, body: body && JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };

  let r = await call(admin, "GET", "/admin/shortlisted");
  assert.deepStrictEqual(r.body.data.map((g) => [g.branch, g.students.map((s) => s.name)]), [["CSE", ["Sa"]], ["ECE", ["Sb"]]]);
  assert.strictEqual(r.body.data[0].students[0].cgpa, 8.5);
  assert.strictEqual((await call(tpo, "GET", "/admin/shortlisted")).status, 403);
  // The data-request flow was removed: its routes must no longer exist.
  for (const [who, m, p] of [[rec, "POST", "/recruiter/data-requests"], [rec, "GET", "/recruiter/data-requests"], [tpo, "GET", "/tpo/data-requests"], [admin, "PATCH", "/admin/data-requests/507f1f77bcf86cd799439011/share"]]) {
    assert.strictEqual((await call(who, m, p, m === "GET" ? undefined : {})).status, 404, `${m} ${p} removed`);
  }

  // Auto-shortlist on drive approval (company must be approved first).
  const pd = await Drive.create({ recruiter: pend._id, company: { name: "Pend" }, title: "X", applicationDeadline: new Date(Date.now() + 1e9) });
  assert.strictEqual((await call(admin, "PATCH", `/tpo/drives/${pd._id}/review`, { decision: "approve" })).status, 400);
  const d2 = await Drive.create({ recruiter: rec._id, company: { name: "Acme" }, title: "Analyst", applicationDeadline: new Date(Date.now() + 1e9), eligibility: { branches: ["CSE"] } });
  r = await call(admin, "PATCH", `/tpo/drives/${d2._id}/review`, { decision: "approve" });
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  r = await call(tpo, "GET", `/tpo/drives/${d2._id}/shortlist`);
  assert.deepStrictEqual(r.body.data.groups.map((g) => [g.branch, g.students.map((s) => s.name)]), [["CSE", ["Sa", "Sc"]]]);
  assert.ok(!("shortlist" in (await call(rec, "GET", `/recruiter/drives/${d2._id}`)).body.data.drive)); // ids never leak
  assert.strictEqual((await call(rec, "GET", `/recruiter/drives/${d2._id}/shortlist`)).status, 403); // not sent yet
  assert.strictEqual((await call(tpo, "POST", `/admin/drives/${d2._id}/shortlist/send`)).status, 403); // admin only
  assert.strictEqual((await call(admin, "DELETE", `/admin/drives/${d2._id}/shortlist/${s3._id}`)).body.data.count, 1);
  assert.strictEqual((await call(admin, "POST", `/admin/drives/${d2._id}/shortlist/send`)).status, 200);
  assert.strictEqual((await call(admin, "DELETE", `/admin/drives/${d2._id}/shortlist/${s1._id}`)).status, 400); // locked
  r = await call(rec, "GET", `/recruiter/drives/${d2._id}/shortlist`);
  assert.deepStrictEqual(r.body.data.groups[0].students.map((s) => s.name), ["Sa"]);
  const other = await mk({ name: "Ot", email: "o@x.io", role: "recruiter", recruiterStatus: "approved" });
  assert.strictEqual((await call(other, "GET", `/recruiter/drives/${d2._id}/shortlist`)).status, 404); // not their drive
  console.log("ALL CHECKS PASSED");
  await mongoose.connection.dropDatabase(); await mongoose.disconnect(); srv.close();
})().catch(async (e) => { console.error(e); await mongoose.connection.dropDatabase().catch(() => {}); process.exit(1); });
