/**
 * Frontend validation rules. Mirrors backend/utils/validators.js so the
 * user sees the same rule client-side (fast feedback) that the server
 * will also enforce (source of truth) — never rely on this file alone.
 */
export const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const ROLL_NO_REGEX = /^[A-Za-z0-9-]{3,20}$/;
export const GITHUB_USERNAME_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
export const GENERIC_USERNAME_REGEX = /^[A-Za-z0-9._-]{2,40}$/;
export const LINKEDIN_URL_REGEX = /^https?:\/\/(www\.)?linkedin\.com\/.+/i;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validators = {
  required: (label = "This field") => (value) =>
    value === undefined || value === null || String(value).trim() === "" ? `${label} is required.` : "",

  name: (value) => {
    const v = String(value || "").trim();
    if (!v) return "Full name is required.";
    if (v.length < 2 || v.length > 80 || !NAME_REGEX.test(v)) return "Please enter a valid full name.";
    return "";
  },

  email: (value) => {
    const v = String(value || "").trim();
    if (!v) return "Email is required.";
    if (!EMAIL_REGEX.test(v)) return "Please enter a valid email address.";
    return "";
  },

  password: (value) => {
    const v = String(value || "");
    if (!v) return "Password is required.";
    if (v.length < 8) return "Password must be at least 8 characters.";
    if (!STRONG_PASSWORD_REGEX.test(v)) {
      return "Password must include an uppercase letter, a lowercase letter, a number, and a special character.";
    }
    return "";
  },

  confirmPassword: (password) => (value) => {
    if (!value) return "Please confirm your password.";
    return value === password ? "" : "Passwords do not match.";
  },

  rollNo: (value) => {
    const v = String(value || "").trim();
    if (!v) return "Roll number is required.";
    if (!ROLL_NO_REGEX.test(v)) return "Roll number should be 3-20 characters, letters/numbers/hyphens only.";
    return "";
  },

  githubUsername: (value) => {
    const v = String(value || "").trim();
    if (!v) return ""; // optional field
    return GITHUB_USERNAME_REGEX.test(v) ? "" : "Please enter a valid GitHub username.";
  },

  genericUsername: (label = "Username") => (value) => {
    const v = String(value || "").trim();
    if (!v) return "";
    return GENERIC_USERNAME_REGEX.test(v) ? "" : `Please enter a valid ${label}.`;
  },

  linkedinUrl: (value) => {
    const v = String(value || "").trim();
    if (!v) return "";
    return LINKEDIN_URL_REGEX.test(v) ? "" : "Please enter a valid LinkedIn URL.";
  },

  url: (label = "URL") => (value) => {
    const v = String(value || "").trim();
    if (!v) return "";
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:" ? "" : `Please enter a valid ${label}.`;
    } catch {
      return `Please enter a valid ${label}.`;
    }
  },

  cgpa: (value) => {
    if (value === "" || value === undefined || value === null) return "";
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 10 ? "" : "CGPA must be a number between 0 and 10.";
  },

  percentage: (value) => {
    if (value === "" || value === undefined || value === null) return "";
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? "" : "Percentage must be between 0 and 100.";
  },

  maxLength: (max, label = "This field") => (value) =>
    String(value || "").length > max ? `${label} must be ${max} characters or fewer.` : "",
};

/** 0-4 strength score + label + color, used by the password strength meter. */
export const getPasswordStrength = (password) => {
  const v = password || "";
  if (!v) return { score: 0, label: "", color: "var(--border)" };

  let score = 0;
  if (v.length >= 8) score++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
  if (/\d/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  if (v.length >= 12) score++;

  const levels = [
    { label: "Very weak", color: "var(--danger)" },
    { label: "Weak", color: "var(--danger)" },
    { label: "Medium", color: "var(--warning)" },
    { label: "Strong", color: "var(--success)" },
    { label: "Very strong", color: "var(--success)" },
  ];
  const clamped = Math.min(score, levels.length - 1);
  return { score: clamped, label: levels[clamped].label, color: levels[clamped].color };
};

/** Runs a { field: validatorFn } map against a values object; returns { field: errorMessage }. */
export const runValidation = (values, schema) => {
  const errors = {};
  Object.entries(schema).forEach(([field, fn]) => {
    const message = fn(values[field]);
    if (message) errors[field] = message;
  });
  return errors;
};

/**
 * Pulls the post URN out of anything LinkedIn gives you for a post: the post
 * link (/posts/...-activity|share|ugcPost-<id>-...), a /feed/update/urn:li:... link, or the
 * "Embed this post" iframe code. Returns null if none is found.
 */
export const linkedinPostUrn = (input) => {
  const s = String(input || "");
  const m = s.match(/urn(?::|%3A)li(?::|%3A)(activity|share|ugcPost)(?::|%3A)(\d{6,25})/i);
  if (m) return `urn:li:${{ activity: "activity", share: "share", ugcpost: "ugcPost" }[m[1].toLowerCase()]}:${m[2]}`;
  const a = s.match(/linkedin\.com\/posts\/[^\s"']*(activity|share|ugcPost)-(\d{6,25})/i);
  return a ? `urn:li:${{ activity: "activity", share: "share", ugcpost: "ugcPost" }[a[1].toLowerCase()]}:${a[2]}` : null;
};
