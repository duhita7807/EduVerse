/**
 * Student-submitted links (LinkedIn, repos, credentials) are free text. Before
 * putting one in an href we only allow http(s); a bare "linkedin.com/in/x" gets
 * https:// prepended. Anything else (javascript:, data:, plain words) returns
 * null so the caller can show it as text instead of a link.
 */
export const safeUrl = (value) => {
  const v = String(value || "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null; // some other scheme
  return /^[\w-]+(\.[\w-]+)+(\/|$|\?|#)/.test(v) ? `https://${v}` : null;
};

export const githubUrl = (username) => (username && /^[\w-]+$/.test(username.trim()) ? `https://github.com/${username.trim()}` : null);
