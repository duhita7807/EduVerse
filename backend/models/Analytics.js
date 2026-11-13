const mongoose = require("mongoose");

/**
 * Stores a cached snapshot of the last analytics run for a student.
 * References Student via userId instead of duplicating the profile —
 * Module 3 always reads live profile data at analysis time, then caches
 * only the RESULT here so the dashboard can load instantly and
 * "Refresh Analysis" has something to compare against.
 */
const analyticsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, unique: true, index: true },

    readinessScore: { type: Number, min: 0, max: 100, default: 0 },
    readinessCategory: { type: String, default: "" },
    componentScores: {
      technicalSkills: { type: Number, default: 0 },
      projects: { type: Number, default: 0 },
      internships: { type: Number, default: 0 },
      coding: { type: Number, default: 0 },
      github: { type: Number, default: 0 },
      certifications: { type: Number, default: 0 },
      profileCompleteness: { type: Number, default: 0 },
    },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    improvementAreas: [
      {
        area: String,
        score: Number,
      },
    ],

    targetRole: { type: String, default: "" },
    skillGaps: {
      strongSkills: [{ type: String }],
      partialSkills: [{ type: String }],
      missingSkills: [{ type: String }],
      coveragePercentage: { type: Number, default: 0 },
      gapPercentage: { type: Number, default: 0 },
    },

    careerInsights: [
      {
        career: String,
        matchScore: Number,
        relevantSkills: [String],
        missingSkills: [String],
        reason: String,
        nextSteps: String,
      },
    ],

    learningRecommendations: [
      {
        skill: String,
        priority: String,
        reason: String,
        learningObjective: String,
        practiceTask: String,
        suggestedProject: String,
        estimatedDuration: String,
        weekRange: String,
      },
    ],

    projectRecommendations: [
      {
        title: String,
        description: String,
        technologies: [String],
        skillsDeveloped: [String],
        difficulty: String,
        whyItHelps: String,
      },
    ],

    aiSummary: { type: String, default: "" },
    // componentScores (JSON) the AI text was generated from; used to flag stale AI insights.
    aiBasis: { type: String, default: "" },
    aiInsights: {
      strengths: [String],
      weaknesses: [String],
      careerInsights: [String],
      skillRecommendations: [String],
      learningRecommendations: [String],
      projectRecommendations: [String],
    },

    engine: { type: String, default: "weighted-scoring-v1" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analytics", analyticsSchema);
