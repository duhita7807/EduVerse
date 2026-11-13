const bcrypt = require("bcryptjs");
const Student = require("../models/Student");

/**
 * Creates (or promotes) the Training & Placement Officer account from
 * TPO_EMAIL / TPO_PASSWORD in backend/.env on every server start.
 * Same idempotent behaviour as ensureAdmin: create if missing, otherwise
 * only make sure the role is "tpo" (the password is never touched).
 * Silent no-op if either variable is missing.
 */
const ensureTpo = async () => {
  const email = (process.env.TPO_EMAIL || "").trim().toLowerCase();
  const password = process.env.TPO_PASSWORD || "";
  if (!email || !password) return;

  try {
    const existing = await Student.findOne({ email });
    if (existing) {
      if (existing.role !== "tpo" && existing.role !== "admin") {
        existing.role = "tpo";
        await existing.save({ validateBeforeSave: false });
        console.log(`🎓  Promoted ${email} to TPO.`);
      }
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    await Student.create({
      name: process.env.TPO_NAME || "Training & Placement Officer",
      email,
      password: hashed,
      college: "EduVerse",
      branch: "Training & Placement",
      year: "4th Year",
      rollNo: "TPO-001",
      role: "tpo",
    });
    console.log(`🎓  TPO account created: ${email} — log in at /login, you'll land on /tpo`);
  } catch (err) {
    console.error(`⚠️  Could not create TPO account: ${err.message}`);
  }
};

module.exports = ensureTpo;
