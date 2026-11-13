const express = require("express");
const { runProfileAnalysis, getInsights } = require("../controllers/aiController");
const { protect, requireRole, approvedStudent } = require("../middleware/auth");

const router = express.Router();

router.post("/analyze", protect, requireRole("student"), approvedStudent, runProfileAnalysis);
router.get("/insights", protect, requireRole("student"), approvedStudent, getInsights);

module.exports = router;
