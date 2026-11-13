// Self-check for notifications: each event notifies the right people, live delivery reaches only them,
// and list/unread/read endpoints are per-user. Throwaway DB (eduverse_selfcheck_notifications, dropped after).
// Run: node scripts/selfcheckNotifications.js
const B = require("path").join(__dirname, "..");
process.env.JWT_SECRET = "selfcheck";
const assert = require("assert");
const express = require(B + "/node_modules/express");
const mongoose = require(B + "/node_modules/mongoose");
const Student = require(B + "/models/Student");
const Notification = require(B + "/models/Notification");
const gen = require(B + "/utils/generateToken");
const { errorHandler } = require(B + "/middleware/errorHandler");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const listen = async (base, token) => {
  const ctrl = new AbortController();
  const res = await fetch(`${base}/notifications/stream`, { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal });
  const events = [];
  (async () => {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const f = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const type = /^event: (.*)$/m.exec(f)?.[1];
          const data = /^data: (.*)$/m.exec(f)?.[1];
          if (type && data) events.push({ type, data: JSON.parse(data) });
        }
      }
    } catch { /* aborted */ }
  })();
  return { events, close: () => ctrl.abort() };
};

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/eduverse_selfcheck_notifications");
  await mongoose.connection.dropDatabase();
  const app = express();
  app.use(express.json());
  for (const [p, f] of [["auth", "authRoutes"], ["placement", "placementRoutes"], ["recruiter", "recruiterRoutes"], ["tpo", "tpoRoutes"], ["admin", "adminRoutes"], ["notifications", "notificationRoutes"]]) {
    app.use(`/api/${p}`, require(`${B}/routes/${f}`));
  }
  app.use(errorHandler);
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}/api`;
  const call = async (token, method, path, body) => {
    const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  const mk = (o) => Student.create({ password: "x".repeat(8), college: "C", branch: "Computer Science & Engineering", year: "4th Year", rollNo: "R" + Math.random(), ...o });
  const tpoU = await mk({ name: "Tara Tpo", email: "t@x.io", role: "tpo" });
  const adminU = await mk({ name: "Adam Admin", email: "a@x.io", role: "admin" });
  const [tpo, admin] = [tpoU, adminU].map((u) => gen(u._id));
  const titles = async (user) => (await Notification.find({ user }).sort({ createdAt: 1 }).lean()).map((n) => n.title);
  const settle = () => wait(600); // notifications are written just after the response; leave headroom on a busy machine

  const sTpo = await listen(base, tpo);

  // Registration -> staff
  let r = await call(null, "POST", "/auth/register", { name: "Alice Good", email: "alice@x.io", password: "Passw0rd!", college: "DYP", branch: "Computer Science & Engineering", year: "4th Year", rollNo: "EN1" });
  const alice = r.body.token;
  const aliceId = r.body.student._id;
  await settle();
  assert.ok((await titles(tpoU._id)).includes("New student awaiting approval"), "TPO told about new student");
  assert.ok((await titles(adminU._id)).includes("New student awaiting approval"), "admin told about new student");
  assert.ok(sTpo.events.some((e) => e.type === "notification" && e.data.title === "New student awaiting approval"), "TPO gets it live");

  // Pending student can use notifications and hears about approval live.
  const sAlice = await listen(base, alice);
  await call(tpo, "PATCH", `/tpo/students/${aliceId}/approval`, { status: "approved" });
  await settle();
  assert.ok(sAlice.events.some((e) => e.data.title === "Your account was approved"), "student told live about approval");

  // Recruiter
  r = await call(null, "POST", "/auth/register-recruiter", { name: "Rita Recruiter", email: "rita@x.io", password: "Passw0rd!", organization: "Acme" });
  const rita = r.body.token;
  const ritaId = r.body.student._id;
  await settle();
  assert.ok((await titles(tpoU._id)).includes("New recruiter awaiting approval"));
  await call(tpo, "PATCH", `/tpo/recruiters/${ritaId}/status`, { status: "approved" });
  await settle();
  assert.ok((await titles(ritaId)).includes("Your recruiter account was approved"));

  // Drive lifecycle
  await Student.updateOne({ _id: aliceId }, { $set: { education: [{ cgpa: 8 }] } });
  const low = await mk({ name: "Low Cgpa", email: "low@x.io", education: [{ cgpa: 5 }] });
  r = await call(rita, "POST", "/recruiter/drives", { company: { name: "Acme" }, title: "SDE", applicationDeadline: new Date(Date.now() + 1e9).toISOString(), eligibility: { minCgpa: 7 }, rounds: [{ name: "Test" }] });
  const driveId = r.body.data.drive._id;
  const roundId = r.body.data.drive.rounds[0]._id;
  await settle();
  assert.ok((await titles(adminU._id)).includes("New drive awaiting verification"), "staff told about new drive");
  await call(tpo, "PATCH", `/tpo/drives/${driveId}/review`, { decision: "reject", note: "Add the package" });
  await settle();
  assert.ok((await titles(ritaId)).includes("Drive needs changes"));
  await call(rita, "PUT", `/recruiter/drives/${driveId}`, { company: { name: "Acme" }, title: "SDE", applicationDeadline: new Date(Date.now() + 1e9).toISOString(), eligibility: { minCgpa: 7 }, rounds: [{ _id: roundId, name: "Test" }] });
  await settle();
  assert.ok((await titles(tpoU._id)).includes("Drive resubmitted for verification"));
  await call(tpo, "PATCH", `/tpo/drives/${driveId}/review`, { decision: "approve" });
  await settle();
  assert.ok((await titles(ritaId)).includes("Drive approved"));
  assert.ok((await titles(aliceId)).includes("New drive you are eligible for"), "eligible student told");
  assert.ok(!(await titles(low._id)).includes("New drive you are eligible for"), "ineligible student not told");
  await call(admin, "POST", `/admin/drives/${driveId}/shortlist/send`);
  await settle();
  assert.ok((await titles(ritaId)).includes("Shortlist received"));
  r = await call(alice, "POST", `/placement/drives/${driveId}/apply`);
  const appId = r.body.data.applicationId;
  await call(rita, "PATCH", `/recruiter/drives/${driveId}/applications/${appId}`, { recruiterDecision: "recommended" });
  await call(rita, "POST", `/recruiter/drives/${driveId}/submit-results`);
  await settle();
  assert.ok((await titles(tpoU._id)).includes("Results ready to finalize"));
  await call(tpo, "POST", `/tpo/drives/${driveId}/finalize`, { selections: [{ applicationId: appId, finalStatus: "selected" }] });
  await settle();
  assert.ok((await titles(aliceId)).includes("Congratulations, you were selected"));
  assert.ok((await titles(ritaId)).includes("Selections finalized"));

  // Certificate review
  const s = await Student.findById(aliceId);
  s.certifications.push({ title: "AWS", issuer: "Amazon", certificateFile: { url: `/uploads/certificates/cert-${aliceId}-0123456789abcdef.pdf` }, verificationStatus: "pending" });
  await s.save({ validateBeforeSave: false });
  await call(admin, "PATCH", `/admin/certificates/${aliceId}/${s.certifications[0]._id}`, { status: "rejected", note: "Blurry" });
  await settle();
  assert.ok((await titles(aliceId)).includes("Certificate rejected"));

  // Endpoints are per user
  const unread = (await call(alice, "GET", "/notifications/unread")).body.data.count;
  assert.strictEqual(unread, (await titles(aliceId)).length, "all unread at first");
  r = await call(alice, "GET", "/notifications");
  assert.strictEqual(r.body.data.notifications[0].title, "Certificate rejected", "newest first");
  const first = r.body.data.notifications[0]._id;
  assert.strictEqual((await call(rita, "POST", `/notifications/${first}/read`)).status, 404, "cannot read someone else's notification");
  assert.strictEqual((await call(alice, "POST", `/notifications/${first}/read`)).status, 200);
  assert.strictEqual((await call(alice, "GET", "/notifications/unread")).body.data.count, unread - 1);
  assert.strictEqual((await call(alice, "GET", "/notifications?unread=1")).body.data.notifications.length, unread - 1, "unread filter");
  await call(alice, "POST", "/notifications/read-all");
  assert.strictEqual((await call(alice, "GET", "/notifications/unread")).body.data.count, 0, "read all");
  assert.ok((await call(rita, "GET", "/notifications/unread")).body.data.count > 0, "other users unaffected");
  assert.strictEqual((await call(null, "GET", "/notifications")).status, 401);
  assert.ok(!sAlice.events.some((e) => e.data.title === "New student awaiting approval"), "students never get staff notifications");

  sTpo.close(); sAlice.close();
  srv.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log("NOTIFICATION CHECKS PASSED");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
