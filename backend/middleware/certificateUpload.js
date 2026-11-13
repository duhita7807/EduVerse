const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const CERT_DIR = path.join(__dirname, "..", "uploads", "certificates");
fs.mkdirSync(CERT_DIR, { recursive: true });

const ALLOWED = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CERT_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // student id prefix lets the profile validator verify ownership later;
    // the random suffix makes URLs unguessable.
    cb(null, `cert-${req.student._id}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED[ext] && ALLOWED[ext].includes(file.mimetype)) return cb(null, true);
  const err = new Error("Only PDF, PNG, JPG or WebP files are allowed for certificates.");
  err.statusCode = 400;
  cb(err);
};

const uploadCertificate = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE, files: 1 } }).single("file");

/** True when the first bytes of the file match its claimed type (extensions/mimetypes are client-controlled). */
const hasValidSignature = (filePath, ext) => {
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  if (ext === ".pdf") return buf.slice(0, 4).toString("latin1") === "%PDF";
  if (ext === ".png") return buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (ext === ".jpg" || ext === ".jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === ".webp") return buf.slice(0, 4).toString("latin1") === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP";
  return false;
};

/** Safely removes a stored certificate file given its public URL. Ignores anything outside the certificates dir. */
const deleteCertificateFile = (url) => {
  if (typeof url !== "string" || !url.startsWith("/uploads/certificates/")) return;
  const target = path.join(CERT_DIR, path.basename(url));
  fs.unlink(target, () => {}); // best effort; missing file is fine
};

/** URL pattern a student is allowed to attach: must be one of THEIR OWN uploads. */
const ownCertificateUrlRegex = (studentId) =>
  new RegExp(`^/uploads/certificates/cert-${studentId}-[a-f0-9]{16}\\.(pdf|png|jpe?g|webp)$`);

module.exports = {
  uploadCertificate,
  hasValidSignature,
  deleteCertificateFile,
  ownCertificateUrlRegex,
  MAX_SIZE,
};
