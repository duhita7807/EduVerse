const Student = require("../models/Student");
const Analytics = require("../models/Analytics");
const { asyncHandler } = require("../middleware/errorHandler");

const analyticsService = require("../services/analyticsService");
const skillGapService = require("../services/skillGapService");
const learningRecommendationService = require("../services/learningRecommendationService");
const projectRecommendationService = require("../services/projectRecommendationService");
const aiAnalyticsService = require("../services/aiAnalyticsService");
const { SUPPORTED_ROLES, getRolesForBranch, getBranchGroupLabel, getRoleGroups } = require("../config/careerRoles");
const { calculateProfileCompletion } = require("../services/profileCompletionService");

// A profile below this completion % is treated as "not enough data yet"
// so we don't hand the student a misleadingly confident score (spec section 20).
const MIN_COMPLETION_FOR_FULL_ANALYSIS = 30;

/**
 * Loads the requesting student from the JWT (never from a body/query id —
 * spec section 11: "identify the student from the authenticated JWT").
 * Throws a 404-style error if somehow missing (e.g. deleted account).
 */
const loadStudentOrFail = async (req) => {
  const student = await Student.findById(req.student._id);
  if (!student) {
    const err = new Error("Student profile not found");
    err.statusCode = 404;
    throw err;
  }
  // Keep the stored completion % in sync with the profile (TPO lists sort/filter on it).
  const live = calculateProfileCompletion(student);
  if (live !== student.profileCompletion) {
    student.profileCompletion = live;
    await Student.updateOne({ _id: student._id }, { $set: { profileCompletion: live } });
  }
  return student;
};

const validateTargetRole = (targetRole) => {
  if (!targetRole || !SUPPORTED_ROLES.includes(targetRole)) {
    const err = new Error(`Please select a valid career role. Supported roles: ${SUPPORTED_ROLES.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }
};

/**
 * @route   GET /api/analytics/readiness
 * @desc    Placement readiness score + breakdown + strengths/weaknesses
 * @access  Private
 */
const getReadiness = asyncHandler(async (req, res) => {
  const student = await loadStudentOrFail(req);
  const analysis = analyticsService.calculateReadinessAnalysis(student);

  res.json({
    success: true,
    data: {
      ...analysis,
      profileCompleteness: student.profileCompletion || 0,
      lowDataWarning: (student.profileCompletion || 0) < MIN_COMPLETION_FOR_FULL_ANALYSIS,
    },
  });
});

/**
 * @route   POST /api/analytics/skill-gap
 * @desc    Compare student's skills against a target role's requirements
 * @access  Private
 * @body    { targetRole: string }
 */
const getSkillGap = asyncHandler(async (req, res) => {
  const { targetRole } = req.body;
  validateTargetRole(targetRole);

  const student = await loadStudentOrFail(req);
  const gap = skillGapService.analyzeSkillGap(student, targetRole);

  res.json({ success: true, data: gap });
});

/**
 * @route   GET /api/analytics/career-roles
 * @desc    Role list for populating the target-role picker on the frontend,
 *          split into roles relevant to the student's own branch
 *          (recommendedRoles) and every supported role (allRoles). Replaces
 *          a previous hardcoded, CS-only role list duplicated in the
 *          frontend, which also meant every student — regardless of branch
 *          — saw "Full Stack Developer" pre-selected by default.
 * @access  Private
 */
const getCareerRoles = asyncHandler(async (req, res) => {
  const student = await loadStudentOrFail(req);
  res.json({
    success: true,
    data: {
      allRoles: SUPPORTED_ROLES,
      recommendedRoles: getRolesForBranch(student.branch),
      roleGroups: getRoleGroups(student.branch),
      branchGroup: getBranchGroupLabel(student.branch),
      branch: student.branch,
    },
  });
});

/**
 * @route   GET /api/analytics/career-insights
 * @desc    Ranked list of suitable career paths with match %
 * @access  Private
 */
const getCareerInsights = asyncHandler(async (req, res) => {
  const student = await loadStudentOrFail(req);
  const insights = skillGapService.getCareerInsights(student);

  res.json({ success: true, data: { careerInsights: insights } });
});

/**
 * @route   GET /api/analytics/learning-recommendations?targetRole=...
 * @desc    Personalized learning roadmap for a target role
 * @access  Private
 */
const getLearningRecommendations = asyncHandler(async (req, res) => {
  let { targetRole } = req.query;

  // Fall back to the last analyzed role if none was passed explicitly.
  if (!targetRole) {
    const cached = await Analytics.findOne({ userId: req.student._id });
    targetRole = cached?.targetRole;
  }
  validateTargetRole(targetRole);

  const student = await loadStudentOrFail(req);
  const roadmap = learningRecommendationService.generateLearningRoadmap(student, targetRole);
  const projects = projectRecommendationService.recommendProjects(student, targetRole);

  res.json({ success: true, data: { ...roadmap, projectRecommendations: projects.recommendations } });
});

/**
 * @route   POST /api/analytics/analyze
 * @desc    Full analysis: readiness + skill gap + career insights +
 *          learning/project recommendations + AI summary. Persists the
 *          result to Analytics so subsequent dashboard loads can use the
 *          cache instead of re-running AI every time (spec section 21).
 * @access  Private
 * @body    { targetRole?: string }
 */
const runFullAnalysis = asyncHandler(async (req, res) => {
  const { targetRole } = req.body;
  if (targetRole) validateTargetRole(targetRole);

  const student = await loadStudentOrFail(req);

  const readiness = analyticsService.calculateReadinessAnalysis(student);
  const skillGap = targetRole ? skillGapService.analyzeSkillGap(student, targetRole) : null;
  const careerInsights = skillGapService.getCareerInsights(student);
  const learning = targetRole ? learningRecommendationService.generateLearningRoadmap(student, targetRole) : null;
  const projects = targetRole ? projectRecommendationService.recommendProjects(student, targetRole) : null;

  const aiInsights = await aiAnalyticsService.generateAiPlacementAnalysis(student, readiness, targetRole);

  const analyticsDoc = await Analytics.findOneAndUpdate(
    { userId: student._id },
    {
      userId: student._id,
      readinessScore: readiness.overallScore,
      readinessCategory: readiness.category,
      componentScores: readiness.componentScores,
      strengths: readiness.strengths,
      weaknesses: readiness.weaknesses,
      improvementAreas: readiness.improvementAreas,
      targetRole: targetRole || "",
      skillGaps: skillGap || {},
      careerInsights,
      learningRecommendations: learning?.roadmap || [],
      projectRecommendations: projects?.recommendations || [],
      aiSummary: aiInsights.summary,
      aiInsights: {
        strengths: aiInsights.strengths,
        weaknesses: aiInsights.weaknesses,
        careerInsights: aiInsights.careerInsights,
        skillRecommendations: aiInsights.skillRecommendations,
        learningRecommendations: aiInsights.learningRecommendations,
        projectRecommendations: aiInsights.projectRecommendations,
      },
      engine: readiness.engine,
      aiBasis: JSON.stringify(readiness.componentScores),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({
    success: true,
    data: {
      readiness,
      skillGap,
      careerInsights,
      learningRecommendations: learning?.roadmap || [],
      projectRecommendations: projects?.recommendations || [],
      aiInsights,
      profileCompleteness: student.profileCompletion || 0,
      lowDataWarning: (student.profileCompletion || 0) < MIN_COMPLETION_FOR_FULL_ANALYSIS,
      updatedAt: analyticsDoc.updatedAt,
    },
  });
});

/**
 * @route   GET /api/analytics/cached
 * @desc    The saved analysis, re-synced with the student's current data:
 *          every score and rule-based section is recalculated from MongoDB
 *          (cheap, no AI) and written back if it changed. Only the AI text is
 *          reused; `aiOutdated` says whether it was written for older scores.
 * @access  Private
 */
const getCachedAnalysis = asyncHandler(async (req, res) => {
  const analyticsDoc = await Analytics.findOne({ userId: req.student._id });
  if (!analyticsDoc) return res.json({ success: true, data: null });

  const student = await loadStudentOrFail(req);
  const readiness = analyticsService.calculateReadinessAnalysis(student);
  const role = analyticsDoc.targetRole;
  const live = {
    readinessScore: readiness.overallScore,
    readinessCategory: readiness.category,
    componentScores: readiness.componentScores,
    strengths: readiness.strengths,
    weaknesses: readiness.weaknesses,
    improvementAreas: readiness.improvementAreas,
    careerInsights: skillGapService.getCareerInsights(student),
    ...(role && {
      skillGaps: skillGapService.analyzeSkillGap(student, role),
      learningRecommendations: learningRecommendationService.generateLearningRoadmap(student, role).roadmap,
      projectRecommendations: projectRecommendationService.recommendProjects(student, role).recommendations,
    }),
  };

  const changed = JSON.stringify(analyticsDoc.componentScores) !== JSON.stringify(readiness.componentScores);
  if (changed) {
    analyticsDoc.set(live);
    await analyticsDoc.save();
  }

  res.json({
    success: true,
    data: {
      ...analyticsDoc.toObject(),
      ...live,
      readiness,
      profileCompleteness: student.profileCompletion,
      aiOutdated: Boolean(analyticsDoc.aiSummary) && analyticsDoc.aiBasis !== JSON.stringify(readiness.componentScores),
    },
  });
});

/**
 * @route   POST /api/analytics/roadmap/complete  body: { skill }
 * @desc    Mark a learning-roadmap task completed and add its skill to the
 *          student's profile (skills.tools), skipping case-insensitive duplicates.
 */
const completeRoadmapSkill = asyncHandler(async (req, res) => {
  const skill = typeof req.body.skill === "string" ? req.body.skill.trim() : "";
  if (!skill || skill.length > 60) {
    return res.status(400).json({ success: false, message: "A valid skill name is required." });
  }
  const student = req.student;
  const has = (list = []) => list.some((s) => s.toLowerCase() === skill.toLowerCase());
  const allSkills = Object.values(student.skills?.toObject?.() || {}).flat();
  if (!has(allSkills)) student.skills.tools.push(skill);
  if (!has(student.completedRoadmapSkills)) student.completedRoadmapSkills.push(skill);
  student.profileCompletion = calculateProfileCompletion(student);
  await student.save();
  res.json({ success: true, student: student.toSafeObject() });
});

module.exports = {
  completeRoadmapSkill,
  getReadiness,
  getCareerRoles,
  getSkillGap,
  getCareerInsights,
  getLearningRecommendations,
  runFullAnalysis,
  getCachedAnalysis,
};
