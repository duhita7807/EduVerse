/** Numeric model inputs. Shared by dataset export (training) and live prediction so they cannot drift apart. */
const { calculateProfileCompletion } = require("../services/profileCompletionService");
const { getStudentCgpa } = require("../services/eligibilityService");

const FEATURE_NAMES = [
  "cgpa", "skillCount", "projectCount", "projectTechCount", "internshipCount",
  "certificationCount", "hasGithub", "hasLinkedin", "publicRepos", "totalStars", "profileCompletion",
];

const distinct = (values) => new Set(values.map((v) => String(v).toLowerCase().trim())).size;

const featuresOf = (student) => {
  const s = student.skills || {};
  const projects = student.projects || [];
  const gh = student.githubData;
  const synced = Boolean(gh && gh.username); // same condition the readiness engine uses for GitHub credit
  return [
    getStudentCgpa(student) ?? 0,
    distinct([...(s.programmingLanguages || []), ...(s.webTechnologies || []), ...(s.databases || []), ...(s.tools || [])]),
    projects.length,
    distinct(projects.flatMap((p) => p.technologies || [])),
    (student.internships || []).length,
    (student.certifications || []).length,
    student.githubUsername ? 1 : 0,
    student.linkedinProfile ? 1 : 0,
    synced ? gh.publicRepos || 0 : 0,
    synced ? (gh.repositories || []).reduce((sum, r) => sum + (r.stars || 0), 0) : 0,
    calculateProfileCompletion(student),
  ];
};

module.exports = { FEATURE_NAMES, featuresOf };
