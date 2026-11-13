/**
 * Query helpers for the TPO "Students" directory.
 *
 * Everything here is pure (no DB access) so the exact same filter that runs
 * against MongoDB can be unit-tested against plain JSON records.
 */
const { getStudentCgpa } = require("./eligibilityService");

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SKILL_PATHS = ["skills.programmingLanguages", "skills.webTechnologies", "skills.databases", "skills.tools"];

// Fields the free-text search looks through. Every token typed must match at
// least one of these, so "aadarsh nikam" finds "Aadarsh Sanjay Nikam".
const SEARCH_PATHS = [
  "name",
  "email",
  "rollNo",
  "college",
  "branch",
  "githubUsername",
  "careerInterests",
  "projects.title",
  "internships.company",
  "certifications.title",
  ...SKILL_PATHS,
];

// "Must have" toggles. Each maps to a condition on the student document.
const HAS_CONDITIONS = {
  projects: { "projects.0": { $exists: true } },
  internships: { "internships.0": { $exists: true } },
  certifications: { "certifications.0": { $exists: true } },
  github: { githubUsername: { $exists: true, $nin: ["", null] } },
  linkedin: { linkedinProfile: { $exists: true, $nin: ["", null] } },
};

const SORTS = {
  name: { name: 1, _id: 1 },
  rollNo: { rollNo: 1, _id: 1 },
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  completion: { profileCompletion: -1, name: 1, _id: 1 },
  cgpa: { "education.cgpa": -1, name: 1, _id: 1 },
};

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactCi = (value) => new RegExp(`^${escapeRegex(String(value).trim())}$`, "i");
const splitList = (v) =>
  String(v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * Translate the request's query string into a MongoDB filter.
 * Always restricted to role "student" — staff/recruiter accounts never appear.
 */
const buildStudentFilter = (q = {}) => {
  const and = [{ role: "student" }];

  // Free-text search: AND across words, OR across fields.
  const tokens = String(q.search || "").trim().slice(0, 80).split(/\s+/).filter(Boolean).slice(0, 5);
  tokens.forEach((token) => {
    const rx = new RegExp(escapeRegex(token), "i");
    and.push({ $or: SEARCH_PATHS.map((path) => ({ [path]: rx })) });
  });

  if (q.branch) and.push({ branch: exactCi(q.branch) });
  if (q.college) and.push({ college: exactCi(q.college) });
  if (YEARS.includes(q.year)) and.push({ year: q.year });

  if (q.status === "active") and.push({ isActive: { $ne: false } });
  if (q.status === "inactive") and.push({ isActive: false });

  // Every selected skill must be present (in any of the four skill groups).
  splitList(q.skills)
    .slice(0, 10)
    .forEach((skill) => {
      const rx = exactCi(skill);
      and.push({ $or: SKILL_PATHS.map((path) => ({ [path]: rx })) });
    });

  const minCgpa = Number(q.minCgpa);
  if (q.minCgpa !== undefined && q.minCgpa !== "" && !Number.isNaN(minCgpa)) {
    and.push({ "education.cgpa": { $gte: Math.min(10, Math.max(0, minCgpa)) } });
  }

  const minCompletion = Number(q.minCompletion);
  if (q.minCompletion !== undefined && q.minCompletion !== "" && !Number.isNaN(minCompletion) && minCompletion > 0) {
    and.push({ profileCompletion: { $gte: Math.min(100, minCompletion) } });
  }

  splitList(q.has).forEach((key) => {
    if (HAS_CONDITIONS[key]) and.push(HAS_CONDITIONS[key]);
  });

  return and.length === 1 ? and[0] : { $and: and };
};

const buildSort = (key) => SORTS[key] || SORTS.name;

/** Unique skill names (case-insensitive) across all four skill groups, original casing kept. */
const flattenSkills = (skills = {}) => {
  const seen = new Set();
  const out = [];
  SKILL_PATHS.forEach((path) => {
    (skills[path.split(".")[1]] || []).forEach((s) => {
      const label = String(s || "").trim();
      const key = label.toLowerCase();
      if (label && !seen.has(key)) {
        seen.add(key);
        out.push(label);
      }
    });
  });
  return out;
};

/** Compact row for the directory table. */
const toListRow = (s) => {
  const skills = flattenSkills(s.skills);
  return {
    _id: s._id,
    name: s.name,
    email: s.email,
    college: s.college,
    branch: s.branch,
    year: s.year,
    rollNo: s.rollNo,
    profilePhoto: s.profilePhoto || "",
    isActive: s.isActive !== false,
    createdAt: s.createdAt,
    lastLoginAt: s.lastLoginAt,
    profileCompletion: s.profileCompletion || 0,
    cgpa: getStudentCgpa(s),
    skills: skills.slice(0, 6),
    skillCount: skills.length,
    projectCount: s.projects?.length || 0,
    internshipCount: s.internships?.length || 0,
    certificationCount: s.certifications?.length || 0,
    githubUsername: s.githubUsername || "",
    linkedinProfile: s.linkedinProfile || "",
  };
};

// Projection for the list endpoint: only what toListRow needs. Nested array
// projections ("projects.title") keep the payload small while still giving counts.
const LIST_FIELDS =
  "name email college branch year rollNo profilePhoto isActive createdAt lastLoginAt profileCompletion " +
  "skills education.cgpa projects.title internships.company certifications.title githubUsername linkedinProfile";

module.exports = { YEARS, SKILL_PATHS, SEARCH_PATHS, HAS_CONDITIONS, LIST_FIELDS, exactCi, buildStudentFilter, buildSort, flattenSkills, toListRow };
