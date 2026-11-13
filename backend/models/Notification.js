const mongoose = require("mongoose");

/** An in-app notification for one user. `link` is a frontend path to open when it is clicked. */
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    type: { type: String, required: true }, // e.g. account, drive, result, shortlist, certificate
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, default: "", maxlength: 500 },
    link: { type: String, default: "" },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
