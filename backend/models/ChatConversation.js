const mongoose = require("mongoose");

/**
 * One conversation thread per document. A student can have several
 * (sidebar history); each holds an ordered list of messages.
 * References Student via userId — never duplicates profile data.
 */
const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true, maxlength: 4000 },
    // Optional structured extras the UI can render (roadmap steps, suggested actions).
    // roadmapSteps was previously missing here, so a roadmap reply's step
    // cards rendered fine right after sending (from the live API response)
    // but silently disappeared the moment the student reopened that
    // conversation from history — Mongoose strips any field not declared
    // in the schema, so only the plain message text ever reached the DB.
    suggestedActions: [{ type: String }],
    roadmapSteps: [
      {
        _id: false,
        step: Number,
        title: String,
        description: String,
      },
    ],
    mode: { type: String, enum: ["chat", "interview", "roadmap", "learning-plan"], default: "chat" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    title: { type: String, default: "New conversation", trim: true, maxlength: 120 },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

// Most recently updated conversations first — powers the sidebar list.
chatConversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
