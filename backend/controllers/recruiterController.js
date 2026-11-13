const Drive = require("../models/Drive");
const Application = require("../models/Application");
const { asyncHandler } = require("../middleware/errorHandler");
const httpError = require("../utils/httpError");
const { buildDrivePayload, buildRounds } = require("../utils/drivePayload");
const { getStudentCgpa } = require("../services/eligibilityService");
const mongoose = require("mongoose");
const shortlistService = require("../services/shortlistService");
const { notify, notifyStaff } = require("../services/notificationService");

// Fields of a shortlisted student shared with a recruiter once the admin sends the drive shortlist.
const SHARED_FIELDS = "name email college branch year rollNo skills githubUsername linkedinProfile";

// Fields of a student a recruiter may see on an applicant row.
const APPLICANT_FIELDS =
  "name email college branch year rollNo bio skills projects internships certifications education githubUsername linkedinProfile profileCompletion";

/** Loads a drive and makes sure it belongs to the logged-in recruiter. */
const ownDrive = async (req) => {
  const drive = await Drive.findById(req.params.id);
  if (!drive || String(drive.recruiter) !== String(req.student._id)) throw httpError(404, "Drive not found.");
  return drive;
};

/** @route GET /api/recruiter/stats */
const getStats = asyncHandler(async (req, res) => {
  const drives = await Drive.find({ recruiter: req.student._id }).select("status");
  const driveIds = drives.map((d) => d._id);
  const [applicants, selected] = await Promise.all([
    Application.countDocuments({ drive: { $in: driveIds } }),
    Application.countDocuments({ drive: { $in: driveIds }, finalStatus: "selected" }),
  ]);
  const count = (s) => drives.filter((d) => d.status === s).length;

  res.json({
    success: true,
    data: {
      totals: { drives: drives.length, applicants, selected },
      byStatus: {
        pending: count("pending"),
        rejected: count("rejected"),
        approved: count("approved"),
        results_submitted: count("results_submitted"),
        finalized: count("finalized"),
      },
    },
  });
});

/** @route GET /api/recruiter/drives */
const listDrives = asyncHandler(async (req, res) => {
  const filter = { recruiter: req.student._id };
  if (req.query.status) filter.status = req.query.status;

  const drives = await Drive.find(filter).sort({ createdAt: -1 }).lean();
  const counts = await Application.aggregate([
    { $match: { drive: { $in: drives.map((d) => d._id) } } },
    { $group: { _id: "$drive", total: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.total]));

  res.json({ success: true, data: { drives: drives.map((d) => ({ ...d, applicantCount: countMap.get(String(d._id)) || 0 })) } });
});

/** @route POST /api/recruiter/drives — goes straight to the TPO's verification queue. */
const createDrive = asyncHandler(async (req, res) => {
  const payload = buildDrivePayload(req.body);
  if (payload.applicationDeadline <= new Date()) throw httpError(400, "Application deadline must be in the future.");

  const drive = await Drive.create({ ...payload, recruiter: req.student._id, status: "pending" });
  notifyStaff({ type: "drive", title: "New drive awaiting verification", body: `${drive.company.name} — ${drive.title}`, link: `/tpo/drives/${drive._id}` });
  res.status(201).json({ success: true, message: "Drive submitted for TPO verification.", data: { drive } });
});

/** @route GET /api/recruiter/drives/:id — drive + applicants */
const getDrive = asyncHandler(async (req, res) => {
  const drive = await ownDrive(req);
  const applications = await Application.find({ drive: drive._id }).populate("student", APPLICANT_FIELDS).sort({ createdAt: 1 }).lean();

  const applicants = applications
    .filter((a) => a.student)
    .map((a) => ({ ...a, student: { ...a.student, cgpa: getStudentCgpa(a.student) } }));

  res.json({ success: true, data: { drive, applications: applicants } });
});

/**
 * @route PUT /api/recruiter/drives/:id
 * Editable while pending or rejected. Editing a rejected drive resubmits it
 * to the TPO queue.
 */
const updateDrive = asyncHandler(async (req, res) => {
  const drive = await ownDrive(req);
  if (!["pending", "rejected"].includes(drive.status)) {
    throw httpError(400, "This drive has been approved and can no longer be edited. You can still update its rounds.");
  }

  const payload = buildDrivePayload(req.body);
  if (payload.applicationDeadline <= new Date()) throw httpError(400, "Application deadline must be in the future.");

  drive.set(payload);
  const resubmitted = drive.status === "rejected";
  if (resubmitted) {
    drive.status = "pending";
    drive.tpoReview = { note: "" };
  }
  await drive.save();
  if (resubmitted) notifyStaff({ type: "drive", title: "Drive resubmitted for verification", body: `${drive.company.name} — ${drive.title}`, link: `/tpo/drives/${drive._id}` });
  res.json({ success: true, message: "Drive updated and sent for TPO verification.", data: { drive } });
});

/** @route DELETE /api/recruiter/drives/:id — only before approval. */
const deleteDrive = asyncHandler(async (req, res) => {
  const drive = await ownDrive(req);
  if (!["pending", "rejected"].includes(drive.status)) throw httpError(400, "Approved drives can't be deleted.");
  await drive.deleteOne();
  res.json({ success: true, message: "Drive deleted." });
});

/** @route PUT /api/recruiter/drives/:id/rounds — schedule tests/interviews once approved. */
const updateRounds = asyncHandler(async (req, res) => {
  const drive = await ownDrive(req);
  if (drive.status !== "approved") throw httpError(400, "Rounds can only be changed while the drive is approved and open.");

  drive.rounds = buildRounds(req.body.rounds);
  await drive.save();
  res.json({ success: true, message: "Rounds updated.", data: { drive } });
});

/**
 * @route PATCH /api/recruiter/drives/:id/applications/:applicationId
 * Record round results and the recruiter's overall decision for one applicant.
 */
const evaluateApplication = asyncHandler(async (req, res) => {
  const drive = await ownDrive(req);
  if (drive.status !== "approved") throw httpError(400, "Results can only be recorded while the drive is approved and open.");

  const application = await Application.findOne({ _id: req.params.applicationId, drive: drive._id });
  if (!application) throw httpError(404, "Application not found.");

  const { roundResults, recruiterDecision, recruiterRemarks } = req.body;

  if (roundResults !== undefined) {
    if (!Array.isArray(roundResults)) throw httpError(400, "roundResults must be a list.");
    const validIds = new Set(drive.rounds.map((r) => String(r._id)));
    application.roundResults = roundResults.map((r) => {
      if (!validIds.has(String(r.roundId))) throw httpError(400, "Unknown round.");
      if (!["pending", "cleared", "rejected"].includes(r.status)) throw httpError(400, "Invalid round status.");
      const score = r.score === "" || r.score === null || r.score === undefined ? undefined : Number(r.score);
      if (score !== undefined && (Number.isNaN(score) || score < 0)) throw httpError(400, "Score must be a positive number.");
      return { roundId: r.roundId, status: r.status, score, remarks: typeof r.remarks === "string" ? r.remarks.trim() : "" };
    });
  }
  if (recruiterDecision !== undefined) {
    if (!["pending", "recommended", "not_recommended"].includes(recruiterDecision)) throw httpError(400, "Invalid decision.");
    application.recruiterDecision = recruiterDecision;
  }
  if (recruiterRemarks !== undefined) application.recruiterRemarks = String(recruiterRemarks).trim().slice(0, 500);

  await application.save();
  res.json({ success: true, message: "Evaluation saved.", data: { application } });
});

/** @route POST /api/recruiter/drives/:id/submit-results — hand the shortlist to the TPO. */
const submitResults = asyncHandler(async (req, res) => {
  const drive = await ownDrive(req);
  if (drive.status !== "approved") throw httpError(400, "Only an approved, open drive can be submitted for finalization.");

  const applications = await Application.find({ drive: drive._id }).select("recruiterDecision");
  if (applications.length === 0) throw httpError(400, "No students have applied yet, so there are no results to submit.");
  const undecided = applications.filter((a) => a.recruiterDecision === "pending").length;
  if (undecided > 0) {
    throw httpError(400, `${undecided} applicant${undecided === 1 ? " is" : "s are"} still undecided. Mark each as recommended or not recommended first.`);
  }

  drive.status = "results_submitted";
  drive.resultsSubmittedAt = new Date();
  await drive.save();
  notifyStaff({ type: "result", title: "Results ready to finalize", body: `${drive.company.name} — ${drive.title}: the recruiter submitted results.`, link: `/tpo/drives/${drive._id}` });
  res.json({ success: true, message: "Results sent to the TPO for finalization.", data: { drive } });
});

/** @route GET /api/recruiter/drives/:id/shortlist — only once the admin has sent it. */
const getDriveShortlist = asyncHandler(async (req, res) => {
  const drive = await ownDrive(req);
  if (!drive.shortlistSentAt) throw httpError(403, "The placement cell has not sent the shortlist for this drive yet.");
  const { shortlist } = await Drive.findById(drive._id).select("+shortlist").lean();
  const groups = await shortlistService.getDriveShortlist({ shortlist }, SHARED_FIELDS);
  res.json({ success: true, data: { sentAt: drive.shortlistSentAt, groups } });
});

module.exports = { getDriveShortlist, getStats, listDrives, createDrive, getDrive, updateDrive, deleteDrive, updateRounds, evaluateApplication, submitResults };
