require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const githubRoutes = require("./routes/githubRoutes");
const aiRoutes = require("./routes/aiRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes"); // Module 3
const careerAssistantRoutes = require("./routes/careerAssistantRoutes"); // Module 4
const adminRoutes = require("./routes/adminRoutes"); // Admin dashboard
const placementRoutes = require("./routes/placementRoutes"); // Placement: student drives
const recruiterRoutes = require("./routes/recruiterRoutes"); // Placement: recruiter
const tpoRoutes = require("./routes/tpoRoutes"); // Placement: TPO
const messageRoutes = require("./routes/messageRoutes"); // Recruiter <-> placement cell chat
const notificationRoutes = require("./routes/notificationRoutes"); // In-app notifications + live stream
const ensureAdmin = require("./utils/ensureAdmin");
const ensureTpo = require("./utils/ensureTpo");

connectDB().then(ensureAdmin).then(ensureTpo);

const app = express();

// Core middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded profile photos & certificate documents statically
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      // Let the frontend (different origin in dev) embed/open uploaded files
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "EduVerse API is running", timestamp: new Date().toISOString() });
});

// Module 1 & 2 routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes); // Module 3
app.use("/api/career-assistant", careerAssistantRoutes); // Module 4
app.use("/api/admin", adminRoutes); // Admin dashboard
app.use("/api/placement", placementRoutes); // Student: eligible drives, apply, results
app.use("/api/recruiter", recruiterRoutes); // Recruiter: drives, applicants, results
app.use("/api/tpo", tpoRoutes); // TPO: verify drives, finalize selections
app.use("/api/messages", messageRoutes); // Real-time recruiter <-> TPO/admin chat
app.use("/api/notifications", notificationRoutes); // Notifications for every role

// 404 + error handling (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 EduVerse API running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
