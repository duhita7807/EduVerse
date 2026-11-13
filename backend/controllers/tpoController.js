const Drive = require("../models/Drive");
const Application = require("../models/Application");
const Student = require("../models/Student");
const shortlistService = require("../services/shortlistService");
const { notify, notifyStaff } = require("../services/notificationService");

// Student fields shown to TPO/admin (and exported) for a drive's auto-shortlist.
const SHORTLIST_FIELDS = "name email college branch year rollNo githubUsername linkedinProfile";
const { asyncHandler } = require("../middleware/errorHandler");
const httpError = require("../utils/httpError");
const mongoose = require("mongoose");
const { checkEligibility, getStudentCgpa } = require("../services/eligibilityService");
const { LIST_FIELDS, buildStudentFilter, buildSort, flattenSkills, toListRow } = require("../services/studentQueryService");

const APPLICANT_FIELDS =
  "name email college branch year rollNo bio skills projects internships certifications education githubUsername linkedinProfile profileCompletion";

const eligibleStudentIds = async (drive) => {
  const students = await Student.find({ role: "student", isActive: true, studentStatus: { $nin: ["pending", "rejected"] } }).select("branch year education");
  return students.filter((s) => checkEligibility(s, drive).eligible).map((s) => s._id);
};
const countEligible = async (drive) => (await eligibleStudentIds(drive)).length;

/** @route GET /api/tpo/stats */
const getStats = asyncHandler(async (req, res) => {
  const [drives, applications, selected] = await Promise.all([
    Drive.find().select("status"),
    Application.countDocuments(),
    Application.countDocuments({ finalStatus: "selected" }),
  ]);
  const count = (s) => drives.filter((d) => d.status === s).length;

  res.json({
    success: true,
    data: {
      totals: { drives: drives.length, applications, selected },
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

/** @route GET /api/tpo/drives?status= */
const listDrives = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const drives = await Drive.find(filter).populate("recruiter", "name email organization").sort({ updatedAt: -1 }).lean();

  const counts = await Application.aggregate([
    { $match: { drive: { $in: drives.map((d) => d._id) } } },
    { $group: { _id: "$drive", total: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.total]));

  res.json({ success: true, data: { drives: drives.map((d) => ({ ...d, applicantCount: countMap.get(String(d._id)) || 0 })) } });
});

/** @route GET /api/tpo/drives/:id */
const getDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id).populate("recruiter", "name email organization").lean();
  if (!drive) throw httpError(404, "Drive not found.");

  const [eligibleCount, applications] = await Promise.all([
    countEligible(drive),
    Application.find({ drive: drive._id }).populate("student", APPLICANT_FIELDS).sort({ createdAt: 1 }).lean(),
  ]);

  const applicants = applications
    .filter((a) => a.student)
    .map((a) => ({ ...a, student: { ...a.student, cgpa: getStudentCgpa(a.student) } }));

  res.json({ success: true, data: { drive, eligibleCount, applications: applicants } });
});

/** @route GET /api/tpo/drives/:id/shortlist — the drive's auto-shortlist, branch-wise. */
const getDriveShortlist = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, "Invalid drive id.");
  const drive = await Drive.findById(req.params.id).select("shortlist shortlistedAt shortlistSentAt").lean();
  if (!drive) throw httpError(404, "Drive not found.");
  const groups = await shortlistService.getDriveShortlist(drive, SHORTLIST_FIELDS);
  res.json({ success: true, data: { shortlistedAt: drive.shortlistedAt, sentAt: drive.shortlistSentAt, groups } });
});

/**
 * @route PATCH /api/tpo/drives/:id/review
 * body: { decision: "approve" | "reject", note?, eligibility? }
 * The TPO may tighten/loosen eligibility while approving.
 */
const reviewDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id);
  if (!drive) throw httpError(404, "Drive not found.");
  if (drive.status !== "pending") throw httpError(400, "Only drives awaiting verification can be reviewed.");

  const { decision, eligibility } = req.body;
  const note = typeof req.body.note === "string" ? req.body.note.trim() : "";

  if (decision === "reject") {
    if (!note) throw httpError(400, "Please add a note explaining what the recruiter should fix.");
    drive.status = "rejected";
  } else if (decision === "approve") {
    if (drive.applicationDeadline <= new Date()) {
      throw httpError(400, "The application deadline has already passed — ask the recruiter to set a new one.");
    }
    const recruiter = await Student.findById(drive.recruiter).select("recruiterStatus");
    if ((recruiter?.recruiterStatus || "approved") !== "approved") {
      throw httpError(400, "Approve the recruiter's company (Recruiters page) before approving its drive.");
    }
    if (eligibility) {
      const minCgpa = Number(eligibility.minCgpa ?? drive.eligibility.minCgpa);
      if (Number.isNaN(minCgpa) || minCgpa < 0 || minCgpa > 10) throw httpError(400, "Minimum CGPA must be between 0 and 10.");
      drive.eligibility = {
        minCgpa,
        branches: Array.isArray(eligibility.branches) ? eligibility.branches.map((b) => String(b).trim()).filter(Boolean) : drive.eligibility.branches,
        years: Array.isArray(eligibility.years) ? eligibility.years : drive.eligibility.years,
      };
    }
    drive.status = "approved";
    drive.shortlist = await eligibleStudentIds(drive);
    drive.shortlistedAt = new Date();
  } else {
    throw httpError(400, 'decision must be "approve" or "reject".');
  }

  drive.tpoReview = { reviewedBy: req.student._id, reviewedAt: new Date(), note: note.slice(0, 500) };
  await drive.save();

  const what = `${drive.company.name} — ${drive.title}`;
  if (decision === "approve") {
    notify([drive.recruiter], { type: "drive", title: "Drive approved", body: `${what} is now open to eligible students.`, link: `/recruiter/drives/${drive._id}` });
    notify(drive.shortlist, { type: "drive", title: "New drive you are eligible for", body: `${what}. Apply before ${drive.applicationDeadline.toDateString()}.`, link: "/drives" });
  } else {
    notify([drive.recruiter], { type: "drive", title: "Drive needs changes", body: `${what}: ${note}`, link: `/recruiter/drives/${drive._id}` });
  }

  res.json({ success: true, message: decision === "approve" ? `Drive approved — ${drive.shortlist.length} eligible students auto-shortlisted.` : "Drive sent back to the recruiter.", data: { drive } });
});

/**
 * @route POST /api/tpo/drives/:id/finalize
 * body: { selections: [{ applicationId, finalStatus: "selected" | "not_selected" }] }
 * Must cover every application. Once finalized, students can see the result.
 */
const finalizeDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id);
  if (!drive) throw httpError(404, "Drive not found.");
  if (drive.status !== "results_submitted") throw httpError(400, "Only drives with recruiter results submitted can be finalized.");

  const { selections } = req.body;
  if (!Array.isArray(selections)) throw httpError(400, "selections must be a list.");

  const applications = await Application.find({ drive: drive._id }).select("_id");
  const chosen = new Map(selections.map((s) => [String(s.applicationId), s.finalStatus]));

  for (const a of applications) {
    const value = chosen.get(String(a._id));
    if (!["selected", "not_selected"].includes(value)) {
      throw httpError(400, "Every applicant must be marked selected or not selected before finalizing.");
    }
  }

  await Application.bulkWrite(
    applications.map((a) => ({
      updateOne: { filter: { _id: a._id }, update: { $set: { finalStatus: chosen.get(String(a._id)) } } },
    }))
  );

  drive.status = "finalized";
  drive.finalizedAt = new Date();
  drive.finalizedBy = req.student._id;
  await drive.save();

  const what = `${drive.company.name} — ${drive.title}`;
  const applicants = await Application.find({ drive: drive._id }).select("student").lean();
  const picked = applicants.filter((a) => chosen.get(String(a._id)) === "selected").map((a) => a.student);
  const rest = applicants.filter((a) => chosen.get(String(a._id)) !== "selected").map((a) => a.student);
  notify(picked, { type: "result", title: "Congratulations, you were selected", body: what, link: "/applications" });
  notify(rest, { type: "result", title: "Result published", body: `The result for ${what} is out.`, link: "/applications" });
  notify([drive.recruiter], { type: "result", title: "Selections finalized", body: `${what}: final selections were published.`, link: `/recruiter/drives/${drive._id}` });

  const selectedCount = [...chosen.values()].filter((v) => v === "selected").length;
  res.json({ success: true, message: `Results published — ${selectedCount} student${selectedCount === 1 ? "" : "s"} selected.`, data: { drive } });
});

/**
 * @route GET /api/tpo/students
 * query: search, branch, college, year, status, skills (comma list, all must match),
 *        minCgpa, minCompletion, has (comma list of projects|internships|certifications|github|linkedin),
 *        sort (name|rollNo|newest|oldest|completion|cgpa), page, limit (max 100)
 */
const listStudents = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = buildStudentFilter(req.query);

  const [total, students] = await Promise.all([
    Student.countDocuments(filter),
    Student.find(filter)
      .select(LIST_FIELDS)
      .collation({ locale: "en", strength: 2 }) // case-insensitive name / roll no ordering
      .sort(buildSort(req.query.sort))
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  res.json({
    success: true,
    data: {
      students: students.map(toListRow),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
  });
});

/**
 * Values that populate the filter dropdowns, computed from the live collection
 * so they always reflect what students actually submitted.
 * @route GET /api/tpo/students/facets
 */
const getStudentFacets = asyncHandler(async (req, res) => {
  const base = { role: "student" };
  const allSkills = {
    $concatArrays: ["programmingLanguages", "webTechnologies", "databases", "tools"].map((k) => ({ $ifNull: [`$skills.${k}`, []] })),
  };
  const groupCount = (field) => [
    { $match: { ...base, [field]: { $type: "string", $ne: "" } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ];

  const [branches, colleges, years, skills, totals] = await Promise.all([
    Student.aggregate(groupCount("branch")),
    Student.aggregate(groupCount("college")),
    Student.aggregate(groupCount("year")),
    Student.aggregate([
      { $match: base },
      { $project: { all: allSkills } },
      { $unwind: "$all" },
      { $project: { label: { $trim: { input: "$all" } } } },
      { $match: { label: { $ne: "" } } },
      { $group: { _id: { $toLower: "$label" }, label: { $first: "$label" }, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 150 },
    ]),
    Promise.all([
      Student.countDocuments(base),
      Student.countDocuments({ ...base, isActive: { $ne: false } }),
      Student.countDocuments({ ...base, "education.cgpa": { $type: "number" } }),
    ]),
  ]);

  const toItems = (rows) => rows.map((r) => ({ value: r._id, count: r.count }));
  res.json({
    success: true,
    data: {
      branches: toItems(branches),
      colleges: toItems(colleges),
      years: toItems(years),
      skills: skills.map((r) => ({ value: r.label, count: r.count })),
      totals: { students: totals[0], active: totals[1], withCgpa: totals[2] },
    },
  });
});

/**
 * Everything a student has submitted, plus their drive applications.
 * Password hash is never selected; AI-generated insights and the cached GitHub
 * repo list are left out because the student didn't submit them.
 * @route GET /api/tpo/students/:id
 */
const getStudentDetail = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "Student not found.");

  const student = await Student.findOne({ _id: req.params.id, role: "student" })
    .select("-password -aiInsights -githubData.repositories -githubData.avatarUrl")
    .lean();
  if (!student) throw httpError(404, "Student not found.");

  const applications = await Application.find({ student: student._id })
    .populate("drive", "title company.name jobType status")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: {
      student: { ...student, cgpa: getStudentCgpa(student), allSkills: flattenSkills(student.skills) },
      applications: applications
        .filter((a) => a.drive)
        .map((a) => ({
          _id: a._id,
          appliedAt: a.createdAt,
          recruiterDecision: a.recruiterDecision,
          finalStatus: a.finalStatus,
          drive: { _id: a.drive._id, title: a.drive.title, company: a.drive.company?.name, jobType: a.drive.jobType, status: a.drive.status },
        })),
    },
  });
});

/** @route GET /api/tpo/recruiters — every recruiter account, newest first. */
const listRecruiters = asyncHandler(async (req, res) => {
  const recruiters = await Student.find({ role: "recruiter" })
    .select("name email organization recruiterStatus isActive createdAt lastLoginAt")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: recruiters.map((r) => ({ ...r, recruiterStatus: r.recruiterStatus || "approved" })) });
});

/** @route PATCH /api/tpo/recruiters/:id/status  body: { status: "approved" | "rejected" } */
const setRecruiterStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) throw httpError(400, "Status must be approved or rejected.");
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, "Invalid recruiter id.");
  const recruiter = await Student.findOneAndUpdate(
    { _id: req.params.id, role: "recruiter" },
    { recruiterStatus: status },
    { new: true }
  ).select("name email organization recruiterStatus isActive createdAt lastLoginAt");
  if (!recruiter) throw httpError(404, "Recruiter not found.");
  notify([recruiter._id], status === "approved"
    ? { type: "account", title: "Your recruiter account was approved", body: "You can now post drives and message the placement cell.", link: "/recruiter" }
    : { type: "account", title: "Your recruiter account was not approved", body: "Contact the placement cell if you think this is a mistake.", link: "/recruiter" });
  res.json({ success: true, data: recruiter });
});

const APPROVAL_FIELDS = "name email college branch year rollNo studentStatus isActive profileCompletion createdAt lastLoginAt";

/**
 * @route GET /api/tpo/student-approvals?status=pending|approved|rejected|all
 * Students by approval status, newest first. Missing status counts as approved.
 */
const listStudentApprovals = asyncHandler(async (req, res) => {
  const status = String(req.query.status || "pending");
  const filter = { role: "student" };
  if (status === "approved") filter.studentStatus = { $nin: ["pending", "rejected"] };
  else if (status === "pending" || status === "rejected") filter.studentStatus = status;
  else if (status !== "all") throw httpError(400, "status must be pending, approved, rejected or all.");

  const [students, counts] = await Promise.all([
    Student.find(filter).select(APPROVAL_FIELDS).sort({ createdAt: -1 }).limit(500).lean(),
    Student.aggregate([{ $match: { role: "student" } }, { $group: { _id: { $ifNull: ["$studentStatus", "approved"] }, n: { $sum: 1 } } }]),
  ]);
  const total = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  res.json({
    success: true,
    data: {
      students: students.map((s) => ({ ...s, studentStatus: s.studentStatus || "approved" })),
      counts: { pending: total.pending || 0, approved: total.approved || 0, rejected: total.rejected || 0 },
    },
  });
});

/** @route PATCH /api/tpo/students/:id/approval  body: { status: "approved" | "rejected" } */
const setStudentApproval = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) throw httpError(400, "Status must be approved or rejected.");
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, "Invalid student id.");
  const student = await Student.findOneAndUpdate({ _id: req.params.id, role: "student" }, { studentStatus: status }, { new: true }).select(APPROVAL_FIELDS);
  if (!student) throw httpError(404, "Student not found.");
  if (student) notify([student._id], status === "approved"
    ? { type: "account", title: "Your account was approved", body: "You can now complete your profile and apply to drives.", link: "/dashboard" }
    : { type: "account", title: "Your account was not approved", body: "Please contact the placement cell.", link: "/dashboard" });
  res.json({ success: true, data: student });
});

module.exports = { listStudentApprovals, setStudentApproval, getDriveShortlist, getStats, listDrives, getDrive, reviewDrive, finalizeDrive, listStudents, getStudentFacets, getStudentDetail, listRecruiters, setRecruiterStatus };
