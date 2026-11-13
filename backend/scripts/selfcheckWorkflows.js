// End-to-end role workflows through the real routes and middleware: accounts, access control,
// certificates, eligibility, drive lifecycle. Throwaway DB (eduverse_selfcheck_workflows, dropped after).
// Records every step instead of stopping at the first failure. Run: node scripts/selfcheckWorkflows.js
const B = require("path").join(__dirname, "..");
process.env.JWT_SECRET = "selfcheck";
const express = require(B + "/node_modules/express");
const mongoose = require(B + "/node_modules/mongoose");
const Student = require(B + "/models/Student");
const gen = require(B + "/utils/generateToken");
const { errorHandler } = require(B + "/middleware/errorHandler");
const { deleteCertificateFile } = require(B + "/middleware/certificateUpload");

const results = [];
const step = (group, name, ok, detail) => {
  results.push({ group, name, ok: Boolean(ok) });
  if (!ok) console.log(`FAIL [${group}] ${name}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 300));
};

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/eduverse_selfcheck_workflows");
  await mongoose.connection.dropDatabase();
  const app = express();
  app.use(express.json());
  for (const [p, f] of [["auth", "authRoutes"], ["profile", "profileRoutes"], ["analytics", "analyticsRoutes"], ["placement", "placementRoutes"], ["recruiter", "recruiterRoutes"], ["tpo", "tpoRoutes"], ["admin", "adminRoutes"]]) {
    app.use(`/api/${p}`, require(`${B}/routes/${f}`));
  }
  app.use(errorHandler);
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}/api`;
  const call = async (token, method, path, body) => {
    const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
    const text = await r.text();
    let json = {};
    try { json = JSON.parse(text); } catch { /* non-JSON error page */ }
    return { status: r.status, body: json };
  };
  const upload = async (token, name, type, bytes) => {
    const form = new FormData();
    form.append("file", new Blob([bytes], { type }), name);
    const r = await fetch(`${base}/profile/certificate-file`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
  const mk = (o) => Student.create({ password: "x".repeat(8), college: "C", branch: "Computer Science & Engineering", year: "4th Year", rollNo: "R" + Math.random(), ...o });
  const tpo = gen((await mk({ name: "Tpo User", email: "t@x.io", role: "tpo" }))._id);
  const admin = gen((await mk({ name: "Admin User", email: "a@x.io", role: "admin" }))._id);
  const pw = "Passw0rd!";
  const reg = (name, email, extra = {}) => ({ name, email, password: pw, college: "DYP", branch: "Computer Science & Engineering", year: "4th Year", rollNo: "EN" + email.length + name.length, ...extra });

  /* ---------- Student accounts ---------- */
  let G = "Student account";
  let r = await call(null, "POST", "/auth/register", reg("Weak Pass", "weak@x.io", { password: "abc" }));
  step(G, "Weak password rejected", r.status === 400, r);
  r = await call(null, "POST", "/auth/register", reg("Alice Good", "alice@x.io", { role: "admin", rollNo: "EN1" }));
  step(G, "Registration succeeds with pending status", r.status === 201 && r.body.student.studentStatus === "pending", r);
  step(G, "Client-supplied role is ignored", r.body.student?.role === "student", r);
  const alice = r.body.token;
  const aliceId = r.body.student._id;
  const stored = await Student.findById(aliceId).select("+password");
  step(G, "Password stored only as a bcrypt hash", /^\$2[aby]\$/.test(stored.password));
  r = await call(null, "POST", "/auth/register", reg("Alice Two", "alice@x.io", { rollNo: "EN2" }));
  step(G, "Duplicate email rejected", r.status >= 400 && r.status < 500, r);
  step(G, "Wrong password rejected", (await call(null, "POST", "/auth/login", { email: "alice@x.io", password: "Wrong1234!" })).status === 401);
  step(G, "Correct password issues a token", Boolean((await call(null, "POST", "/auth/login", { email: "alice@x.io", password: pw })).body.token));
  step(G, "Pending student blocked from profile", (await call(alice, "GET", "/profile")).status === 403);
  step(G, "Student cannot approve own account", (await call(alice, "PATCH", `/tpo/students/${aliceId}/approval`, { status: "approved" })).status === 403);
  r = await call(tpo, "PATCH", `/tpo/students/${aliceId}/approval`, { status: "approved" });
  step(G, "TPO approves student", r.status === 200, r);
  step(G, "Approved student reaches profile", (await call(alice, "GET", "/profile")).status === 200);

  /* ---------- Profile ---------- */
  G = "Student profile";
  r = await call(alice, "PUT", "/profile", { education: [{ degree: "B.Tech", institution: "DYP", cgpa: 11 }] });
  step(G, "CGPA above 10 rejected", r.status === 400, r);
  r = await call(alice, "PUT", "/profile", {
    education: [{ degree: "B.Tech", institution: "DYP", cgpa: 8 }],
    skills: { programmingLanguages: ["Python", "Java"], webTechnologies: [], databases: [], tools: [] },
    projects: [{ title: "Portal", description: "A web portal", technologies: ["React"] }],
  });
  step(G, "Academic, skill and project data saved", r.status === 200 && r.body.student.projects.length === 1, r);
  r = await call(alice, "GET", "/analytics/readiness");
  const score0 = r.body.data?.overallScore;
  step(G, "Readiness score returned", r.status === 200 && Number.isInteger(score0), r);
  step(G, "Readiness response carries Random Forest and XGBoost estimates", Number.isInteger(r.body.data?.ml?.randomForestScore) && Number.isInteger(r.body.data?.ml?.xgboostScore), r);

  /* ---------- Certificates ---------- */
  G = "Certificate verification";
  step(G, "Disallowed file type rejected", (await upload(alice, "virus.exe", "application/octet-stream", "MZ")).status === 400);
  step(G, "Disguised file (text named .pdf) rejected by signature", (await upload(alice, "fake.pdf", "application/pdf", "not a pdf at all")).status === 400);
  step(G, "File above 5 MB rejected", (await upload(alice, "big.pdf", "application/pdf", new Uint8Array(5 * 1024 * 1024 + 10))).status >= 400);
  const up = await upload(alice, "cert.pdf", "application/pdf", "%PDF-1.4 test");
  step(G, "Valid PDF accepted", up.status === 201, up);
  const file = up.body.file;
  const putCert = (token, extra) => call(token, "PUT", "/profile", { certifications: [{ title: "AWS", issuer: "Amazon", certificateFile: file, ...extra }] });
  r = await putCert(alice);
  const certOf = async () => (await Student.findById(aliceId)).certifications[0];
  step(G, "New attachment starts as pending", r.status === 200 && (await certOf())?.verificationStatus === "pending", r);
  const certId = String((await certOf())._id);
  r = await call(alice, "PUT", "/profile", { certifications: [{ _id: certId, title: "AWS", issuer: "Amazon", certificateFile: file, verificationStatus: "verified" }] });
  step(G, "Student cannot mark own certificate verified", (await certOf()).verificationStatus === "pending", r);
  const other = await mk({ name: "Other Student", email: "other@x.io" });
  r = await call(gen(other._id), "PUT", "/profile", { certifications: [{ title: "Stolen", issuer: "X", certificateFile: file }] });
  step(G, "Student cannot attach another student's file", r.status === 400, r);
  step(G, "Student cannot call the review endpoint", (await call(alice, "PATCH", `/admin/certificates/${aliceId}/${certId}`, { status: "verified" })).status === 403);
  step(G, "TPO cannot call the review endpoint (admin only)", (await call(tpo, "PATCH", `/admin/certificates/${aliceId}/${certId}`, { status: "verified" })).status === 403);
  step(G, "Rejection without a note refused", (await call(admin, "PATCH", `/admin/certificates/${aliceId}/${certId}`, { status: "rejected" })).status === 400);
  await call(admin, "PATCH", `/admin/certificates/${aliceId}/${certId}`, { status: "rejected", note: "Blurry scan" });
  step(G, "Admin rejects with a note", (await certOf()).verificationStatus === "rejected" && (await certOf()).verificationNote === "Blurry scan");
  await call(admin, "PATCH", `/admin/certificates/${aliceId}/${certId}`, { status: "verified" });
  step(G, "Admin verifies", (await certOf()).verificationStatus === "verified");
  r = await call(alice, "GET", "/analytics/readiness");
  step(G, "Adding a certification raises the readiness score", r.body.data.overallScore > score0, { score0, now: r.body.data.overallScore });
  deleteCertificateFile(file.url);

  /* ---------- Access control ---------- */
  G = "Role-based access";
  r = await call(null, "POST", "/auth/register-recruiter", reg("Rita Recruiter", "rita@x.io", { organization: "Acme", rollNo: undefined }));
  step(G, "Recruiter registers with pending status", r.status === 201 && r.body.student.recruiterStatus === "pending", r);
  const rita = r.body.token;
  const ritaId = r.body.student?._id;
  const driveBody = { company: { name: "Acme" }, title: "SDE", applicationDeadline: new Date(Date.now() + 1e9).toISOString(), eligibility: { minCgpa: 7, branches: ["Computer Science"], years: ["4th Year"] }, rounds: [{ name: "Test", type: "test" }] };
  step(G, "Pending recruiter cannot post a drive", (await call(rita, "POST", "/recruiter/drives", driveBody)).status === 403);
  r = await call(tpo, "PATCH", `/tpo/recruiters/${ritaId}/status`, { status: "approved" });
  step(G, "TPO approves recruiter", r.status === 200, r);
  for (const [who, tok, path, want] of [
    ["no token", null, "/profile", 401], ["invalid token", "abc.def.ghi", "/profile", 401],
    ["student", alice, "/tpo/stats", 403], ["student", alice, "/admin/stats", 403], ["student", alice, "/recruiter/stats", 403],
    ["recruiter", rita, "/tpo/stats", 403], ["recruiter", rita, "/admin/stats", 403], ["recruiter", rita, "/placement/drives", 403],
    ["TPO", tpo, "/admin/stats", 403], ["TPO", tpo, "/recruiter/stats", 403], ["TPO", tpo, "/tpo/stats", 200],
    ["admin", admin, "/admin/stats", 200], ["admin", admin, "/tpo/stats", 200], ["recruiter", rita, "/recruiter/stats", 200],
    ["recruiter", rita, "/analytics/readiness", 403], ["admin", admin, "/analytics/readiness", 403],
  ]) step(G, `${who} GET ${path} returns ${want}`, (await call(tok, "GET", path)).status === want);

  /* ---------- Eligibility, shortlist, drive lifecycle ---------- */
  G = "Eligibility and drive lifecycle";
  const low = await mk({ name: "Low Cgpa", email: "low@x.io", education: [{ cgpa: 6 }] });
  const mech = await mk({ name: "Mech Student", email: "mech@x.io", branch: "Mechanical Engineering", education: [{ cgpa: 9 }] });
  const third = await mk({ name: "Third Year", email: "third@x.io", year: "3rd Year", education: [{ cgpa: 9 }] });
  const pend = await mk({ name: "Pending Student", email: "pend@x.io", studentStatus: "pending", education: [{ cgpa: 9 }] });
  r = await call(rita, "POST", "/recruiter/drives", driveBody);
  step(G, "Approved recruiter creates drive as pending", r.status === 201 && r.body.data.drive.status === "pending", r);
  const driveId = r.body.data?.drive?._id;
  const roundId = r.body.data?.drive?.rounds?.[0]?._id;
  step(G, "Student cannot see an unverified drive", !(await call(alice, "GET", "/placement/drives")).body.data?.drives?.length);
  step(G, "Rejection without a note refused", (await call(tpo, "PATCH", `/tpo/drives/${driveId}/review`, { decision: "reject" })).status === 400);
  r = await call(tpo, "PATCH", `/tpo/drives/${driveId}/review`, { decision: "approve" });
  step(G, "TPO approves drive", r.status === 200, r);
  r = await call(tpo, "GET", `/tpo/drives/${driveId}/shortlist`);
  const ids = JSON.stringify(r.body);
  step(G, "Auto-shortlist includes the eligible student", ids.includes(aliceId), r);
  step(G, "Auto-shortlist excludes CGPA below minimum", !ids.includes(String(low._id)));
  step(G, "Auto-shortlist excludes other branch", !ids.includes(String(mech._id)));
  step(G, "Auto-shortlist excludes other year", !ids.includes(String(third._id)));
  step(G, "Auto-shortlist excludes pending account", !ids.includes(String(pend._id)));
  const seen = async (id) => ((await call(gen(id), "GET", "/placement/drives")).body.data?.drives || []).some((d) => d._id === driveId);
  step(G, "Eligible student sees the drive", (await call(alice, "GET", "/placement/drives")).body.data?.drives?.some((d) => d._id === driveId));
  step(G, "Ineligible student does not see the drive", !(await seen(low._id)) && !(await seen(mech._id)));
  step(G, "Ineligible student cannot apply directly", (await call(gen(low._id), "POST", `/placement/drives/${driveId}/apply`)).status >= 400);
  r = await call(alice, "POST", `/placement/drives/${driveId}/apply`);
  step(G, "Eligible student applies", r.status === 201, r);
  const appId = r.body.data?.applicationId;
  step(G, "Second application refused", (await call(alice, "POST", `/placement/drives/${driveId}/apply`)).status >= 400);
  step(G, "Recruiter cannot read shortlist before it is sent", (await call(rita, "GET", `/recruiter/drives/${driveId}/shortlist`)).body.data?.students === undefined);
  step(G, "TPO cannot send the shortlist (admin only)", (await call(tpo, "POST", `/admin/drives/${driveId}/shortlist/send`)).status === 403);
  r = await call(admin, "POST", `/admin/drives/${driveId}/shortlist/send`);
  step(G, "Admin sends shortlist", r.status === 200, r);
  r = await call(rita, "GET", `/recruiter/drives/${driveId}/shortlist`);
  step(G, "Recruiter reads shortlist after it is sent", JSON.stringify(r.body).includes("Alice Good"), r);
  step(G, "Shortlist locked after sending", (await call(admin, "DELETE", `/admin/drives/${driveId}/shortlist/${aliceId}`)).status === 400);
  const rival = gen((await mk({ name: "Rival Rec", email: "rival@x.io", role: "recruiter", recruiterStatus: "approved" }))._id);
  step(G, "Another recruiter cannot open the drive", (await call(rival, "GET", `/recruiter/drives/${driveId}`)).status >= 400);
  r = await call(rita, "PATCH", `/recruiter/drives/${driveId}/applications/${appId}`, { roundResults: [{ roundId, status: "cleared" }], recruiterDecision: "recommended", recruiterRemarks: "Good" });
  step(G, "Recruiter records round result and decision", r.status === 200, r);
  const mine = async () => (await call(alice, "GET", "/placement/applications")).body.data?.applications?.[0];
  step(G, "Student does not see the recruiter decision", (await mine())?.recruiterDecision === undefined, await mine());
  r = await call(rita, "POST", `/recruiter/drives/${driveId}/submit-results`);
  step(G, "Recruiter submits results", r.status === 200, r);
  step(G, "Student cannot finalize", (await call(alice, "POST", `/tpo/drives/${driveId}/finalize`, { selections: [] })).status === 403);
  step(G, "Finalize must cover every application", (await call(tpo, "POST", `/tpo/drives/${driveId}/finalize`, { selections: [] })).status === 400);
  r = await call(tpo, "POST", `/tpo/drives/${driveId}/finalize`, { selections: [{ applicationId: appId, finalStatus: "selected" }] });
  step(G, "TPO finalizes selection", r.status === 200, r);
  step(G, "Student sees the final result", (await mine())?.progress?.key === "selected", await mine());

  /* ---------- Admin ---------- */
  G = "Admin controls";
  step(G, "Statistics available", (await call(admin, "GET", "/admin/stats")).status === 200);
  r = await call(admin, "GET", "/admin/certificates");
  step(G, "Certificate queue available", r.status === 200, r);
  r = await call(admin, "PATCH", `/admin/students/${aliceId}/status`, { isActive: false });
  step(G, "Admin deactivates account", r.status === 200, r);
  step(G, "Deactivated token refused immediately", (await call(alice, "GET", "/profile")).status === 403);
  step(G, "Deactivated login refused", (await call(null, "POST", "/auth/login", { email: "alice@x.io", password: pw })).status >= 400);
  await call(admin, "PATCH", `/admin/students/${aliceId}/status`, { isActive: true });
  step(G, "Reactivated account has access", (await call(alice, "GET", "/profile")).status === 200);
  step(G, "TPO cannot delete students", (await call(tpo, "DELETE", `/admin/students/${low._id}`)).status === 403);
  step(G, "Admin deletes a student", (await call(admin, "DELETE", `/admin/students/${low._id}`)).status === 200);

  srv.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  const groups = {};
  for (const x of results) {
    groups[x.group] = groups[x.group] || { passed: 0, failed: 0 };
    groups[x.group][x.ok ? "passed" : "failed"]++;
  }
  console.log(JSON.stringify(groups, null, 1));
  const failed = results.filter((x) => !x.ok).length;
  console.log(failed ? `WORKFLOW CHECKS: ${failed} of ${results.length} FAILED` : `WORKFLOW CHECKS PASSED: ${results.length} of ${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
