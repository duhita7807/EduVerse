/**
 * Minimal in-memory rate limiter keyed by authenticated student id.
 * Good enough for a single-instance deployment; for multi-instance
 * production use, swap this for a Redis-backed limiter without changing
 * the route wiring.
 *
 * Must run AFTER the `protect` middleware so req.student is available.
 */
const rateLimit = ({ windowMs = 60000, max = 5, message = "Too many analysis requests." } = {}) => {
  // One bucket store PER CALL to rateLimit(), not shared module-wide.
  // Previously `buckets` lived at module scope, so every route using this
  // factory (Module 3's /analyze AND Module 4's chat/interview/roadmap)
  // incremented the SAME counter per student — using "Analyze Profile" a
  // couple of times silently ate into the AI Career Assistant's own
  // request budget, surfacing as a confusing 429 after only a few real
  // chat messages. Each limiter now tracks its own students independently.
  const buckets = new Map(); // studentId -> { count, resetAt }

  return (req, res, next) => {
    const key = req.student?._id?.toString();
    if (!key) return next(); // no authenticated student to key on, let auth middleware handle it

    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: `${message} Please try again in ${retryAfterSeconds} seconds.`,
      });
    }

    bucket.count += 1;
    return next();
  };
};

module.exports = rateLimit;
