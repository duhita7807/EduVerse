/**
 * One-off import of real student placement data (from the uploaded TNP
 * export) into the EduVerse database, as demo/test accounts.
 *
 * WHAT THIS DOES
 * Reads students.json (produced by transform.py from the original 192-column
 * spreadsheet — see NOTES.md in this folder for exactly which columns were
 * kept and why) and creates one Student document per entry, going through
 * the real Mongoose model so every validation rule (email format, year
 * enum, required fields, etc.) is actually enforced, not just approximated.
 *
 * Every imported account gets the SAME password, set below. This is demo
 * data — nobody in the source spreadsheet gave EduVerse a password, so one
 * had to be assigned. Change DEFAULT_PASSWORD before running if you want
 * something else, and change it again (or deactivate these accounts) before
 * this ever points at a real production database.
 *
 * USAGE
 *   cd backend
 *   node scripts/seedFromTNP.js [path/to/students.json]
 *
 * Safe to re-run: existing emails are skipped (upsert: false, duplicate-key
 * errors are caught and counted, not thrown).
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const { calculateProfileCompletion } = require("../services/profileCompletionService");

const DEFAULT_PASSWORD = "Student@123";
const DATA_PATH = process.argv[2] || path.join(__dirname, "students.json");

const run = async () => {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`❌ Can't find ${DATA_PATH}. Pass the path to students.json as an argument, or place it in backend/scripts/.`);
    process.exit(1);
  }
  const records = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  console.log(`Loaded ${records.length} records from ${DATA_PATH}`);

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`✅ Connected to ${mongoose.connection.name}`);

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let created = 0, skippedExisting = 0, failed = 0;
  const failures = [];

  for (const r of records) {
    try {
      const exists = await Student.exists({ email: r.email });
      if (exists) {
        skippedExisting++;
        continue;
      }

      const student = new Student({
        name: r.name,
        email: r.email,
        password: hashedPassword,
        college: r.college,
        branch: r.branch,
        year: r.year,
        rollNo: r.rollNo,
        bio: r.bio || "",
        skills: r.skills,
        projects: (r.projects || []).map((p) => ({ title: p.title, technologies: p.technologies })),
        internships: (r.internships || []).map((i) => ({
          company: i.company,
          startDate: i.startDate ? new Date(i.startDate) : undefined,
          endDate: i.endDate ? new Date(i.endDate) : undefined,
          description: i.description || "",
        })),
        certifications: (r.certifications || []).map((c) => ({ title: c.title, issuedBy: c.issuedBy })),
        githubUsername: r.githubUsername || "",
        linkedinProfile: r.linkedinProfile || "",
      });
      student.profileCompletion = calculateProfileCompletion(student);
      await student.save();
      created++;
    } catch (err) {
      failed++;
      failures.push({ email: r.email, rollNo: r.rollNo, error: err.message });
    }
  }

  console.log("\n--- Import summary ---");
  console.log(`Created:          ${created}`);
  console.log(`Already existed:  ${skippedExisting}`);
  console.log(`Failed:           ${failed}`);
  if (failures.length) {
    console.log("\nFirst failures:");
    failures.slice(0, 10).forEach((f) => console.log(`  ${f.rollNo} / ${f.email}: ${f.error}`));
  }
  console.log(`\nAll imported accounts share the password: ${DEFAULT_PASSWORD}`);
  console.log("Change this before using the database for anything beyond local testing.");

  await mongoose.disconnect();
  process.exit(failed > 0 && created === 0 ? 1 : 0);
};

run().catch((err) => {
  console.error("❌ Seed script crashed:", err);
  process.exit(1);
});
