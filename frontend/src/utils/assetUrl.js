// Uploaded files are stored by the backend as relative paths like
// "/uploads/certificates/abc.pdf". The frontend (Vite, port 5173) and the API
// (port 5000) are different origins, so these need the API origin prepended
// before they can be used in <img src>, <a href>, etc.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export const assetUrl = (path) => {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
};

export const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const isImageFile = (file) => Boolean(file?.mimeType?.startsWith("image/"));
