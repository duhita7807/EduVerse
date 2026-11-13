const mongoose = require("mongoose");

const roundResultSchema = new mongoose.Schema(
  {
    roundId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Drive.rounds._id
    status: { type: String, enum: ["pending", "cleared", "rejected"], default: "pending" },
    score: { type: Number, min: 0 },
    remarks: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    drive: { type: mongoose.Schema.Types.ObjectId, ref: "Drive", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },

    // Recruiter's evaluation (never shown to the student directly).
    roundResults: [roundResultSchema],
    recruiterDecision: { type: String, enum: ["pending", "recommended", "not_recommended"], default: "pending" },
    recruiterRemarks: { type: String, trim: true, maxlength: 500, default: "" },

    // TPO's final call. Students only see this after the drive is "finalized".
    finalStatus: { type: String, enum: ["pending", "selected", "not_selected"], default: "pending" },
  },
  { timestamps: true }
);

// One application per student per drive.
applicationSchema.index({ drive: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);
