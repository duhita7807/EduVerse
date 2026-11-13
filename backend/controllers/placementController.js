const Drive = require("../models/Drive");
const Application = require("../models/Application");
const { asyncHandler } = require("../middleware/errorHandler");
const httpError = require("../utils/httpError");
const { checkEligibility } = require("../services/eligibilityService");

// What a student may see about a drive — no recruiter/TPO internals.
const publicDrive = (drive) => ({
  _id: drive._id,
  company: drive.company,
  title: drive.title,
  description: drive.description,
  jobType: drive.jobType,
  location: drive.location,
  ctc: drive.ctc,
  openings: drive.openings,
  eligibility: drive.eligibility,
  applicationDeadline: drive.applicationDeadline,
  rounds: (drive.rounds || []).map((r) => ({ _id: r._id, name: r.name, type: r.type, mode: r.mode, scheduledAt: r.scheduledAt, venue: r.venue })),
  status: drive.status,
});

/** What the student sees as their application's progress. */
const progressOf = (application, drive) => {
  if (drive.status === "finalized") {
    return application.finalStatus === "selected"
      ? { key: "selected", label: "Selected" }
      : { key: "not_selected", label: "Not selected" };
  }
  if (drive.status === "results_submitted") return { key: "under_review", label: "Result under review" };
  return { key: "applied", label: "Applied" };
};

/** @route GET /api/placement/drives — approved drives this student is eligible for. */
const listDrives = asyncHandler(async (req, res) => {
  const [drives, myApps] = await Promise.all([
    Drive.find({ status: "approved" }).sort({ applicationDeadline: 1 }).lean(),
    Application.find({ student: req.student._id }).select("drive").lean(),
  ]);
  const applied = new Set(myApps.map((a) => String(a.drive)));
  const now = new Date();

  const visible = drives
    .filter((d) => applied.has(String(d._id)) || checkEligibility(req.student, d).eligible)
    .map((d) => ({
      ...publicDrive(d),
      applied: applied.has(String(d._id)),
      deadlinePassed: new Date(d.applicationDeadline) <= now,
    }));

  res.json({ success: true, data: { drives: visible } });
});

/** @route POST /api/placement/drives/:id/apply */
const applyToDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id);
  if (!drive || drive.status !== "approved") throw httpError(404, "This drive isn't open for applications.");
  if (drive.applicationDeadline <= new Date()) throw httpError(400, "The application deadline for this drive has passed.");

  const { eligible, reasons } = checkEligibility(req.student, drive);
  if (!eligible) throw httpError(403, `You're not eligible for this drive. ${reasons.join(" · ")}`);

  const existing = await Application.findOne({ drive: drive._id, student: req.student._id });
  if (existing) throw httpError(400, "You've already applied to this drive.");

  const application = await Application.create({ drive: drive._id, student: req.student._id });
  res.status(201).json({ success: true, message: `Applied to ${drive.company.name}.`, data: { applicationId: application._id } });
});

/** @route GET /api/placement/applications — my applications + final results. */
const listMyApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ student: req.student._id }).populate("drive").sort({ createdAt: -1 }).lean();

  const data = applications
    .filter((a) => a.drive)
    .map((a) => ({
      _id: a._id,
      appliedAt: a.createdAt,
      progress: progressOf(a, a.drive),
      drive: publicDrive(a.drive),
      finalizedAt: a.drive.status === "finalized" ? a.drive.finalizedAt : null,
    }));

  res.json({ success: true, data: { applications: data } });
});

/** @route GET /api/placement/summary — numbers for the student dashboard card. */
const getSummary = asyncHandler(async (req, res) => {
  const [drives, applications] = await Promise.all([
    Drive.find({ status: "approved", applicationDeadline: { $gt: new Date() } }).lean(),
    Application.find({ student: req.student._id }).populate("drive", "status company title").lean(),
  ]);
  const applied = new Set(applications.map((a) => String(a.drive?._id)));
  const openForMe = drives.filter((d) => !applied.has(String(d._id)) && checkEligibility(req.student, d).eligible).length;

  const finalized = applications.filter((a) => a.drive?.status === "finalized");
  const selected = finalized.filter((a) => a.finalStatus === "selected");

  res.json({
    success: true,
    data: {
      openDrives: openForMe,
      applied: applications.length,
      inProgress: applications.filter((a) => a.drive && a.drive.status !== "finalized").length,
      selected: selected.length,
      latestSelection: selected.length ? { company: selected[0].drive.company.name, title: selected[0].drive.title } : null,
    },
  });
});

module.exports = { listDrives, applyToDrive, listMyApplications, getSummary };
