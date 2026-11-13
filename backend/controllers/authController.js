const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const Student = require("../models/Student");
const generateToken = require("../utils/generateToken");
const { asyncHandler } = require("../middleware/errorHandler");
const { calculateProfileCompletion } = require("../services/profileCompletionService");
const { notify, notifyStaff } = require("../services/notificationService");

/**
 * @route   POST /api/auth/register
 * @desc    Register a new student
 * @access  Public
 */
const registerStudent = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  const { name, email, password, college, branch, year, rollNo, skills, githubUsername, linkedinProfile } = req.body;

  const existing = await Student.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(400).json({ success: false, message: "An account with this email already exists" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const student = await Student.create({
    name,
    email,
    password: hashedPassword,
    college,
    branch,
    year,
    rollNo,
    // Optional sign-up extras (already validated by validateProfileUpdate).
    ...(skills && { skills }),
    ...(githubUsername && { githubUsername }),
    ...(linkedinProfile && { linkedinProfile }),
    studentStatus: "pending",
  });

  student.profileCompletion = calculateProfileCompletion(student);
  await student.save();
  notifyStaff({ type: "account", title: "New student awaiting approval", body: `${student.name} (${student.branch}) registered.`, link: "/tpo/student-approvals" });

  res.status(201).json({
    success: true,
    message: "Registration successful. Your account is awaiting approval by the placement cell.",
    token: generateToken(student._id),
    student: student.toSafeObject(),
  });
});

/**
 * @route   POST /api/auth/register-recruiter
 * @desc    Register a recruiter account. Recruiters share the Student
 *          collection (one login system) but have role "recruiter", so the
 *          student-only required fields get neutral placeholders.
 * @access  Public
 */
const registerRecruiter = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  const { name, email, password, organization } = req.body;

  const existing = await Student.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(400).json({ success: false, message: "An account with this email already exists" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const recruiter = await Student.create({
    name,
    email,
    password: hashedPassword,
    college: organization,
    branch: "Recruitment",
    year: "4th Year",
    rollNo: `REC-${Date.now().toString(36).toUpperCase()}`,
    role: "recruiter",
    organization,
    recruiterStatus: "pending",
  });

  notifyStaff({ type: "account", title: "New recruiter awaiting approval", body: `${name} from ${organization} registered.`, link: "/tpo/recruiters" });
  res.status(201).json({
    success: true,
    message: "Recruiter account created",
    token: generateToken(recruiter._id),
    student: recruiter.toSafeObject(),
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate student & return token
 * @access  Public
 */
const loginStudent = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  const { email, password } = req.body;

  const student = await Student.findOne({ email: email.toLowerCase() }).select("+password");
  if (!student) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, student.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  if (student.isActive === false) {
    return res.status(403).json({ success: false, message: "Your account has been deactivated. Please contact the administrator." });
  }

  student.lastLoginAt = new Date();
  await student.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: "Login successful",
    token: generateToken(student._id),
    student: student.toSafeObject(),
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout student. Since we use stateless JWTs stored client-side,
 *          logout simply instructs the client to discard the token.
 * @access  Private
 */
const logoutStudent = asyncHandler(async (req, res) => {
  res.json({ success: true, message: "Logged out successfully. Please remove the token on the client." });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged-in student (used to validate token on app load)
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, student: req.student.toSafeObject() });
});

module.exports = { registerStudent, registerRecruiter, loginStudent, logoutStudent, getMe };
