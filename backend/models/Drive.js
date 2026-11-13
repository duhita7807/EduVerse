const mongoose = require("mongoose");

/**
 * A placement drive. Lifecycle (status):
 *
 *   pending            recruiter submitted company + eligibility, waiting for TPO
 *   rejected           TPO sent it back with a note (recruiter can edit & resubmit)
 *   approved           verified by TPO -> visible to eligible students, applications open
 *   results_submitted  recruiter finished test/interviews and sent results to TPO
 *   finalized          TPO confirmed the selected students -> students see final result
 */
const DRIVE_STATUSES = ["pending", "rejected", "approved", "results_submitted", "finalized"];

const roundSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  type: { type: String, enum: ["test", "interview", "group-discussion", "other"], default: "test" },
  mode: { type: String, enum: ["online", "offline"], default: "online" },
  scheduledAt: { type: Date },
  venue: { type: String, trim: true, maxlength: 200, default: "" },
});

const driveSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },

    company: {
      name: { type: String, required: [true, "Company name is required"], trim: true, maxlength: 120 },
      website: { type: String, trim: true, maxlength: 200, default: "" },
      industry: { type: String, trim: true, maxlength: 80, default: "" },
      about: { type: String, trim: true, maxlength: 1000, default: "" },
    },

    title: { type: String, required: [true, "Job role / title is required"], trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 3000, default: "" },
    jobType: { type: String, enum: ["full-time", "internship", "internship-ppo"], default: "full-time" },
    location: { type: String, trim: true, maxlength: 120, default: "" },
    ctc: { type: String, trim: true, maxlength: 60, default: "" }, // free text: "6 LPA", "25k/month"
    openings: { type: Number, min: 1, default: 1 },

    // Who may see & apply. Empty branches / years = open to all.
    eligibility: {
      minCgpa: { type: Number, min: 0, max: 10, default: 0 },
      branches: [{ type: String, trim: true }],
      years: [{ type: String, enum: ["1st Year", "2nd Year", "3rd Year", "4th Year"] }],
    },

    applicationDeadline: { type: Date, required: [true, "Application deadline is required"] },
    rounds: [roundSchema],

    status: { type: String, enum: DRIVE_STATUSES, default: "pending", index: true },

    tpoReview: {
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
      reviewedAt: { type: Date },
      note: { type: String, trim: true, maxlength: 500, default: "" },
    },
    resultsSubmittedAt: { type: Date },
    finalizedAt: { type: Date },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },

    // Auto-shortlist: eligible students snapshotted when the drive is approved.
    // The admin can remove students, then send it to the recruiter (locks it).
    // select: false so it never leaks via the existing drive queries.
    shortlist: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }], select: false },
    shortlistedAt: { type: Date },
    shortlistSentAt: { type: Date },
    shortlistSentBy: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Drive", driveSchema);
module.exports.DRIVE_STATUSES = DRIVE_STATUSES;
