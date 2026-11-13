const express = require("express");
const { protect, requireRole, approvedRecruiter } = require("../middleware/auth");
const c = require("../controllers/recruiterController");

const router = express.Router();

// Recruiter-only. (Admins use the TPO routes to oversee drives.)
router.use(protect, requireRole("recruiter"), approvedRecruiter);

router.get("/stats", c.getStats);

router.route("/drives").get(c.listDrives).post(c.createDrive);
router.route("/drives/:id").get(c.getDrive).put(c.updateDrive).delete(c.deleteDrive);
router.put("/drives/:id/rounds", c.updateRounds);
router.patch("/drives/:id/applications/:applicationId", c.evaluateApplication);
router.post("/drives/:id/submit-results", c.submitResults);
router.get("/drives/:id/shortlist", c.getDriveShortlist);


module.exports = router;
