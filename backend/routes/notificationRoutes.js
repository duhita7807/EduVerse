const express = require("express");
const c = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Every signed-in user, including accounts still awaiting approval, so approval news reaches them.
router.use(protect);

router.get("/", c.listNotifications);
router.get("/unread", c.unreadCount);
router.get("/stream", c.stream);
router.post("/read-all", c.markAllRead);
router.post("/:id/read", c.markRead);

module.exports = router;
