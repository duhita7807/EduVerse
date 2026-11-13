import api from "../api/axios.js";

/**
 * Thin wrapper around the Module 4 career-assistant endpoints. Reuses the
 * same axios instance as every other module (JWT interceptor, 401 handling).
 */
const careerAssistantApi = {
  chat: (message, conversationId) => api.post("/career-assistant/chat", { message, conversationId }).then((r) => r.data),

  interview: (message, conversationId) =>
    api.post("/career-assistant/interview", { message, conversationId }).then((r) => r.data),

  roadmap: (targetRole, conversationId) =>
    api.post("/career-assistant/roadmap", { targetRole, conversationId }).then((r) => r.data),

  learningPlan: (topic, conversationId) =>
    api.post("/career-assistant/learning-plan", { topic, conversationId }).then((r) => r.data),

  listHistory: () => api.get("/career-assistant/history").then((r) => r.data),

  getConversation: (id) => api.get(`/career-assistant/history/${id}`).then((r) => r.data),

  deleteConversation: (id) => api.delete(`/career-assistant/history/${id}`).then((r) => r.data),

  clearHistory: () => api.delete("/career-assistant/history").then((r) => r.data),

  // Practice assessments (aptitude, coding, technical, HR)
  listAssessments: () => api.get("/career-assistant/assessments").then((r) => r.data),
  startAssessment: (type, level, testNo, track) => api.post("/career-assistant/assessments", { type, level, testNo, track }).then((r) => r.data),
  getAssessment: (id) => api.get(`/career-assistant/assessments/${id}`).then((r) => r.data),
  submitAssessment: (id, answers) => api.post(`/career-assistant/assessments/${id}/submit`, { answers }).then((r) => r.data),
  deleteAssessment: (id) => api.delete(`/career-assistant/assessments/${id}`).then((r) => r.data),
};

export default careerAssistantApi;
