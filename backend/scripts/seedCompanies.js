/**
 * Imports a recruiter + company dataset (companies.json) into the EduVerse
 * database, mirroring seedFromTNP.js for students.
 *
 * Every recruiter is created "pending" and every drive "pending", so they go
 * through the normal Admin/TPO approval: approving the recruiter (Recruiters
 * page) and then its drive auto-shortlists the eligible students.
 *
 * FORMAT — an array of:
 *   {
 *     "recruiter": { "name": "Priya Shah", "email": "priya@acme.com" },
 *     "company":   { "name": "Acme", "website": "", "industry": "", "about": "" },
 *     "drives": [{
 *       "title": "Graduate Engineer Trainee", "jobType": "full-time",
 *       "location": "Pune", "ctc": "6 LPA", "openings": 10, "description": "",
 *       "eligibility": { "minCgpa": 0, "branches": ["Computer Science"], "years": ["4th Year"] },
 *       "applicationDeadline": "2026-12-31"
 *     }]
 *   }
 * Drive fields are validated by utils/drivePayload.js (same rules as the UI).
 *
 * USAGE
 *   cd backend
 *   node scripts/seedCompanies.js [path/to/companies.json]
 *
 * Safe to re-run: existing recruiter emails and same-title drives are skipped.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const Drive = require("../models/Drive");
const { buildDrivePayload } = require("../utils/drivePayload");

const DEFAULT_PASSWORD = "Recruiter@123";
const DATA_PATH = process.argv[2] || path.join(__dirname, "companies.json");

const run = async () => {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`❌ Can't find ${DATA_PATH}. Pass the path to companies.json as an argument, or place it in backend/scripts/.`);
    process.exit(1);
  }
  const companies = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  if (!Array.isArray(companies)) throw new Error("companies.json must be an array.");

  await mongoose.connect(process.env.MONGO_URI);
  const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const counts = { recruiters: 0, drives: 0, skipped: 0, failed: 0 };

  for (const [i, entry] of companies.entries()) {
    try {
      const org = String(entry.company?.name || "").trim();
      const email = String(entry.recruiter?.email || "").trim().toLowerCase();
      if (!org || !email) throw new Error("recruiter.email and company.name are required");

      let recruiter = await Student.findOne({ email });
      if (recruiter && recruiter.role !== "recruiter") throw new Error(`${email} already belongs to a ${recruiter.role} account`);
      if (!recruiter) {
        recruiter = await Student.create({
          name: entry.recruiter.name || org,
          email,
          password,
          college: org,
          branch: "Recruitment",
          year: "4th Year",
          rollNo: `REC-${Date.now().toString(36).toUpperCase()}${i}`,
          role: "recruiter",
          organization: org,
          recruiterStatus: "pending",
        });
        counts.recruiters++;
      }

      for (const d of entry.drives || []) {
        const payload = buildDrivePayload({ ...d, company: entry.company });
        if (await Drive.exists({ recruiter: recruiter._id, title: payload.title })) {
          counts.skipped++;
          continue;
        }
        await Drive.create({ ...payload, recruiter: recruiter._id, status: "pending" });
        counts.drives++;
      }
    } catch (err) {
      counts.failed++;
      console.error(`⚠️  Entry ${i + 1}: ${err.message}`);
    }
  }

  console.log(`✅ ${counts.recruiters} recruiters, ${counts.drives} drives created; ${counts.skipped} drives skipped; ${counts.failed} entries failed.`);
  console.log(`   Recruiter password: ${DEFAULT_PASSWORD} — change it before production use.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
