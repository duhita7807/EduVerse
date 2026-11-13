const { COMPONENT_WEIGHTS } = require("../config/readinessWeights");
const predictionService = require("./predictionService");

// Human-readable labels for each component, used when building
// strengths/weaknesses text so the wording stays in one place.
const COMPONENT_LABELS = {
  technicalSkills: "technical skill coverage",
  projects: "project portfolio",
  internships: "internship experience",
  coding: "coding practice (LeetCode/HackerRank)",
  github: "GitHub presence",
  certifications: "certifications",
  profileCompleteness: "profile completeness",
};

const STRONG_THRESHOLD = 75;
const WEAK_THRESHOLD = 45;

/**
 * Turns component scores into plain-language strengths/weaknesses.
 * Kept rule-based (not AI) so the analytics response is available
 * instantly even if the Cloud AI call fails or is skipped.
 */
const deriveStrengthsAndWeaknesses = (componentScores) => {
  const strengths = [];
  const weaknesses = [];

  Object.entries(componentScores).forEach(([key, score]) => {
    const label = COMPONENT_LABELS[key] || key;
    if (score >= STRONG_THRESHOLD) {
      strengths.push(`Strong ${label} (${score}/100)`);
    } else if (score <= WEAK_THRESHOLD) {
      weaknesses.push(`Limited ${label} (${score}/100)`);
    }
  });

  return { strengths, weaknesses };
};

/**
 * Ranks the weakest components to suggest where the student should
 * focus next, lowest score first.
 */
const deriveImprovementAreas = (componentScores, limit = 3) => {
  return Object.entries(componentScores)
    .sort(([, a], [, b]) => a - b)
    .slice(0, limit)
    .map(([key, score]) => ({ area: COMPONENT_LABELS[key] || key, score }));
};

/**
 * Builds the full, explainable readiness analysis object described in the
 * Module 3 spec — this is the "analyticsService.calculateReadinessAnalysis"
 * entry point used by analyticsController.
 */
const calculateReadinessAnalysis = (student) => {
  const { overallScore, category, componentScores, engine, ml } = predictionService.predict(student);
  const { strengths, weaknesses } = deriveStrengthsAndWeaknesses(componentScores);
  const improvementAreas = deriveImprovementAreas(componentScores);

  return {
    overallScore,
    category,
    componentScores,
    strengths,
    weaknesses,
    improvementAreas,
    engine,
    ml,
    weights: COMPONENT_WEIGHTS, // so the UI can show how much each component counts
  };
};

module.exports = { calculateReadinessAnalysis, deriveStrengthsAndWeaknesses, deriveImprovementAreas };
