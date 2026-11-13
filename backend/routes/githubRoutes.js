const express = require("express");
const { syncGithubProfile, getGithubData } = require("../controllers/githubController");
const { protect, requireRole, approvedStudent } = require("../middleware/auth");

const router = express.Router();

router.post("/sync", protect, requireRole("student"), approvedStudent, syncGithubProfile);
router.get("/", protect, requireRole("student"), approvedStudent, getGithubData);

module.exports = router;
