const mongoose = require("mongoose");

/**
 * One chat message. Every conversation is between one recruiter and the
 * placement cell (all TPO and admin users share the inbox), so the thread is
 * identified by the recruiter's id.
 */
const messageSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    senderRole: { type: String, enum: ["recruiter", "tpo", "admin"], required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

messageSchema.index({ recruiter: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
