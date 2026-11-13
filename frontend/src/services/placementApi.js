import api from "../api/axios.js";

/**
 * Wrappers for the placement-drive endpoints. Each group is enforced by role on
 * the backend (student / recruiter / tpo+admin), regardless of what the UI shows.
 */
export const studentPlacementApi = {
  summary: () => api.get("/placement/summary").then((r) => r.data),
  listDrives: () => api.get("/placement/drives").then((r) => r.data),
  apply: (id) => api.post(`/placement/drives/${id}/apply`).then((r) => r.data),
  listApplications: () => api.get("/placement/applications").then((r) => r.data),
};

export const recruiterApi = {
  stats: () => api.get("/recruiter/stats").then((r) => r.data),
  listDrives: (params = {}) => api.get("/recruiter/drives", { params }).then((r) => r.data),
  createDrive: (body) => api.post("/recruiter/drives", body).then((r) => r.data),
  getDrive: (id) => api.get(`/recruiter/drives/${id}`).then((r) => r.data),
  updateDrive: (id, body) => api.put(`/recruiter/drives/${id}`, body).then((r) => r.data),
  deleteDrive: (id) => api.delete(`/recruiter/drives/${id}`).then((r) => r.data),
  updateRounds: (id, rounds) => api.put(`/recruiter/drives/${id}/rounds`, { rounds }).then((r) => r.data),
  evaluate: (id, applicationId, body) => api.patch(`/recruiter/drives/${id}/applications/${applicationId}`, body).then((r) => r.data),
  submitResults: (id) => api.post(`/recruiter/drives/${id}/submit-results`).then((r) => r.data),
  driveShortlist: (id) => api.get(`/recruiter/drives/${id}/shortlist`).then((r) => r.data),

};

export const tpoApi = {
  stats: () => api.get("/tpo/stats").then((r) => r.data),
  listDrives: (params = {}) => api.get("/tpo/drives", { params }).then((r) => r.data),
  getDrive: (id) => api.get(`/tpo/drives/${id}`).then((r) => r.data),
  review: (id, body) => api.patch(`/tpo/drives/${id}/review`, body).then((r) => r.data),
  finalize: (id, selections) => api.post(`/tpo/drives/${id}/finalize`, { selections }).then((r) => r.data),
  driveShortlist: (id) => api.get(`/tpo/drives/${id}/shortlist`).then((r) => r.data),

  // Student directory — every student's submitted profile data, straight from MongoDB.
  listStudents: (params = {}) => api.get("/tpo/students", { params }).then((r) => r.data),
  studentFacets: () => api.get("/tpo/students/facets").then((r) => r.data),
  getStudent: (id) => api.get(`/tpo/students/${id}`).then((r) => r.data),

  listRecruiters: () => api.get("/tpo/recruiters").then((r) => r.data),
  setRecruiterStatus: (id, status) => api.patch(`/tpo/recruiters/${id}/status`, { status }).then((r) => r.data),

  listStudentApprovals: (status) => api.get("/tpo/student-approvals", { params: { status } }).then((r) => r.data),
  setStudentApproval: (id, status) => api.patch(`/tpo/students/${id}/approval`, { status }).then((r) => r.data),

};
