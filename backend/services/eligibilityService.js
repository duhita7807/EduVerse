/**
 * Single source of truth for "can this student see / apply to this drive?".
 * Used by the student endpoints (filtering + apply guard) and by the TPO view
 * (eligible-student count) so the rules can never drift apart.
 */

const norm = (v) => String(v || "").trim().toLowerCase();

/** Highest CGPA recorded in the student's education entries (null if none). */
const getStudentCgpa = (student) => {
  const values = (student.education || []).map((e) => e.cgpa).filter((n) => typeof n === "number" && !Number.isNaN(n));
  return values.length ? Math.max(...values) : null;
};

/**
 * Branch rule: empty list = all branches. Otherwise a drive branch matches when
 * either string contains the other, so "CSE" matches "CSE - Data Science".
 */
const branchMatches = (studentBranch, allowed = []) => {
  if (!allowed.length) return true;
  const sb = norm(studentBranch);
  return allowed.some((b) => {
    const db = norm(b);
    return db && (sb.includes(db) || db.includes(sb));
  });
};

/** @returns {{ eligible: boolean, reasons: string[] }} */
const checkEligibility = (student, drive) => {
  const reasons = [];
  const rules = drive.eligibility || {};

  if (rules.minCgpa > 0) {
    const cgpa = getStudentCgpa(student);
    if (cgpa === null) reasons.push(`Add your CGPA to your profile (minimum ${rules.minCgpa} required)`);
    else if (cgpa < rules.minCgpa) reasons.push(`Minimum CGPA ${rules.minCgpa} required (yours: ${cgpa})`);
  }
  if (!branchMatches(student.branch, rules.branches)) {
    reasons.push(`Open to: ${rules.branches.join(", ")}`);
  }
  if (rules.years?.length && !rules.years.includes(student.year)) {
    reasons.push(`Open to: ${rules.years.join(", ")}`);
  }

  return { eligible: reasons.length === 0, reasons };
};

module.exports = { getStudentCgpa, checkEligibility, branchMatches };
