const path = require("path");
const fs = require("fs");
const Student = require("../models/Student");
const { asyncHandler } = require("../middleware/errorHandler");
const httpError = require("../utils/httpError");
const { isShortLink, resolveShortLink } = require("../utils/linkedinPost");
const { calculateProfileCompletion } = require("../services/profileCompletionService");
const { hasValidSignature, deleteCertificateFile, ownCertificateUrlRegex } = require("../middleware/certificateUpload");

// Fields a student is allowed to self-update. Keeps password/email changes
// out of this generic update route (a dedicated flow would handle those).
/**
 * Students submit the whole certifications array on every save, including
 * whatever verificationStatus/verificationNote the client happens to send.
 * Admin review state must never be client-controlled, so for each incoming
 * certification we discard the client's values and re-apply the stored
 * ones — unless the attached file changed (new/replaced upload), in which
 * case it resets to "pending" for re-review.
 */
const mergeCertificationVerification = (existingList = [], incomingList = []) => {
  const byId = new Map(existingList.map((e) => [String(e._id), e]));
  return incomingList.map((item) => {
    const { verificationStatus, verificationNote, verifiedAt, ...rest } = item; // strip client-sent values
    const prev = item._id ? byId.get(String(item._id)) : null;
    const sameFile = prev && prev.certificateFile?.url && prev.certificateFile.url === rest.certificateFile?.url;

    if (prev && sameFile) {
      return { ...rest, verificationStatus: prev.verificationStatus, verificationNote: prev.verificationNote, verifiedAt: prev.verifiedAt };
    }
    if (rest.certificateFile?.url) {
      return { ...rest, verificationStatus: "pending", verificationNote: "", verifiedAt: undefined };
    }
    return { ...rest, verificationStatus: "unreviewed", verificationNote: "", verifiedAt: undefined };
  });
};

const EDITABLE_FIELDS = [
  "name",
  "college",
  "branch",
  "year",
  "rollNo",
  "bio",
  "profilePhoto",
  "skills",
  "education",
  "projects",
  "internships",
  "certifications",
  "githubUsername",
  "linkedinProfile",
  "linkedinPosts",
  "leetcodeUsername",
  "hackerrankUsername",
  "careerInterests",
];

/**
 * @route   GET /api/profile
 * @desc    Get the logged-in student's full profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.student._id);
  res.json({ success: true, student: student.toSafeObject() });
});

/**
 * @route   PUT /api/profile
 * @desc    Update editable profile fields + recalculate completion %
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.student._id);

  // Remember which certificate files were attached before this update so any
  // that are no longer referenced (removed / replaced) can be deleted from disk.
  const previousCertUrls = (student.certifications || [])
    .map((c) => c.certificateFile && c.certificateFile.url)
    .filter(Boolean);

  EDITABLE_FIELDS.forEach((field) => {
    if (req.body[field] === undefined) return;
    if (field === "certifications" && Array.isArray(req.body[field])) {
      student[field] = mergeCertificationVerification(student.certifications, req.body[field]);
    } else {
      student[field] = req.body[field];
    }
  });

  student.profileCompletion = calculateProfileCompletion(student);
  await student.save();

  const currentCertUrls = new Set(
    (student.certifications || []).map((c) => c.certificateFile && c.certificateFile.url).filter(Boolean)
  );
  previousCertUrls.filter((url) => !currentCertUrls.has(url)).forEach(deleteCertificateFile);

  res.json({ success: true, message: "Profile updated successfully", student: student.toSafeObject() });
});

/**
 * @route   POST /api/profile/photo
 * @desc    Upload/update profile photo
 * @access  Private
 */
const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const student = await Student.findById(req.student._id);
  student.profilePhoto = `/uploads/${req.file.filename}`;
  student.profileCompletion = calculateProfileCompletion(student);
  await student.save();

  res.json({ success: true, message: "Profile photo updated", profilePhoto: student.profilePhoto });
});

/**
 * @route   POST /api/profile/certificate-file
 * @desc    Upload a certificate document (PDF/PNG/JPG/WebP, max 5MB). Returns the
 *          file metadata; it is attached to a certification when the profile is saved.
 * @access  Private
 */
const uploadCertificateFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const ext = path.extname(req.file.filename).toLowerCase();
  if (!hasValidSignature(req.file.path, ext)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, message: "That file doesn't look like a valid " + ext.slice(1).toUpperCase() + " document." });
  }

  res.status(201).json({
    success: true,
    message: "Certificate uploaded",
    file: {
      url: `/uploads/certificates/${req.file.filename}`,
      originalName: path.basename(req.file.originalname).slice(0, 120),
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
  });
});

/**
 * @route   DELETE /api/profile/certificate-file?url=...
 * @desc    Discard a certificate upload that was never saved to the profile
 *          (user replaced/removed it before hitting Save). Files already
 *          attached to a saved certification are left alone.
 * @access  Private
 */
const discardCertificateFile = asyncHandler(async (req, res) => {
  const url = String(req.query.url || "");
  if (!ownCertificateUrlRegex(req.student._id).test(url)) {
    return res.status(400).json({ success: false, message: "Invalid file reference" });
  }
  const student = await Student.findById(req.student._id);
  const stillReferenced = (student.certifications || []).some((c) => c.certificateFile && c.certificateFile.url === url);
  if (!stillReferenced) deleteCertificateFile(url);
  res.json({ success: true });
});

/**
 * @route   GET /api/profile/completion
 * @desc    Get profile completion percentage + section breakdown
 * @access  Private
 */
const getProfileCompletion = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.student._id);
  const percentage = calculateProfileCompletion(student);

  if (student.profileCompletion !== percentage) {
    student.profileCompletion = percentage;
    await student.save();
  }

  res.json({
    success: true,
    profileCompletion: percentage,
    sections: {
      personalInfo: Boolean(student.name && student.college && student.branch && student.year && student.rollNo),
      education: student.education.length > 0,
      skills: Object.values(student.skills?.toObject?.() || student.skills || {}).some(
        (arr) => Array.isArray(arr) && arr.length > 0
      ),
      projects: student.projects.length > 0,
      internships: student.internships.length > 0,
      certifications: student.certifications.length > 0,
      codingProfiles: Boolean(student.githubUsername || student.leetcodeUsername || student.hackerrankUsername),
    },
  });
});

/**
 * @route POST /api/profile/linkedin-post/resolve  body: { url }
 * LinkedIn share buttons can give a lnkd.in short link with no post id in it.
 */
const resolveLinkedinPost = asyncHandler(async (req, res) => {
  const url = String(req.body.url || "").trim();
  if (!isShortLink(url)) throw httpError(400, "That is not a valid lnkd.in link.");
  const urn = await resolveShortLink(url).catch(() => null);
  if (!urn) throw httpError(422, "Couldn't find a LinkedIn post behind that link. Open the post and paste its full linkedin.com/posts/ link.");
  res.json({ success: true, urn });
});

module.exports = { resolveLinkedinPost, getProfile, updateProfile, uploadProfilePhoto, uploadCertificateFile, discardCertificateFile, getProfileCompletion };
