/**
 * Centralized validation patterns and helper predicates, shared across
 * routes/controllers so rules aren't duplicated (and drift) between files.
 * Frontend mirrors these same rules in frontend/src/utils/validators.js —
 * keep the two in sync if you change something here.
 */

// Letters, spaces, apostrophes, hyphens and periods (covers names like
// "Mary-Jane O'Neil" or "A. K. Sharma") — no digits or stray symbols.
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,79}$/;

// Min 8 chars, at least one uppercase, one lowercase, one digit, one symbol.
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Roll numbers: letters/digits/hyphens only, 3-20 chars, no bare whitespace.
const ROLL_NO_REGEX = /^[A-Za-z0-9-]{3,20}$/;

// GitHub username rules (per GitHub's own constraints): alphanumeric and
// single hyphens, cannot start/end with a hyphen, max 39 chars.
const GITHUB_USERNAME_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

// Generic coding-platform username: alphanumeric, underscore, hyphen, period.
const GENERIC_USERNAME_REGEX = /^[A-Za-z0-9._-]{2,40}$/;

const LINKEDIN_URL_REGEX = /^https?:\/\/(www\.)?linkedin\.com\/.+/i;

const isValidYear = (year, { min = 1990, max = new Date().getFullYear() + 10 } = {}) => {
  const n = Number(year);
  return Number.isInteger(n) && n >= min && n <= max;
};

const isValidCgpa = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 10;
};

const isValidUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

module.exports = {
  NAME_REGEX,
  STRONG_PASSWORD_REGEX,
  ROLL_NO_REGEX,
  GITHUB_USERNAME_REGEX,
  GENERIC_USERNAME_REGEX,
  LINKEDIN_URL_REGEX,
  isValidYear,
  isValidCgpa,
  isValidUrl,
};
