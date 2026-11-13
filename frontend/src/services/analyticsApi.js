import api from "../api/axios.js";

/**
 * Thin wrapper around the Module 3 analytics endpoints. Reuses the same
 * axios instance as Module 1/2 (src/api/axios.js) so the JWT interceptor
 * and 401 handling already in place keep working here for free.
 */
const analyticsApi = {
  getReadiness: () => api.get("/analytics/readiness").then((r) => r.data),

  getCareerRoles: () => api.get("/analytics/career-roles").then((r) => r.data),

  getSkillGap: (targetRole) => api.post("/analytics/skill-gap", { targetRole }).then((r) => r.data),

  getCareerInsights: () => api.get("/analytics/career-insights").then((r) => r.data),

  getLearningRecommendations: (targetRole) =>
    api.get("/analytics/learning-recommendations", { params: { targetRole } }).then((r) => r.data),

  completeRoadmapSkill: (skill) => api.post("/analytics/roadmap/complete", { skill }).then((r) => r.data),

  getCachedAnalysis: () => api.get("/analytics/cached").then((r) => r.data),

  runFullAnalysis: (targetRole) => api.post("/analytics/analyze", { targetRole }).then((r) => r.data),
};

export default analyticsApi;
