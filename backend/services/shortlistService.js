const Application = require("../models/Application");
const Student = require("../models/Student");
const { getStudentCgpa } = require("./eligibilityService");
const { exactCi } = require("./studentQueryService");

// Shortlisted = the recruiter recommended the student or the TPO selected them.
const SHORTLIST_FILTER = { $or: [{ recruiterDecision: "recommended" }, { finalStatus: "selected" }] };

/**
 * Active shortlisted students, one entry per student, grouped by branch:
 * [{ branch, students: [{ ...student, cgpa, shortlists: [{ company, drive, recruiterDecision, finalStatus }] }] }]
 */
const getShortlistedByBranch = async (branch, studentFields) => {
  const match = { role: "student", isActive: true, studentStatus: { $nin: ["pending", "rejected"] } };
  if (branch) match.branch = exactCi(branch);

  const apps = await Application.find(SHORTLIST_FILTER)
    .populate({ path: "student", select: `${studentFields} education`, match })
    .populate("drive", "title company.name")
    .lean();

  const byStudent = new Map();
  for (const a of apps) {
    if (!a.student) continue;
    const id = String(a.student._id);
    if (!byStudent.has(id)) byStudent.set(id, { ...a.student, cgpa: getStudentCgpa(a.student), shortlists: [] });
    byStudent.get(id).shortlists.push({
      company: a.drive?.company?.name,
      drive: a.drive?.title,
      recruiterDecision: a.recruiterDecision,
      finalStatus: a.finalStatus,
    });
  }

  return groupByBranch([...byStudent.values()]);
};

/** [{ branch, students }] sorted by branch, then student name. */
const groupByBranch = (students) => {
  const groups = {};
  for (const s of students) (groups[s.branch] ||= []).push(s);
  return Object.keys(groups)
    .sort()
    .map((b) => ({ branch: b, students: groups[b].sort((x, y) => x.name.localeCompare(y.name)) }));
};

/** A drive's auto-shortlist (active students only), grouped by branch. */
const getDriveShortlist = async (drive, studentFields) => {
  const students = await Student.find({ _id: { $in: drive.shortlist || [] }, isActive: true, studentStatus: { $nin: ["pending", "rejected"] } })
    .select(`${studentFields} education`)
    .lean();
  return groupByBranch(students.map(({ education, ...s }) => ({ ...s, cgpa: getStudentCgpa({ education }) })));
};

module.exports = { getShortlistedByBranch, getDriveShortlist };
