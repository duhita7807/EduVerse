/**
 * One-off: auto-shortlist drives approved before auto-shortlisting existed
 * (same rule as tpoController.reviewDrive). Drives that already have a
 * shortlist are left alone, so it's safe to re-run.
 *
 * USAGE: cd backend && node scripts/backfillShortlists.js [--refresh]
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("../models/Student");
const Drive = require("../models/Drive");
const { checkEligibility } = require("../services/eligibilityService");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const students = await Student.find({ role: "student", isActive: true, studentStatus: { $nin: ["pending", "rejected"] } }).select("branch year education");
  // --refresh also recomputes shortlists that exist but haven't been sent to the recruiter.
  const notDone = process.argv.includes("--refresh") ? { shortlistSentAt: { $exists: false } } : { shortlistedAt: { $exists: false } };
  const drives = await Drive.find({ status: { $in: ["approved", "results_submitted", "finalized"] }, ...notDone });

  for (const drive of drives) {
    const shortlist = students.filter((s) => checkEligibility(s, drive).eligible).map((s) => s._id);
    // $set only these fields: some older drives hold data the current schema rejects (e.g. round types).
    await Drive.updateOne({ _id: drive._id }, { $set: { shortlist, shortlistedAt: new Date() } });
    console.log(`✅ ${drive.company.name} — ${drive.title}: ${shortlist.length} shortlisted`);
  }
  console.log(`Done: ${drives.length} drive(s) backfilled.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
