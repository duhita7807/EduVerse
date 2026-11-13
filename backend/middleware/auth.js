const jwt = require("jsonwebtoken");
const Student = require("../models/Student");

/**
 * Protects routes by verifying the JWT sent in the Authorization header
 * as "Bearer <token>". On success, attaches the student document to req.student.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.student = await Student.findById(decoded.id);

      if (!req.student) {
        return res.status(401).json({ success: false, message: "Student no longer exists" });
      }

      if (req.student.isActive === false) {
        return res.status(403).json({ success: false, message: "Your account has been deactivated. Please contact the administrator." });
      }

      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Not authorized, token invalid or expired" });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
  }
};

/**
 * Must run AFTER `protect`. Restricts a route to the admin account. Role
 * lives only in the database (never client-editable, see Student.js /
 * profileController.js), so it can't be self-assigned via the API.
 */
const adminOnly = (req, res, next) => {
  if (req.student && req.student.role === "admin") return next();
  return res.status(403).json({ success: false, message: "Admin access required." });
};

/**
 * Must run AFTER `protect`. Restricts a route to one or more roles, e.g.
 * requireRole("tpo", "admin"). The admin account is allowed on TPO routes so
 * the platform owner can also verify drives.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (req.student && roles.includes(req.student.role)) return next();
  return res.status(403).json({ success: false, message: "You don't have permission to do that." });
};

/** Must run AFTER requireRole("recruiter"). Blocks recruiters a TPO/admin hasn't approved. */
const approvedRecruiter = (req, res, next) => {
  const status = req.student.recruiterStatus || "approved";
  if (status === "approved") return next();
  return res.status(403).json({
    success: false,
    message: status === "rejected" ? "Your recruiter account was rejected." : "Your recruiter account is awaiting TPO approval.",
  });
};

/**
 * Must run AFTER `protect`. Blocks students a TPO/admin hasn't approved from
 * student features. Other roles pass through (they have their own guards).
 */
const approvedStudent = (req, res, next) => {
  if (req.student.role !== "student") return next();
  const status = req.student.studentStatus || "approved";
  if (status === "approved") return next();
  return res.status(403).json({
    success: false,
    code: "STUDENT_NOT_APPROVED",
    message: status === "rejected" ? "Your student account was not approved. Please contact the placement cell." : "Your student account is awaiting approval by the placement cell.",
  });
};

module.exports = { protect, adminOnly, requireRole, approvedRecruiter, approvedStudent };
