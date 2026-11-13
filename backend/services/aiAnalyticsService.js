const geminiClient = require("./geminiClient");
const { getBranchGroupLabel } = require("../config/careerRoles");
const { analyzeSkillGap, getCareerInsights } = require("./skillGapService");
const { generateLearningRoadmap } = require("./learningRecommendationService");
const { recommendProjects } = require("./projectRecommendationService");

/**
 * Builds the MINIMUM profile context sent to the Cloud AI API.
 * Deliberately excludes: password, JWT token, email, roll number,
 * exact GitHub follower/following counts, and any other field not
 * needed for career analysis. This is the boundary described in
 * spec section 3 ("Do not send... unnecessary sensitive information").
 */
const buildSafeContext = (student, readiness, targetRole) => {
  return {
    branch: student.branch,
    branchField: getBranchGroupLabel(student.branch), // e.g. "Mechanical Engineering" — helps the model ground role suggestions in the right domain even for branches it has to reason about more generally
    year: student.year,
    skills: student.skills,
    careerInterests: student.careerInterests || [],
    education: (student.education || []).map((e) => ({ degree: e.degree, branch: e.branch, cgpa: e.cgpa })),
    projects: (student.projects || []).map((p) => ({ title: p.title, technologies: p.technologies })),
    internshipCount: (student.internships || []).length,
    certifications: (student.certifications || []).map((c) => c.title),
    githubStats: student.githubData?.username
      ? {
          publicRepos: student.githubData.publicRepos,
          topLanguages: [...new Set((student.githubData.repositories || []).map((r) => r.language))].filter(
            (l) => l && l !== "N/A"
          ),
        }
      : null,
    codingProfiles: {
      hasLeetcode: Boolean(student.leetcodeUsername),
      hasHackerrank: Boolean(student.hackerrankUsername),
    },
    targetRole: targetRole || null,
    // The backend-computed readiness score is passed in as ground truth so
    // the AI explains it rather than invents its own number (spec section 3 & 15).
    computedReadiness: {
      overallScore: readiness.overallScore,
      category: readiness.category,
      componentScores: readiness.componentScores,
    },
  };
};

const EXPECTED_KEYS = [
  "summary",
  "strengths",
  "weaknesses",
  "careerInsights",
  "skillRecommendations",
  "learningRecommendations",
  "projectRecommendations",
];
const ARRAY_KEYS = [
  "strengths",
  "weaknesses",
  "careerInsights",
  "skillRecommendations",
  "learningRecommendations",
  "projectRecommendations",
];

/**
 * Validates the AI's parsed response has the expected shape. Returns a
 * sanitized object with every key guaranteed present and correctly typed
 * (missing/malformed fields default to an empty string/array rather than
 * throwing), so a partially-good AI response is still usable.
 */
const sanitizeAiResponse = (parsed) => {
  const safe = {};
  EXPECTED_KEYS.forEach((key) => {
    if (ARRAY_KEYS.includes(key)) {
      safe[key] = Array.isArray(parsed[key]) ? parsed[key] : [];
    } else {
      safe[key] = typeof parsed[key] === "string" ? parsed[key] : "";
    }
  });
  return safe;
};

const buildFallbackResponse = (readiness, reason = "not_configured", student = null, targetRole = "") => {
  const messages = {
    not_configured: "Enable GEMINI_API_KEY in the backend .env to generate a live AI narrative.",
    invalid_key:
      "The configured GEMINI_API_KEY doesn't look like a valid Gemini API key, so AI narrative generation is " +
      "unavailable. An administrator needs to replace it with a key from https://aistudio.google.com/apikey.",
    transient: "AI narrative generation is temporarily unavailable — please try again shortly.",
  };
  const base = `Based on the current profile, overall placement readiness is ${readiness.overallScore}/100 (${readiness.category}).`;
  if (!student) {
    return { summary: `${base} ${messages[reason] || messages.transient}`, strengths: [], weaknesses: [], careerInsights: [], skillRecommendations: [], learningRecommendations: [], projectRecommendations: [] };
  }
  // Rule-based analysis from the student's own data, so it still changes with the chosen role.
  const gap = targetRole ? analyzeSkillGap(student, targetRole) : null;
  const roadmap = targetRole ? generateLearningRoadmap(student, targetRole).roadmap : [];
  const projects = targetRole ? recommendProjects(student, targetRole).recommendations : [];
  const roleLine = gap
    ? ` For ${targetRole}, the profile covers ${gap.coveragePercentage}% of the required skills${gap.missingSkills.length ? `; the main gaps are ${gap.missingSkills.slice(0, 3).join(", ")}` : ""}.`
    : "";
  return {
    summary: `${base}${roleLine} (Generated from your profile data because the AI service is unavailable.)`,
    strengths: [...readiness.strengths, ...(gap?.strongSkills.length ? [`Already has ${gap.strongSkills.slice(0, 5).join(", ")} for ${targetRole}`] : [])],
    weaknesses: [...readiness.weaknesses, ...(gap?.missingSkills.length ? [`Missing for ${targetRole}: ${gap.missingSkills.slice(0, 5).join(", ")}`] : [])],
    careerInsights: getCareerInsights(student, 3).map((c) => `${c.career} (${c.matchScore}% match): ${c.nextSteps}`),
    skillRecommendations: gap ? [...gap.missingSkills, ...gap.partialSkills].slice(0, 6) : [],
    learningRecommendations: roadmap.slice(0, 4).map((r) => `${r.skill} (${r.weekRange}): ${r.learningObjective}`),
    projectRecommendations: projects.slice(0, 3).map((p) => `${p.title}: ${p.whyItHelps}`),
  };
};

/**
 * Calls Gemini with the safe profile context and the already-computed
 * readiness score, asking it to EXPLAIN the result rather than predict
 * its own number. Falls back to a minimal deterministic response if no
 * API key is configured or the call/parse fails, so Module 3 stays
 * functional without AI configured (matches spec section 17: graceful
 * failure handling).
 */
const generateAiPlacementAnalysis = async (student, readiness, targetRole) => {
  if (!geminiClient.isConfigured()) {
    return buildFallbackResponse(readiness, "not_configured", student, targetRole);
  }

  const context = buildSafeContext(student, readiness, targetRole);

  const systemPrompt = `You are a career-readiness assistant for engineering students across ALL branches —
not just Computer Science. You are given a student's profile summary and a placement-readiness score that
has ALREADY been calculated by a separate scoring engine. Your job is to EXPLAIN that score and give career
guidance — do NOT invent or override the numerical score, and do NOT state or imply a placement probability
or guaranteed outcome. Use hedged language such as "Based on your current profile..." or "This is a
potentially suitable path...".

Ground every career and skill suggestion in the student's ACTUAL branch (see "branch" / "branchField" in the
profile data below) combined with their skills, projects, academic record, and stated career interests. A
Mechanical, Civil, Electrical, Electronics, or Chemical Engineering student should receive role and skill
suggestions relevant to THEIR branch (e.g. design, manufacturing, site engineering, embedded systems, process
engineering) — do not default to generic software-developer advice unless their branch, skills, or stated
interests actually point that way.

Respond ONLY with a valid JSON object (no markdown fences, no preamble) with exactly these keys:
{
  "summary": "2-4 sentence explanation of the readiness score and category, in third person",
  "strengths": ["short bullet points on the student's strongest areas"],
  "weaknesses": ["short bullet points on the weakest areas"],
  "careerInsights": ["short observations about career fit, hedged appropriately"],
  "skillRecommendations": ["specific skills worth prioritizing next"],
  "learningRecommendations": ["short actionable learning suggestions"],
  "projectRecommendations": ["short project ideas that would strengthen the profile"]
}`;

  try {
    const parsed = await geminiClient.generateJson({
      systemPrompt,
      contents: `Student profile data:\n${JSON.stringify(context, null, 2)}`,
      maxOutputTokens: 1200,
    });
    return sanitizeAiResponse(parsed);
  } catch (err) {
    // Cloud AI failure must never break the analytics endpoint — fall back
    // gracefully (spec section 17: "Cloud AI API failure" is a handled case).
    return buildFallbackResponse(readiness, err.code === "GEMINI_INVALID_KEY" ? "invalid_key" : "transient", student, targetRole);
  }
};

module.exports = { generateAiPlacementAnalysis, buildSafeContext, sanitizeAiResponse };
