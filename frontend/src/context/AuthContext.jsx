import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";
import { useToast } from "./ToastContext.jsx";

const AuthContext = createContext(null);

export const PROFILE_UPDATED_EVENT = "eduverse:profile-updated";

export const AuthProvider = ({ children }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // On first load, validate any saved token against the backend so a
  // stale/expired token doesn't silently keep the user "logged in".
  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("eduverse_token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        setStudent(data.student);
      } catch {
        localStorage.removeItem("eduverse_token");
        localStorage.removeItem("eduverse_student");
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  // Any request anywhere in the app that gets a 401 broadcasts this event
  // (see api/axios.js) — react to it centrally so an expired session
  // always surfaces the same message and logs the user out immediately.
  useEffect(() => {
    const onSessionExpired = () => {
      setStudent(null);
      toast.warning("Your session has expired. Please log in again.");
    };
    window.addEventListener("eduverse:session-expired", onSessionExpired);
    return () => window.removeEventListener("eduverse:session-expired", onSessionExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("eduverse_token", data.token);
    localStorage.setItem("eduverse_student", JSON.stringify(data.student));
    setStudent(data.student);
    return data.student;
  };

  const register = async (formData, additionalProfileData) => {
    // Optional Step 3 extras (skills, GitHub, LinkedIn) go in the same request:
    // new accounts are pending approval and can't use the profile endpoint yet.
    const { data } = await api.post("/auth/register", { ...formData, ...additionalProfileData });
    localStorage.setItem("eduverse_token", data.token);
    localStorage.setItem("eduverse_student", JSON.stringify(data.student));
    setStudent(data.student);
    return data.student;
  };

  const registerRecruiter = async (formData) => {
    const { data } = await api.post("/auth/register-recruiter", formData);
    localStorage.setItem("eduverse_token", data.token);
    localStorage.setItem("eduverse_student", JSON.stringify(data.student));
    setStudent(data.student);
    return data.student;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore network errors on logout — clear session locally regardless
    }
    localStorage.removeItem("eduverse_token");
    localStorage.removeItem("eduverse_student");
    setStudent(null);
  };

  const updateStudentInState = (updated) => {
    setStudent(updated);
    localStorage.setItem("eduverse_student", JSON.stringify(updated));
    // Every profile change funnels through here; live views (AI Analysis, Dashboard) re-sync on it.
    window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
  };

  return (
    <AuthContext.Provider
      value={{ student, loading, login, register, registerRecruiter, logout, updateStudentInState }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
