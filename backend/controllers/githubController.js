const Student = require("../models/Student");
const { asyncHandler } = require("../middleware/errorHandler");
const { fetchGithubProfile } = require("../services/githubService");
const { calculateProfileCompletion } = require("../services/profileCompletionService");

/**
 * @route   POST /api/github/sync
 * @desc    Fetch the student's public GitHub data (repos, stars, forks, etc.)
 *          using the GitHub username saved on their profile, and cache it.
 * @access  Private
 */
const syncGithubProfile = asyncHandler(async (req, res) => {
  const { username } = req.body;
  const student = await Student.findById(req.student._id);

  const ghUsername = username || student.githubUsername;
  if (!ghUsername) {
    return res.status(400).json({ success: false, message: "No GitHub username provided or saved on profile" });
  }

  let githubData;
  try {
    githubData = await fetchGithubProfile(ghUsername);
  } catch (err) {
    // Not-found/bad-format/rate-limit are client-facing 400s; anything
    // else (network failure, GitHub outage) is a 502 — either way the
    // app must not crash, and the message must be meaningful.
    const isClientFacing = /valid GitHub username|profile not found|rate limit/i.test(err.message);
    return res.status(isClientFacing ? 400 : 502).json({ success: false, message: err.message });
  }

  student.githubUsername = ghUsername;
  student.githubData = githubData;
  student.profileCompletion = calculateProfileCompletion(student);
  await student.save();

  res.json({ success: true, message: "GitHub profile synced successfully", githubData: student.githubData });
});

/**
 * @route   GET /api/github
 * @desc    Get the last cached GitHub data for the student (no external call)
 * @access  Private
 */
const getGithubData = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.student._id);
  res.json({ success: true, githubData: student.githubData || {} });
});

module.exports = { syncGithubProfile, getGithubData };
