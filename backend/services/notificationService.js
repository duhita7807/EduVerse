const Notification = require("../models/Notification");
const Student = require("../models/Student");
const { sendTo, STAFF } = require("./chatHub");

/**
 * Stores one notification per user and pushes it live. Never throws: a failed
 * notification must not undo or fail the action that triggered it.
 */
const notify = async (userIds, { type, title, body = "", link = "" }) => {
  try {
    const ids = [...new Set(userIds.map(String))];
    if (!ids.length) return;
    const docs = await Notification.insertMany(ids.map((user) => ({ user, type, title: title.slice(0, 160), body: body.slice(0, 500), link })));
    for (const d of docs) sendTo([d.user], "notification", d.toObject());
  } catch (err) {
    console.error("notification failed:", err.message);
  }
};

/** Notifies every active TPO and admin account. */
const notifyStaff = async (payload) => {
  try {
    const staff = await Student.find({ role: { $in: STAFF }, isActive: { $ne: false } }).select("_id").lean();
    await notify(staff.map((s) => s._id), payload);
  } catch (err) {
    console.error("notification failed:", err.message);
  }
};

module.exports = { notify, notifyStaff };
