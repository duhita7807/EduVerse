const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const { asyncHandler } = require("../middleware/errorHandler");
const httpError = require("../utils/httpError");
const { subscribe } = require("../services/chatHub");

const PAGE_SIZE = 30;

/** @route GET /api/notifications?unread=1&before=<ISO date> — newest first. */
const listNotifications = asyncHandler(async (req, res) => {
  const filter = { user: req.student._id };
  if (req.query.unread === "1") filter.readAt = null;
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (Number.isNaN(before.getTime())) throw httpError(400, "Invalid date.");
    filter.createdAt = { $lt: before };
  }
  const page = await Notification.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE + 1).lean();
  res.json({ success: true, data: { notifications: page.slice(0, PAGE_SIZE), hasMore: page.length > PAGE_SIZE } });
});

/** @route GET /api/notifications/unread */
const unreadCount = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { count: await Notification.countDocuments({ user: req.student._id, readAt: null }) } });
});

/** @route POST /api/notifications/:id/read */
const markRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, "Invalid notification.");
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.student._id }, { $set: { readAt: new Date() } }, { new: true }).lean();
  if (!n) throw httpError(404, "Notification not found.");
  res.json({ success: true, data: n });
});

/** @route POST /api/notifications/read-all */
const markAllRead = asyncHandler(async (req, res) => {
  const r = await Notification.updateMany({ user: req.student._id, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ success: true, data: { updated: r.modifiedCount } });
});

/** @route GET /api/notifications/stream — the one live connection per tab: notifications and chat events. */
const stream = (req, res) => subscribe(req, res);

module.exports = { listNotifications, unreadCount, markRead, markAllRead, stream };
