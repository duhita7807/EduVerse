// Self-check for recruiter <-> TPO/admin chat: access control, validation, unread counts, read receipts
// and live delivery over the event stream. Throwaway DB (eduverse_selfcheck_messages, dropped after).
// Run: node scripts/selfcheckMessages.js
const B = require("path").join(__dirname, "..");
process.env.JWT_SECRET = "selfcheck";
const assert = require("assert");
const express = require(B + "/node_modules/express");
const mongoose = require(B + "/node_modules/mongoose");
const Student = require(B + "/models/Student");
const gen = require(B + "/utils/generateToken");
const { errorHandler } = require(B + "/middleware/errorHandler");

/** Opens the event stream and collects parsed events until close(). */
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
          const frame = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const type = /^event: (.*)$/m.exec(frame)?.[1];
          const data = /^data: (.*)$/m.exec(frame)?.[1];
          if (type && data) events.push({ type, data: JSON.parse(data) });
        }
      }
    } catch { /* aborted */ }
  })();
  return { status: res.status, type: res.headers.get("content-type"), events, close: () => ctrl.abort() };
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/eduverse_selfcheck_messages");
  await mongoose.connection.dropDatabase();
  const app = express();
  app.use(express.json());
  app.use("/api/messages", require(B + "/routes/messageRoutes"));
  app.use("/api/notifications", require(B + "/routes/notificationRoutes"));
  app.use(errorHandler);
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}/api`;
  const call = async (token, method, path, body) => {
    const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body && JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  const mk = (o) => Student.create({ password: "x".repeat(8), college: "C", branch: "CSE", year: "4th Year", rollNo: "R" + Math.random(), ...o });
  const rec = await mk({ name: "Rita Recruiter", email: "r@x.io", role: "recruiter", recruiterStatus: "approved", organization: "Acme" });
  const other = await mk({ name: "Omar Other", email: "o@x.io", role: "recruiter", recruiterStatus: "approved", organization: "Beta" });
  const pend = await mk({ name: "Pat Pending", email: "p@x.io", role: "recruiter", recruiterStatus: "pending" });
  const [rt, ot, pt] = [rec, other, pend].map((u) => gen(u._id));
  const tpo = gen((await mk({ name: "Tara Tpo", email: "t@x.io", role: "tpo" }))._id);
  const admin = gen((await mk({ name: "Adam Admin", email: "a@x.io", role: "admin" }))._id);
  const student = gen((await mk({ name: "Sam Student", email: "s@x.io" }))._id);
  const R = String(rec._id);

  // Access control
  assert.strictEqual((await call(student, "GET", "/messages/threads")).status, 403, "students cannot use chat");
  assert.strictEqual((await call(pt, "GET", "/messages/threads")).status, 403, "pending recruiters cannot use chat");
  assert.strictEqual((await call(ot, "GET", `/messages/threads/${R}/messages`)).status, 403, "recruiter cannot read another recruiter's chat");
  assert.strictEqual((await call(ot, "POST", `/messages/threads/${R}/messages`, { body: "hi" })).status, 403, "recruiter cannot post into another chat");
  assert.strictEqual((await call(tpo, "GET", `/messages/threads/${String((await Student.findOne({ email: "s@x.io" }))._id)}/messages`)).status, 404, "a student id is not a conversation");
  assert.strictEqual((await call(tpo, "GET", "/messages/threads/not-an-id/messages")).status, 400);

  // Validation
  assert.strictEqual((await call(rt, "POST", `/messages/threads/${R}/messages`, { body: "   " })).status, 400, "empty message rejected");
  assert.strictEqual((await call(rt, "POST", `/messages/threads/${R}/messages`, { body: "x".repeat(2001) })).status, 400, "over-long message rejected");

  // Live delivery: TPO, admin and the recruiter receive it; another recruiter does not.
  const [sTpo, sAdmin, sRec, sOther] = await Promise.all([tpo, admin, rt, ot].map((t) => listen(base, t)));
  assert.strictEqual(sTpo.status, 200);
  assert.match(sTpo.type, /text\/event-stream/);
  let r = await call(rt, "POST", `/messages/threads/${R}/messages`, { body: "  Hello placement cell  " });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.data.body, "Hello placement cell", "message trimmed");
  assert.strictEqual(r.body.data.senderRole, "recruiter");
  await wait(300);
  for (const [name, s] of [["TPO", sTpo], ["admin", sAdmin], ["recruiter", sRec]]) {
    assert.ok(s.events.some((e) => e.type === "message" && e.data.message.body === "Hello placement cell" && e.data.recruiterId === R), `${name} receives the message live`);
  }
  assert.strictEqual(sOther.events.length, 0, "another recruiter receives nothing");

  // Unread counts and threads
  r = await call(tpo, "GET", "/messages/threads");
  const row = r.body.data.find((t) => String(t.recruiter._id) === R);
  assert.strictEqual(row.unread, 1, "staff sees 1 unread");
  assert.strictEqual(r.body.data[0].recruiter._id, R, "thread with activity listed first");
  assert.ok(r.body.data.some((t) => String(t.recruiter._id) === String(other._id) && t.unread === 0), "approved recruiter without messages is listed");
  assert.ok(!r.body.data.some((t) => String(t.recruiter._id) === String(pend._id)), "pending recruiter not listed");
  assert.strictEqual((await call(admin, "GET", "/messages/unread")).body.data.count, 1, "admin badge counts it");
  assert.strictEqual((await call(rt, "GET", "/messages/unread")).body.data.count, 0, "sender has nothing unread");
  assert.strictEqual((await call(ot, "GET", "/messages/threads")).body.data.length, 1, "recruiter sees only their own thread");

  // Reply from TPO: recruiter unread rises; reading clears it and broadcasts a receipt.
  await call(tpo, "POST", `/messages/threads/${R}/messages`, { body: "Hi Rita, how can we help?" });
  assert.strictEqual((await call(admin, "GET", "/messages/unread")).body.data.count, 0, "staff reply marks the thread read for staff");
  assert.strictEqual((await call(rt, "GET", "/messages/unread")).body.data.count, 1, "recruiter has 1 unread");
  await call(rt, "POST", `/messages/threads/${R}/read`);
  await wait(300);
  assert.strictEqual((await call(rt, "GET", "/messages/unread")).body.data.count, 0, "reading clears unread");
  assert.ok(sTpo.events.some((e) => e.type === "read" && e.data.side === "recruiter"), "staff get the read receipt live");

  // History and paging
  r = await call(admin, "GET", `/messages/threads/${R}/messages`);
  assert.deepStrictEqual(r.body.data.messages.map((m) => m.body), ["Hello placement cell", "Hi Rita, how can we help?"], "oldest first");
  assert.strictEqual(r.body.data.messages[1].sender.name, "Tara Tpo");
  assert.ok(new Date(r.body.data.recruiterReadAt) >= new Date(r.body.data.messages[1].createdAt), "receipt shows TPO reply was seen");
  const Message = require(B + "/models/Message");
  const t0 = Date.now() + 1000;
  await Message.insertMany(Array.from({ length: 55 }, (_, i) => ({ recruiter: rec._id, sender: rec._id, senderRole: "recruiter", body: `m${i}`, createdAt: new Date(t0 + i) })));
  r = await call(admin, "GET", `/messages/threads/${R}/messages`);
  assert.strictEqual(r.body.data.messages.length, 50, "page size 50");
  assert.ok(r.body.data.hasMore);
  const older = await call(admin, "GET", `/messages/threads/${R}/messages?before=${encodeURIComponent(r.body.data.messages[0].createdAt)}`);
  assert.ok(older.body.data.messages.length > 0 && new Date(older.body.data.messages.at(-1).createdAt) < new Date(r.body.data.messages[0].createdAt), "older page loads");

  // Rate limit: 30 sends per minute per user.
  const codes = [];
  const fresh = await mk({ name: "Fay Fresh", email: "f@x.io", role: "recruiter", recruiterStatus: "approved" });
  for (let i = 0; i < 31; i++) codes.push((await call(gen(fresh._id), "POST", `/messages/threads/${fresh._id}/messages`, { body: `n${i}` })).status);
  assert.ok(codes.slice(0, 30).every((c) => c === 201) && codes[30] === 429, `30 allowed then limited: ${codes.slice(-3)}`);

  [sTpo, sAdmin, sRec, sOther].forEach((s) => s.close());
  srv.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log("MESSAGE CHECKS PASSED");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
