const Student = require("../models/Student");
const { asyncHandler } = require("../middleware/errorHandler");
const { analyzeProfile } = require("../services/aiService");

/**
 * @route   POST /api/ai/analyze
 * @desc    Run AI analysis over the student's collected profile data to
 *          produce a summary, extracted skills, suggested categories and
 *          improvement suggestions. This is descriptive analysis only —
 *          NOT the placement-readiness prediction model (later module).
 * @access  Private
 */
const runProfileAnalysis = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.student._id);

  const insights = await analyzeProfile(student);

  student.aiInsights = insights;
  await student.save();

  res.json({ success: true, message: "AI analysis complete", aiInsights: student.aiInsights });
});

/**
 * @route   GET /api/ai/insights
 * @desc    Get the last generated AI insights without re-running analysis
 * @access  Private
 */
const getInsights = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.student._id);
  res.json({ success: true, aiInsights: student.aiInsights || {} });
});

module.exports = { runProfileAnalysis, getInsights };
