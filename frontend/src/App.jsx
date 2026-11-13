import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MyProfile from "./pages/MyProfile.jsx";
import EditProfile from "./pages/EditProfile.jsx";
import DigitalProfile from "./pages/DigitalProfile.jsx";
import Integrations from "./pages/Integrations.jsx";
import AIAnalytics from "./pages/AIAnalytics.jsx";
import CareerAssistant from "./pages/CareerAssistant.jsx";
import Practice from "./pages/Practice.jsx";
import useSpotlight from "./hooks/useSpotlight.js";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminOverview from "./pages/admin/AdminOverview.jsx";
import AdminStudents from "./pages/admin/AdminStudents.jsx";
import AdminCertificates from "./pages/admin/AdminCertificates.jsx";
import RegisterRecruiter from "./pages/RegisterRecruiter.jsx";
import PlacementDrives from "./pages/PlacementDrives.jsx";
import MyApplications from "./pages/MyApplications.jsx";
import Resume from "./pages/Resume.jsx";
import RecruiterOverview from "./pages/recruiter/RecruiterOverview.jsx";
import RecruiterDrives from "./pages/recruiter/RecruiterDrives.jsx";
import DriveForm from "./pages/recruiter/DriveForm.jsx";
import RecruiterDriveDetail from "./pages/recruiter/RecruiterDriveDetail.jsx";
import TpoOverview from "./pages/tpo/TpoOverview.jsx";
import TpoDrives from "./pages/tpo/TpoDrives.jsx";
import TpoDriveDetail from "./pages/tpo/TpoDriveDetail.jsx";
import TpoStudents from "./pages/tpo/TpoStudents.jsx";
import TpoRecruiters from "./pages/tpo/TpoRecruiters.jsx";
import StudentApprovals from "./pages/tpo/StudentApprovals.jsx";
import AdminShortlisted from "./pages/admin/AdminShortlisted.jsx";
import Messages from "./pages/Messages.jsx";
import Notifications from "./pages/Notifications.jsx";

function App() {
  useSpotlight();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register-recruiter" element={<RegisterRecruiter />} />
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
      <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
      <Route path="/digital-profile" element={<ProtectedRoute><DigitalProfile /></ProtectedRoute>} />
      <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AIAnalytics /></ProtectedRoute>} />
      <Route path="/career-assistant" element={<ProtectedRoute><CareerAssistant /></ProtectedRoute>} />
      <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />

      <Route path="/drives" element={<ProtectedRoute><PlacementDrives /></ProtectedRoute>} />
      <Route path="/resume" element={<ProtectedRoute><Resume /></ProtectedRoute>} />
      <Route path="/applications" element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />

      <Route path="/recruiter" element={<ProtectedRoute roles={["recruiter"]}><RecruiterOverview /></ProtectedRoute>} />
      <Route path="/recruiter/drives" element={<ProtectedRoute roles={["recruiter"]}><RecruiterDrives /></ProtectedRoute>} />
      <Route path="/recruiter/drives/new" element={<ProtectedRoute roles={["recruiter"]}><DriveForm /></ProtectedRoute>} />
      <Route path="/recruiter/drives/:id" element={<ProtectedRoute roles={["recruiter"]}><RecruiterDriveDetail /></ProtectedRoute>} />
      <Route path="/recruiter/drives/:id/edit" element={<ProtectedRoute roles={["recruiter"]}><DriveForm /></ProtectedRoute>} />

      <Route path="/tpo" element={<ProtectedRoute roles={["tpo", "admin"]}><TpoOverview /></ProtectedRoute>} />
      <Route path="/tpo/drives" element={<ProtectedRoute roles={["tpo", "admin"]}><TpoDrives /></ProtectedRoute>} />
      <Route path="/tpo/drives/:id" element={<ProtectedRoute roles={["tpo", "admin"]}><TpoDriveDetail /></ProtectedRoute>} />
      <Route path="/tpo/student-approvals" element={<ProtectedRoute roles={["tpo", "admin"]}><StudentApprovals /></ProtectedRoute>} />
      <Route path="/tpo/recruiters" element={<ProtectedRoute roles={["tpo", "admin"]}><TpoRecruiters /></ProtectedRoute>} />
      <Route path="/tpo/students" element={<ProtectedRoute roles={["tpo", "admin"]}><TpoStudents /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminOverview /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute adminOnly><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/certificates" element={<ProtectedRoute adminOnly><AdminCertificates /></ProtectedRoute>} />
      <Route path="/admin/shortlisted" element={<ProtectedRoute adminOnly><AdminShortlisted /></ProtectedRoute>} />

      <Route path="/notifications" element={<ProtectedRoute roles={["student", "recruiter", "tpo", "admin"]}><Notifications /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute roles={["recruiter", "tpo", "admin"]}><Messages /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
