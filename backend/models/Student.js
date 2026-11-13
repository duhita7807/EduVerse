const mongoose = require("mongoose");

/* ---------- Sub-schemas ---------- */

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, trim: true },
    institution: { type: String, trim: true },
    branch: { type: String, trim: true },
    startYear: { type: Number },
    endYear: { type: Number },
    cgpa: { type: Number, min: 0, max: 10 },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  technologies: [{ type: String, trim: true }],
  githubRepo: { type: String, trim: true },
  liveDemo: { type: String, trim: true },
});

const internshipSchema = new mongoose.Schema({
  company: { type: String, required: true, trim: true },
  role: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  description: { type: String, trim: true },
});

// Metadata for an uploaded certificate document (PDF / image). The file
// itself lives on disk under uploads/certificates; only this pointer is stored.
const certificateFileSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true },
    originalName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number },
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  issuedBy: { type: String, trim: true },
  issueDate: { type: Date },
  credentialUrl: { type: String, trim: true },
  certificateFile: { type: certificateFileSchema, default: undefined },

  // Admin review state for the attached certificateFile. Students can never
  // set these directly — profileController re-applies the stored values on
  // every profile save regardless of what the client sends (see
  // mergeCertificationVerification), so this can only change via the admin
  // document-review endpoint.
  verificationStatus: { type: String, enum: ["unreviewed", "pending", "verified", "rejected"], default: "unreviewed" },
  verificationNote: { type: String, trim: true, maxlength: 300, default: "" },
  verifiedAt: { type: Date },
});

const skillsSchema = new mongoose.Schema(
  {
    programmingLanguages: [{ type: String, trim: true }],
    webTechnologies: [{ type: String, trim: true }],
    databases: [{ type: String, trim: true }],
    tools: [{ type: String, trim: true }],
  },
  { _id: false }
);

// Cached snapshot of publicly fetched GitHub data so we don't hit the
// GitHub API on every page load. Refreshed by githubController.
const githubDataSchema = new mongoose.Schema(
  {
    username: { type: String, trim: true },
    profileUrl: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    publicRepos: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    repositories: [
      {
        name: String,
        description: String,
        language: String,
        stars: Number,
        forks: Number,
        url: String,
        updatedAt: Date,
      },
    ],
    lastSyncedAt: { type: Date },
  },
  { _id: false }
);

const aiInsightsSchema = new mongoose.Schema(
  {
    summary: { type: String, trim: true },
    extractedSkills: [{ type: String, trim: true }],
    suggestedCategories: [{ type: String, trim: true }],
    improvementSuggestions: [{ type: String, trim: true }],
    generatedAt: { type: Date },
  },
  { _id: false }
);

/* ---------- Main Student schema ---------- */

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Full name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: { type: String, required: [true, "Password is required"], minlength: 6, select: false },

    college: { type: String, required: [true, "College name is required"], trim: true },
    branch: { type: String, required: [true, "Branch is required"], trim: true },
    year: {
      type: String,
      required: [true, "Year is required"],
      enum: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    },
    rollNo: { type: String, required: [true, "Roll number is required"], trim: true },

    profilePhoto: { type: String, default: "" }, // URL / relative path to uploaded photo
    bio: { type: String, trim: true, maxlength: 300, default: "" },

    // Access control. Only ever set server-side: registerStudent defaults to
    // "student"; registerRecruiter sets "recruiter"; the admin and TPO accounts
    // are created/promoted by utils/ensureAdmin.js and utils/ensureTpo.js.
    // Not in profileController's EDITABLE_FIELDS, so a student can never
    // change this via PUT /api/profile.
    role: { type: String, enum: ["student", "admin", "tpo", "recruiter"], default: "student", index: true },
    // Company the recruiter represents (only used when role === "recruiter").
    organization: { type: String, trim: true, default: "" },
    // Recruiter verification by TPO/admin. Missing on recruiters created before
    // this field existed — those count as approved so they keep working.
    recruiterStatus: { type: String, enum: ["pending", "approved", "rejected"] },
    // Student verification by TPO/admin. New sign-ups start "pending"; students
    // created before this field existed have none and count as approved.
    studentStatus: { type: String, enum: ["pending", "approved", "rejected"] },
    // Learning-roadmap skills the student marked completed.
    completedRoadmapSkills: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },

    skills: { type: skillsSchema, default: () => ({}) },
    education: [educationSchema],
    projects: [projectSchema],
    internships: [internshipSchema],
    certifications: [certificationSchema],

    githubUsername: { type: String, trim: true, default: "" },
    linkedinProfile: { type: String, trim: true, default: "" },
    // LinkedIn posts the student chose to showcase, stored as post URNs
    // (urn:li:activity|share|ugcPost:<id>); the embed URL is built from these.
    linkedinPosts: [{ type: String, trim: true }],
    leetcodeUsername: { type: String, trim: true, default: "" },
    hackerrankUsername: { type: String, trim: true, default: "" },

    // Free-text interest tags (e.g. "Automobile Design", "Web Development").
    // Used by skillGapService to nudge career-role rankings and by the AI
    // analytics/assistant prompts, alongside branch/skills/projects/academics.
    careerInterests: [{ type: String, trim: true }],

    githubData: { type: githubDataSchema, default: () => ({}) },
    aiInsights: { type: aiInsightsSchema, default: () => ({}) },

    profileCompletion: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true } // adds createdAt & updatedAt automatically
);

// Never leak password hash even if select('+password') was used upstream by mistake
studentSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("Student", studentSchema);
