const express = require("express");
const { protect, requireRole, approvedStudent } = require("../middleware/auth");
const c = require("../controllers/placementController");

const router = express.Router();

// Student-facing placement endpoints.
router.use(protect, requireRole("student"), approvedStudent);

router.get("/summary", c.getSummary);
router.get("/drives", c.listDrives);
router.post("/drives/:id/apply", c.applyToDrive);
router.get("/applications", c.listMyApplications);

module.exports = router;
