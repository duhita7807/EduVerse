const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  uploadCertificateFile,
  discardCertificateFile,
  getProfileCompletion,
  resolveLinkedinPost,
} = require("../controllers/profileController");
const { uploadCertificate } = require("../middleware/certificateUpload");
const { protect, approvedStudent } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimiter");
const { validateProfileUpdate } = require("../middleware/validateProfile");

const router = express.Router();
const linkLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

// Local disk storage for profile photos. Swap for S3/Cloudinary in production.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.student._id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const isValid = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  if (isValid) return cb(null, true);
  cb(new Error("Only .jpeg, .jpg, .png and .webp image files are allowed"));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 3 * 1024 * 1024 } }); // 3MB max

router.get("/", protect, approvedStudent, approvedStudent, getProfile);
router.put("/", protect, approvedStudent, approvedStudent, validateProfileUpdate, updateProfile);
router.post("/photo", protect, approvedStudent, approvedStudent, upload.single("photo"), uploadProfilePhoto);
router.post("/certificate-file", protect, approvedStudent, approvedStudent, uploadCertificate, uploadCertificateFile);
router.delete("/certificate-file", protect, approvedStudent, approvedStudent, discardCertificateFile);
router.post("/linkedin-post/resolve", protect, approvedStudent, linkLimiter, resolveLinkedinPost);
router.get("/completion", protect, approvedStudent, approvedStudent, getProfileCompletion);

module.exports = router;
