/**
 * Centralized error handler. Any error passed to next(err), or thrown inside
 * an async route wrapped with asyncHandler, ends up here.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || "Server error";

  // Errors that carry their own status (e.g. upload file-type rejections)
  if (err.statusCode) statusCode = err.statusCode;

  // Multer upload errors (size limit, unexpected field, ...)
  if (err.name === "MulterError") {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "File is too large. Please upload a smaller file." : "Upload failed: " + err.message;
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Mongoose duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `${field ? field.charAt(0).toUpperCase() + field.slice(1) : "Field"} already in use`;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

const notFound = (req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
};

/**
 * Wraps an async route handler so thrown errors are forwarded to errorHandler
 * instead of crashing the process.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, notFound, asyncHandler };
