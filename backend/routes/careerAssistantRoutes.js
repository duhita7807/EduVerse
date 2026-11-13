const express = require("express");
const rateLimit = require("../middleware/rateLimiter");
const { protect, requireRole, approvedStudent } = require("../middleware/auth"); // reuse existing Module 1 JWT middleware
const {
  chat,
  interview,
  roadmap,
  learningPlan,
  listHistory,
  getConversation,
  deleteConversation,
  clearHistory,
} = require("../controllers/careerAssistantController");
const assessments = require("../controllers/assessmentController");

const router = express.Router();

router.use(protect, requireRole("student"), approvedStudent); // student features only (they spend AI quota)

// AI-driven endpoints share one rate limit bucket per student — generous
// enough for a real chat session, but enough to stop runaway/accidental
// request loops from burning through the Cloud AI quota.
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 15 });

router.post("/chat", aiLimiter, chat);
router.post("/interview", aiLimiter, interview);
router.post("/roadmap", aiLimiter, roadmap);
router.post("/learning-plan", aiLimiter, learningPlan);

// Practice assessments: aptitude, coding, technical mock interview, HR.
// Generating and reviewing hit the AI, so they share the AI rate limit.
router.get("/assessments", assessments.listAssessments);
router.post("/assessments", aiLimiter, assessments.startAssessment);
router.get("/assessments/:id", assessments.getAssessment);
router.post("/assessments/:id/submit", aiLimiter, assessments.submitAssessment);
router.delete("/assessments/:id", assessments.deleteAssessment);

router.get("/history", listHistory);
router.get("/history/:id", getConversation);
router.delete("/history/:id", deleteConversation);
router.delete("/history", clearHistory);

module.exports = router;
