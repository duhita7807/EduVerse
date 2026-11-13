const express = require("express");
const rateLimit = require("../middleware/rateLimiter");
const {
  getReadiness,
  getCareerRoles,
  getSkillGap,
  getCareerInsights,
  getLearningRecommendations,
  runFullAnalysis,
  getCachedAnalysis,
  completeRoadmapSkill,
} = require("../controllers/analyticsController");
const { protect, requireRole, approvedStudent } = require("../middleware/auth"); // reuse existing Module 1 JWT middleware

const router = express.Router();

// Every analytics route requires a valid JWT — applied once here instead
// of repeating `protect` on each line.
router.use(protect, requireRole("student"), approvedStudent); // student features only (they spend AI quota)

router.get("/readiness", getReadiness);
router.get("/career-roles", getCareerRoles);
router.post("/skill-gap", getSkillGap);
router.get("/career-insights", getCareerInsights);
router.get("/learning-recommendations", getLearningRecommendations);
router.get("/cached", getCachedAnalysis);
router.post("/roadmap/complete", completeRoadmapSkill);

// AI analysis is the most expensive/rate-limit-worthy route (spec section 16).
router.post("/analyze", rateLimit({ windowMs: 60 * 1000, max: 5 }), runFullAnalysis);

module.exports = router;
