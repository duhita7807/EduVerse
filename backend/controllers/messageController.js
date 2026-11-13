const mongoose = require("mongoose");
const Message = require("../models/Message");
const ChatThread = require("../models/ChatThread");
const Student = require("../models/Student");
const { asyncHandler } = require("../middleware/errorHandler");
const httpError = require("../utils/httpError");
const { publish, STAFF } = require("../services/chatHub");

const PAGE_SIZE = 50;
const RECRUITER_FIELDS = "name email organization recruiterStatus";
const isStaff = (user) => STAFF.includes(user.role);

/** Resolves :recruiterId to a thread the caller may use. Recruiters can only open their own. */
const threadOwner = async (req) => {
  const id = req.params.recruiterId;
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid conversation.");
  if (!isStaff(req.student)) {
    if (String(req.student._id) !== id) throw httpError(403, "You can only open your own conversation.");
    return req.student._id;
  }
  const recruiter = await Student.exists({ _id: id, role: "recruiter" });
  if (!recruiter) throw httpError(404, "Recruiter not found.");
  return recruiter._id;
};

const unreadFor = (user, recruiterId, thread) =>
  Message.countDocuments({
    recruiter: recruiterId,
    senderRole: isStaff(user) ? "recruiter" : { $in: STAFF },
    createdAt: { $gt: (isStaff(user) ? thread?.staffReadAt : thread?.recruiterReadAt) || new Date(0) },
  });

/**
 * @route GET /api/messages/threads
 * Staff: every approved recruiter (conversation or not), most recent first. Recruiter: their own conversation.
 */
const listThreads = asyncHandler(async (req, res) => {
  const recruiters = isStaff(req.student)
    ? await Student.find({ role: "recruiter", recruiterStatus: { $nin: ["pending", "rejected"] } }).select(RECRUITER_FIELDS).lean()
    : [req.student];
  const threads = await ChatThread.find({ recruiter: { $in: recruiters.map((r) => r._id) } }).lean();
  const byId = new Map(threads.map((t) => [String(t.recruiter), t]));
  const data = await Promise.all(
    recruiters.map(async (r) => {
      const t = byId.get(String(r._id));
      return {
        recruiter: { _id: r._id, name: r.name, email: r.email, organization: r.organization },
        lastMessage: t?.lastMessage || "",
        lastMessageAt: t?.lastMessageAt || null,
        unread: t ? await unreadFor(req.student, r._id, t) : 0,
      };
    })
  );
  data.sort((a, b) => (b.lastMessageAt ? +new Date(b.lastMessageAt) : 0) - (a.lastMessageAt ? +new Date(a.lastMessageAt) : 0) || a.recruiter.name.localeCompare(b.recruiter.name));
  res.json({ success: true, data });
});

/** @route GET /api/messages/unread — total unread messages, for the navigation badge. */
const unreadCount = asyncHandler(async (req, res) => {
  if (!isStaff(req.student)) {
    const thread = await ChatThread.findOne({ recruiter: req.student._id }).lean();
    return res.json({ success: true, data: { count: thread ? await unreadFor(req.student, req.student._id, thread) : 0 } });
  }
  const threads = await ChatThread.find().select("recruiter staffReadAt").lean();
  const counts = await Promise.all(threads.map((t) => unreadFor(req.student, t.recruiter, t)));
  res.json({ success: true, data: { count: counts.reduce((a, b) => a + b, 0) } });
});

/** @route GET /api/messages/threads/:recruiterId/messages?before=<ISO date> — newest page first, returned oldest-first. */
const getMessages = asyncHandler(async (req, res) => {
  const recruiterId = await threadOwner(req);
  const filter = { recruiter: recruiterId };
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (Number.isNaN(before.getTime())) throw httpError(400, "Invalid date.");
    filter.createdAt = { $lt: before };
  }
  const page = await Message.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE + 1).populate("sender", "name").lean();
  const thread = await ChatThread.findOne({ recruiter: recruiterId }).lean();
  res.json({
    success: true,
    data: {
      messages: page.slice(0, PAGE_SIZE).reverse(),
      hasMore: page.length > PAGE_SIZE,
      recruiterReadAt: thread?.recruiterReadAt || null,
      staffReadAt: thread?.staffReadAt || null,
    },
  });
});

/** @route POST /api/messages/threads/:recruiterId/messages  body: { body } */
const sendMessage = asyncHandler(async (req, res) => {
  const recruiterId = await threadOwner(req);
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
  if (!body) throw httpError(400, "Message can't be empty.");
  if (body.length > 2000) throw httpError(400, "Messages are limited to 2,000 characters.");

  const message = await Message.create({ recruiter: recruiterId, sender: req.student._id, senderRole: req.student.role, body });
  const now = message.createdAt;
  // Sending a message also means the sender has read everything before it.
  await ChatThread.updateOne(
    { recruiter: recruiterId },
    { $set: { lastMessage: body.slice(0, 140), lastMessageAt: now, [isStaff(req.student) ? "staffReadAt" : "recruiterReadAt"]: now } },
    { upsert: true }
  );
  const data = { ...message.toObject(), sender: { _id: req.student._id, name: req.student.name } };
  publish(recruiterId, "message", { recruiterId: String(recruiterId), message: data });
  res.status(201).json({ success: true, data });
});

/** @route POST /api/messages/threads/:recruiterId/read — marks the conversation read for the caller's side. */
const markRead = asyncHandler(async (req, res) => {
  const recruiterId = await threadOwner(req);
  const field = isStaff(req.student) ? "staffReadAt" : "recruiterReadAt";
  const at = new Date();
  await ChatThread.updateOne({ recruiter: recruiterId }, { $set: { [field]: at } });
  publish(recruiterId, "read", { recruiterId: String(recruiterId), side: isStaff(req.student) ? "staff" : "recruiter", at });
  res.json({ success: true, data: { [field]: at } });
});


module.exports = { listThreads, unreadCount, getMessages, sendMessage, markRead };
