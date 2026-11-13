const mongoose = require("mongoose");

/** Per-conversation summary: last activity and how far each side has read. */
const chatThreadSchema = new mongoose.Schema({
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
  lastMessage: { type: String, default: "" },
  lastMessageAt: { type: Date },
  recruiterReadAt: { type: Date, default: () => new Date(0) },
  staffReadAt: { type: Date, default: () => new Date(0) }, // shared by every TPO and admin user
});

module.exports = mongoose.model("ChatThread", chatThreadSchema);
