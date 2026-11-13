const Student = require("../models/Student");
const { notify, notifyStaff } = require("../services/notificationService");
const mongoose = require("mongoose");
const Drive = require("../models/Drive");
const { getShortlistedByBranch } = require("../services/shortlistService");
const { asyncHandler } = require("../middleware/errorHandler");
const { deleteCertificateFile } = require("../middleware/certificateUpload");

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const DAY = 24 * 60 * 60 * 1000;

const countBy = (items, keyFn) => {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
};

/** Every certification that has an uploaded certificateFile, flattened across students. */
const flattenCertificateDocs = (students) => {
  const docs = [];
  students.forEach((s) => {
    (s.certifications || []).forEach((c) => {
      if (c.certificateFile?.url) {
        docs.push({
          studentId: s._id,
          studentName: s.name,
          studentEmail: s.email,
          certId: c._id,
          title: c.title,
          issuedBy: c.issuedBy || "",
          file: c.certificateFile,
          status: c.verificationStatus && c.verificationStatus !== "unreviewed" ? c.verificationStatus : "pending",
          note: c.verificationNote || "",
          verifiedAt: c.verifiedAt,
        });
      }
    });
  });
  return docs.sort((a, b) => new Date(b.verifiedAt || 0) - new Date(a.verifiedAt || 0));
};

/**
 * @route GET /api/admin/stats
 */
const getStats = asyncHandler(async (req, res) => {
  const students = await Student.find({ role: "student" })
    .select("name email year branch isActive createdAt lastLoginAt profileCompletion skills projects internships certifications")
    .lean();

  const now = Date.now();
  const total = students.length;
  const active = students.filter((s) => s.isActive !== false).length;

  const signupsByDay = [];
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now - i * DAY);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + DAY);
    signupsByDay.push({
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: students.filter((s) => new Date(s.createdAt) >= start && new Date(s.createdAt) < end).length,
    });
  }

  const allSkills = students.flatMap((s) => [
    ...(s.skills?.programmingLanguages || []),
    ...(s.skills?.webTechnologies || []),
    ...(s.skills?.databases || []),
    ...(s.skills?.tools || []),
  ]);
  const displayName = new Map();
  allSkills.forEach((sk) => {
    const key = sk.toLowerCase().trim();
    if (key && !displayName.has(key)) displayName.set(key, sk.trim());
  });
  const topSkills = countBy(allSkills, (sk) => sk.toLowerCase().trim())
    .slice(0, 10)
    .map((s) => ({ label: displayName.get(s.label) || s.label, count: s.count }));

  const docs = flattenCertificateDocs(students);

  res.json({
    success: true,
    data: {
      totals: {
        students: total,
        active,
        inactive: total - active,
        newThisWeek: students.filter((s) => now - new Date(s.createdAt).getTime() <= 7 * DAY).length,
        newThisMonth: students.filter((s) => now - new Date(s.createdAt).getTime() <= 30 * DAY).length,
        projects: students.reduce((n, s) => n + (s.projects?.length || 0), 0),
        internships: students.reduce((n, s) => n + (s.internships?.length || 0), 0),
        certifications: students.reduce((n, s) => n + (s.certifications?.length || 0), 0),
      },
      averages: {
        profileCompletion: total ? Math.round(students.reduce((n, s) => n + (s.profileCompletion || 0), 0) / total) : 0,
      },
      documents: {
        total: docs.length,
        pending: docs.filter((d) => d.status === "pending").length,
        verified: docs.filter((d) => d.status === "verified").length,
        rejected: docs.filter((d) => d.status === "rejected").length,
      },
      byYear: countBy(students, (s) => s.year),
      byBranch: countBy(students, (s) => s.branch).slice(0, 6),
      topSkills,
      signupsByDay,
      recentStudents: [...students]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6)
        .map((s) => ({ _id: s._id, name: s.name, email: s.email, year: s.year, branch: s.branch, createdAt: s.createdAt })),
    },
  });
});

/**
 * @route GET /api/admin/students?page=&limit=&search=&year=&status=&sort=
 */
const listStudents = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const { search = "", year = "", status = "", sort = "newest" } = req.query;

  const filter = { role: "student" };
  if (search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim().slice(0, 60)), "i");
    filter.$or = [{ name: rx }, { email: rx }, { rollNo: rx }, { college: rx }, { branch: rx }];
  }
  if (["1st Year", "2nd Year", "3rd Year", "4th Year"].includes(year)) filter.year = year;
  if (status === "active") filter.isActive = { $ne: false };
  if (status === "inactive") filter.isActive = false;

  const sortMap = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, completion: { profileCompletion: -1 }, name: { name: 1 } };

  const [total, students] = await Promise.all([
    Student.countDocuments(filter),
    Student.find(filter)
      .select("name email college branch year rollNo profilePhoto isActive createdAt lastLoginAt profileCompletion certifications internships projects")
      .sort(sortMap[sort] || sortMap.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  res.json({
    success: true,
    data: {
      students: students.map((s) => {
        const docs = flattenCertificateDocs([s]);
        return {
          _id: s._id,
          name: s.name,
          email: s.email,
          college: s.college,
          branch: s.branch,
          year: s.year,
          rollNo: s.rollNo,
          profilePhoto: s.profilePhoto,
          isActive: s.isActive !== false,
          createdAt: s.createdAt,
          lastLoginAt: s.lastLoginAt,
          profileCompletion: s.profileCompletion || 0,
          projectCount: s.projects?.length || 0,
          internshipCount: s.internships?.length || 0,
          certificationCount: s.certifications?.length || 0,
          pendingDocuments: docs.filter((d) => d.status === "pending").length,
        };
      }),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    },
  });
});

const findStudentOr404 = async (id) => {
  const student = await Student.findById(id);
  if (!student) throw httpError(404, "Student not found.");
  return student;
};

/**
 * @route GET /api/admin/students/:id
 */
const getStudent = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.id);
  res.json({ success: true, data: { student: student.toSafeObject() } });
});

/**
 * @route PATCH /api/admin/students/:id/status   body: { isActive: boolean }
 */
const setStudentStatus = asyncHandler(async (req, res) => {
  if (typeof req.body.isActive !== "boolean") throw httpError(400, "isActive must be true or false.");
  const student = await findStudentOr404(req.params.id);
  if (student.role === "admin") throw httpError(400, "Admin accounts can't be deactivated here.");

  student.isActive = req.body.isActive;
  await student.save({ validateBeforeSave: false });
  res.json({
    success: true,
    message: student.isActive ? "Student account activated." : "Student account deactivated.",
    data: { _id: student._id, isActive: student.isActive },
  });
});

/**
 * @route DELETE /api/admin/students/:id
 */
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.id);
  if (student.role === "admin") throw httpError(400, "Admin accounts can't be deleted here.");

  (student.certifications || []).forEach((c) => c.certificateFile?.url && deleteCertificateFile(c.certificateFile.url));
  await Student.deleteOne({ _id: student._id });
  res.json({ success: true, message: "Student deleted." });
});

/**
 * @route GET /api/admin/certificates?status=&search=
 */
const listCertificates = asyncHandler(async (req, res) => {
  const { status = "", search = "" } = req.query;
  const students = await Student.find({ role: "student", "certifications.certificateFile.url": { $exists: true } })
    .select("name email certifications")
    .lean();

  let docs = flattenCertificateDocs(students);
  if (["pending", "verified", "rejected"].includes(status)) docs = docs.filter((d) => d.status === status);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    docs = docs.filter((d) => [d.studentName, d.studentEmail, d.title, d.issuedBy].some((v) => (v || "").toLowerCase().includes(q)));
  }
  res.json({ success: true, data: { documents: docs } });
});

/**
 * @route PATCH /api/admin/certificates/:studentId/:certId   body: { status, note? }
 */
const reviewCertificate = asyncHandler(async (req, res) => {
  const { studentId, certId } = req.params;
  const { status, note = "" } = req.body;

  if (!["verified", "rejected", "pending"].includes(status)) throw httpError(400, "Invalid status.");
  if (status === "rejected" && !String(note).trim()) throw httpError(400, "Please give a short reason when rejecting a certificate.");

  const student = await findStudentOr404(studentId);
  const cert = student.certifications.id(certId);
  if (!cert || !cert.certificateFile?.url) throw httpError(404, "Certificate document not found.");

  cert.verificationStatus = status;
  cert.verificationNote = String(note).trim().slice(0, 300);
  cert.verifiedAt = status === "pending" ? undefined : new Date();
  await student.save({ validateBeforeSave: false });
  if (status !== "pending") {
    notify([student._id], status === "verified"
      ? { type: "certificate", title: "Certificate verified", body: `“${cert.title}” was verified by the placement cell.`, link: "/my-profile" }
      : { type: "certificate", title: "Certificate rejected", body: `“${cert.title}”: ${cert.verificationNote}`, link: "/my-profile" });
  }

  res.json({
    success: true,
    message: `Certificate marked ${status}.`,
    data: { status: cert.verificationStatus, note: cert.verificationNote, verifiedAt: cert.verifiedAt },
  });
});

/** @route GET /api/admin/shortlisted?branch= — shortlisted students grouped by branch. */
const listShortlisted = asyncHandler(async (req, res) => {
  const data = await getShortlistedByBranch(req.query.branch, "name email college branch year rollNo profilePhoto");
  res.json({ success: true, data });
});

/** Loads a drive whose auto-shortlist the admin may still change. */
const editableShortlistDrive = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid drive id.");
  const drive = await Drive.findById(id).select("+shortlist");
  if (!drive) throw httpError(404, "Drive not found.");
  if (!drive.shortlistedAt) throw httpError(400, "This drive has no auto-shortlist yet — approve it first.");
  if (drive.shortlistSentAt) throw httpError(400, "This shortlist was already sent to the recruiter.");
  return drive;
};

/** @route DELETE /api/admin/drives/:id/shortlist/:studentId — admin review: drop a student. */
const removeFromShortlist = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.studentId)) throw httpError(400, "Invalid student id.");
  const drive = await editableShortlistDrive(req.params.id);
  // Targeted updates, not save(): older drives may hold data the current schema rejects.
  const updated = await Drive.findByIdAndUpdate(drive._id, { $pull: { shortlist: req.params.studentId } }, { new: true }).select("+shortlist");
  res.json({ success: true, data: { count: updated.shortlist.length } });
});

/** @route POST /api/admin/drives/:id/shortlist/send — share it with the drive's recruiter. */
const sendShortlist = asyncHandler(async (req, res) => {
  const drive = await editableShortlistDrive(req.params.id);
  if (!drive.shortlist.length) throw httpError(400, "The shortlist is empty.");
  const recruiter = await Student.findById(drive.recruiter).select("recruiterStatus isActive");
  if (!recruiter || recruiter.isActive === false || (recruiter.recruiterStatus || "approved") !== "approved") {
    throw httpError(400, "The recruiter's account is not approved and active.");
  }
  const sentAt = new Date();
  await Drive.updateOne({ _id: drive._id }, { $set: { shortlistSentAt: sentAt, shortlistSentBy: req.student._id } });
  notify([drive.recruiter], { type: "shortlist", title: "Shortlist received", body: `${drive.shortlist.length} students for ${drive.company?.name || "your drive"} — ${drive.title}.`, link: `/recruiter/drives/${drive._id}` });
  res.json({ success: true, message: `Shortlist of ${drive.shortlist.length} students sent to the recruiter.`, data: { sentAt } });
});

module.exports = { removeFromShortlist, sendShortlist, listShortlisted, getStats, listStudents, getStudent, setStudentStatus, deleteStudent, listCertificates, reviewCertificate };
