/**
 * DEMO DATA: gives every student WITHOUT a CGPA one education entry with a
 * random CGPA (normal-ish around 7.2, clamped to 5.0–9.8), so drive criteria
 * like "min CGPA 7.5" have something to match. Students who already have a
 * CGPA are never touched. Profile completion is recomputed.
 *
 * The ids it changed are written to randomCgpa-ids.json; undo with
 *   node scripts/seedRandomCgpa.js --undo
 *
 * USAGE: cd backend && node scripts/seedRandomCgpa.js
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const { calculateProfileCompletion } = require("../services/profileCompletionService");

const IDS_PATH = path.join(__dirname, "randomCgpa-ids.json");

// Box-Muller normal sample, clamped and rounded to 2 decimals.
const randomCgpa = () => {
  const n = Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  return Math.round(Math.min(9.8, Math.max(5, 7.2 + n * 0.9)) * 100) / 100;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  if (process.argv.includes("--undo")) {
    const ids = JSON.parse(fs.readFileSync(IDS_PATH, "utf8"));
    const students = await Student.find({ _id: { $in: ids } }).lean();
    await Student.bulkWrite(students.map((s) => ({
      updateOne: { filter: { _id: s._id }, update: { $set: { education: [], profileCompletion: calculateProfileCompletion({ ...s, education: [] }) } } },
    })));
    console.log(`↩️  Removed random CGPA from ${students.length} students.`);
    return mongoose.disconnect();
  }

  const students = await Student.find({ role: "student", "education.cgpa": { $exists: false } }).lean();
  // Only students with no education at all; anyone with partial education data is left as-is.
  const targets = students.filter((s) => !s.education?.length);

  const ops = targets.map((s) => {
    const education = [{ degree: "B.E. / B.Tech", institution: s.college, branch: s.branch, cgpa: randomCgpa() }];
    return {
      updateOne: {
        filter: { _id: s._id },
        update: { $set: { education, profileCompletion: calculateProfileCompletion({ ...s, education }) } },
      },
    };
  });
  if (ops.length) await Student.bulkWrite(ops);

  const prev = fs.existsSync(IDS_PATH) ? JSON.parse(fs.readFileSync(IDS_PATH, "utf8")) : [];
  fs.writeFileSync(IDS_PATH, JSON.stringify([...prev, ...targets.map((s) => String(s._id))]));
  console.log(`✅ Random CGPA added to ${targets.length} students (${students.length - targets.length} skipped: had other education data).`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
