const mongoose = require("mongoose");
const Student = require("../models/Student");
const Analytics = require("../models/Analytics");
const Assessment = require("../models/Assessment");
const { ASSESSMENT_TYPES, LEVELS } = require("../models/Assessment");
const { asyncHandler } = require("../middleware/errorHandler");
const httpError = require("../utils/httpError");
const geminiClient = require("../services/geminiClient");
const assessmentService = require("../services/assessmentService");
const { buildSeriesTest, TRACKS, TESTS_PER_STAGE, branchGroupOf } = require("../config/series");

/** Hides aptitude answers until the attempt is completed. */
const toClient = (a) => {
  const obj = a.toObject ? a.toObject() : a;
  if (obj.status !== "completed") {
    obj.questions = obj.questions.map(({ correctIndex, explanation, keyPoints, ...q }) => q);
  }
  return obj;
};

const ownAssessment = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, "Invalid assessment id.");
  const a = await Assessment.findOne({ _id: req.params.id, userId: req.student._id });
  if (!a) throw httpError(404, "Assessment not found.");
  return a;
};

/** @route GET /api/career-assistant/assessments — history + whether AI is on */
const listAssessments = asyncHandler(async (req, res) => {
  const items = await Assessment.find({ userId: req.student._id })
    .select("type level testNo track seriesBranch source status score aiReviewed createdAt completedAt")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  // A key that is present but malformed would fail on every call, so treat it as off.
  const aiEnabled = geminiClient.isConfigured() && geminiClient.isValidKeyShape(process.env.GEMINI_API_KEY);
  res.json({ success: true, data: { aiEnabled, items } });
});

/** @route POST /api/career-assistant/assessments  body: { type, level } */
const startAssessment = asyncHandler(async (req, res) => {
  const { type, level } = req.body;
  if (!ASSESSMENT_TYPES.includes(type)) throw httpError(400, `type must be one of: ${ASSESSMENT_TYPES.join(", ")}.`);
  if (!LEVELS.includes(level)) throw httpError(400, `level must be one of: ${LEVELS.join(", ")}.`);

  // Test series: fixed, generated questions; no AI involved.
  if (type === "series") {
    const testNo = Number(req.body.testNo);
    if (!Number.isInteger(testNo) || testNo < 1 || testNo > TESTS_PER_STAGE) throw httpError(400, `testNo must be 1-${TESTS_PER_STAGE}.`);
    const track = req.body.track || "aptitude";
    if (!TRACKS.includes(track)) throw httpError(400, `track must be one of: ${TRACKS.join(", ")}.`);
    const seriesBranch = track === "technical" ? branchGroupOf(req.student.branch) : "";
    const questions = buildSeriesTest(track, level, testNo, req.student.branch);
    const a = await Assessment.create({ userId: req.student._id, type, level, testNo, track, seriesBranch, source: "bank", questions });
    return res.status(201).json({ success: true, data: toClient(a) });
  }

  const [student, analytics] = await Promise.all([Student.findById(req.student._id), Analytics.findOne({ userId: req.student._id })]);
  const { questions, source } = await assessmentService.generateQuestions({ type, level, student, analytics });

  const a = await Assessment.create({ userId: req.student._id, type, level, source, questions });
  res.status(201).json({ success: true, data: toClient(a) });
});

/** @route GET /api/career-assistant/assessments/:id */
const getAssessment = asyncHandler(async (req, res) => {
  res.json({ success: true, data: toClient(await ownAssessment(req)) });
});

/** @route POST /api/career-assistant/assessments/:id/submit  body: { answers: string[] } */
const submitAssessment = asyncHandler(async (req, res) => {
  const a = await ownAssessment(req);
  if (a.status === "completed") throw httpError(400, "This assessment has already been submitted.");

  const { answers } = req.body;
  if (!Array.isArray(answers) || answers.length !== a.questions.length) {
    throw httpError(400, `Send exactly ${a.questions.length} answers (use an empty string to skip).`);
  }
  const clean = answers.map((x) => String(x ?? "").slice(0, 6000));
  if (clean.every((x) => !x.trim())) throw httpError(400, "Answer at least one question before submitting.");

  const [student, analytics] = await Promise.all([Student.findById(req.student._id), Analytics.findOne({ userId: req.student._id })]);
  const result = await assessmentService.evaluate({ type: a.type, level: a.level, questions: a.questions, answers: clean, student, analytics });

  Object.assign(a, result, { answers: clean, status: "completed", completedAt: new Date() });
  await a.save();
  res.json({ success: true, data: toClient(a) });
});

/** @route DELETE /api/career-assistant/assessments/:id */
const deleteAssessment = asyncHandler(async (req, res) => {
  const a = await ownAssessment(req);
  await a.deleteOne();
  res.json({ success: true });
});

module.exports = { listAssessments, startAssessment, getAssessment, submitAssessment, deleteAssessment };
