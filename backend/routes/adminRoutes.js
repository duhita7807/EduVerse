const express = require("express");
const { protect, adminOnly } = require("../middleware/auth");
const {
  getStats,
  listStudents,
  getStudent,
  setStudentStatus,
  deleteStudent,
  listCertificates,
  reviewCertificate,
  listShortlisted,
  removeFromShortlist,
  sendShortlist,
} = require("../controllers/adminController");

const router = express.Router();

// Every route here requires a valid, active student token AND role === "admin".
router.use(protect, adminOnly);

router.get("/stats", getStats);

router.get("/students", listStudents);
router.get("/students/:id", getStudent);
router.patch("/students/:id/status", setStudentStatus);
router.delete("/students/:id", deleteStudent);

router.get("/certificates", listCertificates);
router.patch("/certificates/:studentId/:certId", reviewCertificate);

// Shortlisted students.
router.get("/shortlisted", listShortlisted);

// Review + send a drive's auto-shortlist (viewed via /api/tpo/drives/:id/shortlist).
router.delete("/drives/:id/shortlist/:studentId", removeFromShortlist);
router.post("/drives/:id/shortlist/send", sendShortlist);

module.exports = router;
