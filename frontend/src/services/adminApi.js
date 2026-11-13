import api from "../api/axios.js";

/**
 * Wrapper around the admin-only backend endpoints (see
 * backend/routes/adminRoutes.js). Every call here requires the logged-in
 * account to have role "admin" — the backend enforces this independently,
 * so a non-admin token gets a 403 regardless of what the frontend shows.
 */
const adminApi = {
  getStats: () => api.get("/admin/stats").then((r) => r.data),

  listStudents: (params = {}) => api.get("/admin/students", { params }).then((r) => r.data),

  getStudent: (id) => api.get(`/admin/students/${id}`).then((r) => r.data),

  setStudentStatus: (id, isActive) => api.patch(`/admin/students/${id}/status`, { isActive }).then((r) => r.data),

  deleteStudent: (id) => api.delete(`/admin/students/${id}`).then((r) => r.data),

  listCertificates: (params = {}) => api.get("/admin/certificates", { params }).then((r) => r.data),

  reviewCertificate: (studentId, certId, status, note) =>
    api.patch(`/admin/certificates/${studentId}/${certId}`, { status, note }).then((r) => r.data),

  listShortlisted: (params = {}) => api.get("/admin/shortlisted", { params }).then((r) => r.data),


  removeFromShortlist: (driveId, studentId) => api.delete(`/admin/drives/${driveId}/shortlist/${studentId}`).then((r) => r.data),

  sendShortlist: (driveId) => api.post(`/admin/drives/${driveId}/shortlist/send`).then((r) => r.data),
};

export default adminApi;
