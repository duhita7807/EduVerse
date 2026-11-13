const bcrypt = require("bcryptjs");
const Student = require("../models/Student");

/**
 * Creates (or promotes) the admin account from ADMIN_EMAIL / ADMIN_PASSWORD
 * in backend/.env on every server start. Idempotent:
 *  - no matching user -> create one with role "admin"
 *  - user exists       -> make sure role is "admin"; password is NOT touched
 *
 * If either env var is missing this is a silent no-op, so deployments that
 * don't want an admin account can simply leave them unset.
 *
 * NOTE: avoid a dotted Gmail address for ADMIN_EMAIL if the registration
 * validator normalizes Gmail addresses (strips dots) — otherwise the stored
 * email and the login lookup could disagree. A plain address is simplest.
 */
const ensureAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) return;

  try {
    const existing = await Student.findOne({ email });
    if (existing) {
      if (existing.role !== "admin") {
        existing.role = "admin";
        await existing.save({ validateBeforeSave: false });
        console.log(`🛡️  Promoted ${email} to admin.`);
      }
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    await Student.create({
      name: process.env.ADMIN_NAME || "EduVerse Admin",
      email,
      password: hashed,
      college: "EduVerse",
      branch: "Administration",
      year: "4th Year",
      rollNo: "ADMIN-001",
      role: "admin",
    });
    console.log(`🛡️  Admin account created: ${email} — log in at /login, you'll land on /admin`);
  } catch (err) {
    console.error(`⚠️  Could not create admin account: ${err.message}`);
  }
};

module.exports = ensureAdmin;
