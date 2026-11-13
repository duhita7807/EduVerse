const express = require("express");
const c = require("../controllers/messageController");
const { protect, requireRole, approvedRecruiter } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimiter");

const router = express.Router();
const sendLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: "You're sending messages too quickly." });

// Recruiters must be approved; TPO and admin skip that check.
router.use(protect, requireRole("recruiter", "tpo", "admin"), (req, res, next) => (req.student.role === "recruiter" ? approvedRecruiter(req, res, next) : next()));

router.get("/unread", c.unreadCount);
router.get("/threads", c.listThreads);
router.route("/threads/:recruiterId/messages").get(c.getMessages).post(sendLimiter, c.sendMessage);
router.post("/threads/:recruiterId/read", c.markRead);

module.exports = router;
