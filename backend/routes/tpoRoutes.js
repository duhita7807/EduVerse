const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const c = require("../controllers/tpoController");

const router = express.Router();

// TPO (and the platform admin) only.
router.use(protect, requireRole("tpo", "admin"));

router.get("/stats", c.getStats);
router.get("/drives", c.listDrives);
router.get("/drives/:id", c.getDrive);
router.patch("/drives/:id/review", c.reviewDrive);
router.get("/drives/:id/shortlist", c.getDriveShortlist);
router.post("/drives/:id/finalize", c.finalizeDrive);

// Student directory (declare "/students/facets" before "/students/:id").
router.get("/students", c.listStudents);
router.get("/students/facets", c.getStudentFacets);
router.get("/students/:id", c.getStudentDetail);

// Student verification.
router.get("/student-approvals", c.listStudentApprovals);
router.patch("/students/:id/approval", c.setStudentApproval);

// Recruiter verification.
router.get("/recruiters", c.listRecruiters);
router.patch("/recruiters/:id/status", c.setRecruiterStatus);


module.exports = router;
