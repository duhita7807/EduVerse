import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 30000,
});

// Attach the JWT to every outgoing request if we have one saved.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("eduverse_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token is invalid/expired, clear local session so the app
// redirects back to login instead of looping on failed requests, and
// broadcast an event so AuthContext can show a toast + force-logout
// even from a request the current page didn't directly await.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response && error.response.status === 401) {
      const hadSession = Boolean(localStorage.getItem("eduverse_token"));
      localStorage.removeItem("eduverse_token");
      localStorage.removeItem("eduverse_student");
      if (hadSession) {
        window.dispatchEvent(new CustomEvent("eduverse:session-expired"));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
