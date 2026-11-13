const { COMPONENT_WEIGHTS, READINESS_CATEGORIES, SCORING_RULES } = require("../config/readinessWeights");
const { calculateProfileCompletion } = require("./profileCompletionService");

/** Clamp any number into the 0-100 range and round to a whole number. */
const clampScore = (n) => Math.round(Math.max(0, Math.min(100, n)));

/**
 * Technical skills — scored on how many distinct skills the student has
 * listed across all four skill categories, up to a configurable cap.
 */
const calculateTechnicalSkillScore = (student) => {
  const s = student.skills || {};
  const totalSkills = new Set(
    [...(s.programmingLanguages || []), ...(s.webTechnologies || []), ...(s.databases || []), ...(s.tools || [])].map(
      (x) => x.toLowerCase().trim()
    )
  ).size;

  const cap = SCORING_RULES.technicalSkills.fullCreditAtSkillCount;
  return clampScore((totalSkills / cap) * 100);
};

/**
 * Projects — rewards both quantity (up to fullCreditAt) and technology
 * diversity across projects (a small bonus, capped).
 */
const calculateProjectScore = (student) => {
  const projects = student.projects || [];
  const { fullCreditAt, perProjectTechBonusCap } = SCORING_RULES.projects;

  if (projects.length === 0) return 0;

  const quantityScore = Math.min(100, (projects.length / fullCreditAt) * 100);

  const distinctTech = new Set(
    projects.flatMap((p) => (p.technologies || []).map((t) => t.toLowerCase().trim()))
  ).size;
  const diversityBonus = Math.min(perProjectTechBonusCap, distinctTech * 2);

  // Diversity is a bonus on top of quantity, but the total is still capped at 100.
  return clampScore(quantityScore * (1 - perProjectTechBonusCap / 100) + diversityBonus);
};

/** Internships — full credit at a configurable count, partial otherwise. */
const calculateInternshipScore = (student) => {
  const count = (student.internships || []).length;
  const { fullCreditAt } = SCORING_RULES.internships;
  return clampScore((count / fullCreditAt) * 100);
};

/**
 * Online presence — presence-based: GitHub and LinkedIn both linked is full
 * credit, one of them is partial credit.
 */
const calculateCodingScore = (student) => {
  const { bothProfilesScore, oneProfileScore, noProfileScore } = SCORING_RULES.coding;
  const hasGithub = Boolean(student.githubUsername);
  const hasLinkedin = Boolean(student.linkedinProfile);

  if (hasGithub && hasLinkedin) return bothProfilesScore;
  if (hasGithub || hasLinkedin) return oneProfileScore;
  return noProfileScore;
};

/**
 * GitHub — blends repository count and total stars (both capped), using
 * the cached githubData synced in Module 2. Returns 0 if never synced.
 */
const calculateGithubScore = (student) => {
  const gh = student.githubData;
  if (!gh || !gh.username) return 0;

  const { reposFullCreditAt, starsFullCreditAt, reposWeight, starsWeight } = SCORING_RULES.github;

  const repoScore = Math.min(100, ((gh.publicRepos || 0) / reposFullCreditAt) * 100);
  const totalStars = (gh.repositories || []).reduce((sum, r) => sum + (r.stars || 0), 0);
  const starScore = Math.min(100, (totalStars / starsFullCreditAt) * 100);

  return clampScore(repoScore * reposWeight + starScore * starsWeight);
};

/** Certifications — full credit at a configurable count. */
const calculateCertificationScore = (student) => {
  const count = (student.certifications || []).length;
  const { fullCreditAt } = SCORING_RULES.certifications;
  return clampScore((count / fullCreditAt) * 100);
};

/** Profile completeness — computed live from the profile (the stored % can lag). */
const calculateProfileCompletenessScore = (student) => clampScore(calculateProfileCompletion(student));

/** Maps a 0-100 score to its configured category label. */
const getReadinessCategory = (score) => {
  const match = READINESS_CATEGORIES.find((c) => score >= c.min && score <= c.max);
  return match ? match.label : "Unrated";
};

/**
 * Combines every component score using the configured weights into a
 * single explainable overall readiness score.
 */
const calculateOverallReadiness = (student) => {
  const componentScores = {
    technicalSkills: calculateTechnicalSkillScore(student),
    projects: calculateProjectScore(student),
    internships: calculateInternshipScore(student),
    coding: calculateCodingScore(student),
    github: calculateGithubScore(student),
    certifications: calculateCertificationScore(student),
    profileCompleteness: calculateProfileCompletenessScore(student),
  };

  const overallScore = clampScore(
    Object.entries(componentScores).reduce((sum, [key, score]) => {
      const weight = COMPONENT_WEIGHTS[key] || 0;
      return sum + (score * weight) / 100;
    }, 0)
  );

  return {
    overallScore,
    category: getReadinessCategory(overallScore),
    componentScores,
  };
};

module.exports = {
  calculateTechnicalSkillScore,
  calculateProjectScore,
  calculateInternshipScore,
  calculateCodingScore,
  calculateGithubScore,
  calculateCertificationScore,
  calculateProfileCompletenessScore,
  calculateOverallReadiness,
  getReadinessCategory,
};
