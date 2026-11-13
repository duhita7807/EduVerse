// Load test of the real server on a temporary copy of the database (eduverse_loadtest, dropped after).
// The main database is only read. Closed-loop virtual users, each a distinct student who waits 1-3 s between requests.
// Capacity rule, fixed before running: p95 < 1000 ms and errors < 1%.
// Writes ml/loadTest.json. Run: node scripts/loadTest.js
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const B = path.join(__dirname, "..");
require(B + "/node_modules/dotenv").config({ path: path.join(B, ".env") });
const mongoose = require(B + "/node_modules/mongoose");
const jwt = require(B + "/node_modules/jsonwebtoken");
const bcrypt = require(B + "/node_modules/bcryptjs");

const PORT = 5055;
const TEMP_URI = "mongodb://127.0.0.1:27017/eduverse_loadtest";
const SECRET = "loadtest-only";
const API = `http://127.0.0.1:${PORT}/api`;
const LEVELS = [50, 100, 200, 400, 800, 1600];
const STEP_MS = 60000;
const SOAK_MS = 300000;
const MIX = [["/auth/me", 20], ["/profile", 20], ["/analytics/readiness", 30], ["/placement/drives", 20], ["/placement/summary", 10]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0);
const pickPath = () => {
  let x = Math.random() * 100;
  for (const [p, w] of MIX) if ((x -= w) < 0) return p;
  return MIX[0][0];
};
const summary = (times, errors, ms) => {
  times.sort((a, b) => a - b);
  const total = times.length + errors;
  return {
    requests: total, errors, errorRate: total ? +((errors / total) * 100).toFixed(2) : 0, requestsPerSecond: +(total / (ms / 1000)).toFixed(1),
    meanMs: times.length ? +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : 0,
    p50Ms: +pct(times, 50).toFixed(1), p95Ms: +pct(times, 95).toFixed(1), p99Ms: +pct(times, 99).toFixed(1), maxMs: +(times[times.length - 1] || 0).toFixed(1),
  };
};
const hit = async (url, token, opts = {}) => {
  const t = performance.now();
  const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  await r.arrayBuffer();
  return { ms: performance.now() - t, ok: r.status < 400, status: r.status };
};
const runLevel = async (users, tokens, ms) => {
  const times = [];
  const statuses = {};
  let errors = 0;
  const end = Date.now() + ms;
  const user = async (i) => {
    await sleep(Math.random() * 2000); // ramp, so users do not all start in the same instant
    while (Date.now() < end) {
      try {
        const r = await hit(API + pickPath(), tokens[i % tokens.length]);
        if (r.ok) times.push(r.ms);
        else { errors++; statuses[r.status] = (statuses[r.status] || 0) + 1; }
      } catch (e) { errors++; statuses[e.name] = (statuses[e.name] || 0) + 1; }
      await sleep(1000 + Math.random() * 2000);
    }
  };
  await Promise.all(Array.from({ length: users }, (_, i) => user(i)));
  return { users, ...summary(times, errors, ms), errorTypes: statuses };
};
const passes = (r) => r.p95Ms < 1000 && r.errorRate < 1;

(async () => {
  const main = await mongoose.createConnection(process.env.MONGO_URI).asPromise();
  const temp = await mongoose.createConnection(TEMP_URI).asPromise();
  await temp.dropDatabase();
  const students = await main.collection("students").find({ role: "student" }).toArray();
  await temp.collection("students").insertMany(students);
  for (const c of ["drives", "applications"]) {
    const docs = await main.collection(c).find({}).toArray();
    if (docs.length) await temp.collection(c).insertMany(docs);
  }
  await main.close();
  const passwordUser = await temp.collection("students").insertOne({ name: "Load Test", email: "loadtest@x.io", password: await bcrypt.hash("Passw0rd!", 10), role: "student", isActive: true, college: "C", branch: "CSE", year: "4th Year", rollNo: "LT1" });
  const tokens = students.map((s) => jwt.sign({ id: String(s._id) }, SECRET, { expiresIn: "2h" }));
  void passwordUser;

  const server = spawn(process.execPath, ["server.js"], { cwd: B, stdio: "ignore", env: { ...process.env, MONGO_URI: TEMP_URI, PORT: String(PORT), JWT_SECRET: SECRET, NODE_ENV: "production", ADMIN_EMAIL: "", ADMIN_PASSWORD: "", TPO_EMAIL: "", TPO_PASSWORD: "" } });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { await sleep(500); up = await fetch(`${API}/health`).then((r) => r.ok).catch(() => false); }
  if (!up) throw new Error("server did not start");

  const report = {
    date: new Date().toISOString(),
    hardware: { cpu: os.cpus()[0].model, threads: os.cpus().length, ramGB: Math.round(os.totalmem() / 2 ** 30), os: os.platform() },
    setup: { server: "one Node.js process, NODE_ENV=production", database: "local MongoDB, temporary copy", students: students.length, generator: "same machine as the server", thinkTime: "1-3 s", mix: MIX, stepSeconds: STEP_MS / 1000, soakSeconds: SOAK_MS / 1000, capacityRule: "p95 < 1000 ms and errors < 1%" },
  };

  // Single-user baseline, plus login separately because bcrypt is deliberately slow.
  report.baseline = {};
  for (const [p] of MIX) {
    const t = [];
    for (let i = 0; i < 50; i++) t.push((await hit(API + p, tokens[i % tokens.length])).ms);
    report.baseline[p] = summary(t, 0, t.reduce((a, b) => a + b, 0));
  }
  const login = [];
  for (let i = 0; i < 20; i++) login.push((await hit(`${API}/auth/login`, "", { method: "POST", body: JSON.stringify({ email: "loadtest@x.io", password: "Passw0rd!" }) })).ms);
  report.baseline["/auth/login"] = summary(login, 0, login.reduce((a, b) => a + b, 0));

  // "node scripts/loadTest.js soak 200 100": repeat only the sustained run at lower levels, keeping earlier steps.
  if (process.argv[2] === "soak") {
    const old = JSON.parse(fs.readFileSync(path.join(B, "ml", "loadTest.json"), "utf8"));
    old.lowerSoaks = [];
    for (const users of process.argv.slice(3).map(Number)) {
      const r = await runLevel(users, tokens, SOAK_MS);
      r.passed = passes(r);
      old.lowerSoaks.push(r);
      console.log("soak", JSON.stringify(r));
      fs.writeFileSync(path.join(B, "ml", "loadTest.json"), JSON.stringify(old, null, 2));
      if (r.passed) break;
      await sleep(15000);
    }
    server.kill();
    await temp.dropDatabase();
    await temp.close();
    process.exit(0);
  }

  report.steps = [];
  let capacity = 0;
  for (const users of LEVELS) {
    const r = await runLevel(users, tokens, STEP_MS);
    report.steps.push(r);
    console.log(JSON.stringify(r));
    if (!passes(r)) break;
    capacity = users;
    await sleep(5000);
  }
  report.capacityUsers = capacity;
  report.reachedLimit = report.steps.some((s) => !passes(s));
  if (capacity) {
    await sleep(10000);
    report.soak = await runLevel(capacity, tokens, SOAK_MS);
    report.soak.passed = passes(report.soak);
    console.log("soak", JSON.stringify(report.soak));
  }
  fs.writeFileSync(path.join(B, "ml", "loadTest.json"), JSON.stringify(report, null, 2));
  server.kill();
  await temp.dropDatabase();
  await temp.close();
  console.log("LOAD TEST DONE. capacity", capacity, "users");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
