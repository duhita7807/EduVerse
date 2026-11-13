/**
 * Central place for every number the readiness engine uses.
 * Change these to tune scoring WITHOUT touching any service/controller code.
 */

// Component weights must sum to 100. Used by readinessService.calculateOverallReadiness().
const COMPONENT_WEIGHTS = {
  technicalSkills: 20,
  projects: 20,
  internships: 10,
  coding: 15, // GitHub + LinkedIn presence
  github: 15,
  certifications: 10,
  profileCompleteness: 10,
};

// Category thresholds — evaluated top-down, first match wins.
// Kept as an ordered array (not an object) so the "which bucket" logic
// in readinessService stays a simple loop instead of nested if/else.
const READINESS_CATEGORIES = [
  { min: 86, max: 100, label: "Highly Placement Ready" },
  { min: 71, max: 85, label: "Placement Ready" },
  { min: 51, max: 70, label: "Developing" },
  { min: 31, max: 50, label: "Needs Improvement" },
  { min: 0, max: 30, label: "Beginner" },
];

// Thresholds used inside individual component calculators (readinessService.js)
const SCORING_RULES = {
  projects: {
    fullCreditAt: 4, // number of projects that earns 100 on this component
    perProjectTechBonusCap: 20, // max bonus points for tech diversity across projects
  },
  internships: {
    fullCreditAt: 2,
  },
  certifications: {
    fullCreditAt: 3,
  },
  github: {
    reposFullCreditAt: 8,
    starsFullCreditAt: 15,
    reposWeight: 0.6,
    starsWeight: 0.4,
  },
  coding: {
    // Presence-based: full credit if both GitHub and LinkedIn are linked, partial if only one.
    bothProfilesScore: 100,
    oneProfileScore: 55,
    noProfileScore: 0,
  },
  technicalSkills: {
    // Full credit once a student has this many total distinct skills across all categories.
    fullCreditAtSkillCount: 12,
  },
};

module.exports = { COMPONENT_WEIGHTS, READINESS_CATEGORIES, SCORING_RULES };
