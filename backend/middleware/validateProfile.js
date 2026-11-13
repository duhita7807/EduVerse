const {
  NAME_REGEX,
  ROLL_NO_REGEX,
  GITHUB_USERNAME_REGEX,
  GENERIC_USERNAME_REGEX,
  LINKEDIN_URL_REGEX,
  isValidYear,
  isValidCgpa,
  isValidUrl,
} = require("../utils/validators");

const { ownCertificateUrlRegex } = require("./certificateUpload");

const LINKEDIN_POST_URN_REGEX = /^urn:li:(activity|share|ugcPost):\d{6,25}$/;

const ALLOWED_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

/**
 * Validates the PUT /api/profile payload end-to-end. Runs BEFORE the
 * controller touches the database, so a bad request never partially
 * writes to the student document. Every field is optional at the top
 * level (a partial update is fine) but whatever IS sent must be valid.
 *
 * Collects every error found instead of stopping at the first one, so
 * the frontend can show all problems at once.
 */
const validateProfileUpdate = (req, res, next) => {
  const b = req.body;
  const errors = [];

  const fail = (field, message) => errors.push({ field, message });

  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (name.length < 2 || name.length > 80 || !NAME_REGEX.test(name)) {
      fail("name", "Please enter a valid full name.");
    }
  }

  if (b.college !== undefined && !String(b.college).trim()) {
    fail("college", "College name cannot be empty.");
  }

  if (b.branch !== undefined && !String(b.branch).trim()) {
    fail("branch", "Branch cannot be empty.");
  }

  if (b.year !== undefined && !ALLOWED_YEARS.includes(b.year)) {
    fail("year", "Please select a valid academic year.");
  }

  if (b.rollNo !== undefined && !ROLL_NO_REGEX.test(String(b.rollNo).trim())) {
    fail("rollNo", "Roll number should be 3-20 characters, letters/numbers/hyphens only.");
  }

  if (b.bio !== undefined && String(b.bio).length > 300) {
    fail("bio", "Bio must be 300 characters or fewer.");
  }

  if (b.githubUsername && !GITHUB_USERNAME_REGEX.test(b.githubUsername.trim())) {
    fail("githubUsername", "Please enter a valid GitHub username.");
  }

  if (b.leetcodeUsername && !GENERIC_USERNAME_REGEX.test(b.leetcodeUsername.trim())) {
    fail("leetcodeUsername", "Please enter a valid LeetCode username.");
  }

  if (b.hackerrankUsername && !GENERIC_USERNAME_REGEX.test(b.hackerrankUsername.trim())) {
    fail("hackerrankUsername", "Please enter a valid HackerRank username.");
  }

  if (b.linkedinProfile && !LINKEDIN_URL_REGEX.test(b.linkedinProfile.trim())) {
    fail("linkedinProfile", "Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/yourname).");
  }

  // Only post URNs are stored; the client never supplies an embed URL.
  if (b.linkedinPosts !== undefined) {
    const urns = Array.isArray(b.linkedinPosts) ? b.linkedinPosts.map((u) => String(u).trim()) : null;
    if (!urns || urns.length > 12 || urns.some((u) => !LINKEDIN_POST_URN_REGEX.test(u))) {
      fail("linkedinPosts", "Add up to 12 valid LinkedIn post links.");
    } else {
      b.linkedinPosts = [...new Set(urns)];
    }
  }

  // Skills: dedupe + trim happens here so bad client data never reaches the DB.
  if (b.skills !== undefined) {
    const categories = ["programmingLanguages", "webTechnologies", "databases", "tools"];
    categories.forEach((cat) => {
      const list = b.skills[cat];
      if (list === undefined) return;
      if (!Array.isArray(list)) {
        fail(`skills.${cat}`, "Skills must be a list.");
        return;
      }
      if (list.some((s) => typeof s !== "string" || !s.trim())) {
        fail(`skills.${cat}`, "Skills cannot be empty.");
        return;
      }
      if (list.some((s) => s.trim().length > 40)) {
        fail(`skills.${cat}`, "Each skill must be 40 characters or fewer.");
      }
      // De-duplicate case-insensitively, trimmed, in place.
      const seen = new Set();
      b.skills[cat] = list
        .map((s) => s.trim())
        .filter((s) => {
          const key = s.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    });
  }

  // Career interests: free-text tags, same validation shape as a skills category.
  if (b.careerInterests !== undefined) {
    if (!Array.isArray(b.careerInterests)) {
      fail("careerInterests", "Career interests must be a list.");
    } else if (b.careerInterests.some((s) => typeof s !== "string" || !s.trim())) {
      fail("careerInterests", "Career interests cannot be empty.");
    } else if (b.careerInterests.some((s) => s.trim().length > 40)) {
      fail("careerInterests", "Each interest must be 40 characters or fewer.");
    } else if (b.careerInterests.length > 10) {
      fail("careerInterests", "Please list at most 10 interests.");
    } else {
      const seen = new Set();
      b.careerInterests = b.careerInterests
        .map((s) => s.trim())
        .filter((s) => {
          const key = s.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    }
  }

  // Education
  if (Array.isArray(b.education)) {
    b.education.forEach((edu, i) => {
      if (!edu.degree || !String(edu.degree).trim()) fail(`education[${i}].degree`, "Degree is required.");
      if (!edu.institution || !String(edu.institution).trim()) fail(`education[${i}].institution`, "Institution is required.");
      if (edu.startYear !== undefined && edu.startYear !== "" && !isValidYear(edu.startYear)) {
        fail(`education[${i}].startYear`, "Please enter a valid start year.");
      }
      if (edu.endYear !== undefined && edu.endYear !== "" && !isValidYear(edu.endYear)) {
        fail(`education[${i}].endYear`, "Please enter a valid end year.");
      }
      if (edu.startYear && edu.endYear && Number(edu.endYear) < Number(edu.startYear)) {
        fail(`education[${i}].endYear`, "End year cannot be before start year.");
      }
      if (edu.cgpa !== undefined && edu.cgpa !== "" && !isValidCgpa(edu.cgpa)) {
        fail(`education[${i}].cgpa`, "CGPA must be a number between 0 and 10.");
      }
    });
  }

  // Projects
  if (Array.isArray(b.projects)) {
    b.projects.forEach((p, i) => {
      if (!p.title || !String(p.title).trim()) fail(`projects[${i}].title`, "Project title is required.");
      if (p.description && String(p.description).length > 600) {
        fail(`projects[${i}].description`, "Project description must be 600 characters or fewer.");
      }
      if (p.githubRepo && !isValidUrl(p.githubRepo)) {
        fail(`projects[${i}].githubRepo`, "Please enter a valid repository URL.");
      }
      if (p.liveDemo && !isValidUrl(p.liveDemo)) {
        fail(`projects[${i}].liveDemo`, "Please enter a valid live demo URL.");
      }
    });
  }

  // Internships — endDate omitted/null is treated as "ongoing".
  if (Array.isArray(b.internships)) {
    b.internships.forEach((it, i) => {
      if (!it.company || !String(it.company).trim()) fail(`internships[${i}].company`, "Company name is required.");
      if (it.startDate && it.endDate && new Date(it.endDate) < new Date(it.startDate)) {
        fail(`internships[${i}].endDate`, "End date cannot be before the start date.");
      }
    });
  }

  // Certifications
  if (Array.isArray(b.certifications)) {
    b.certifications.forEach((c, i) => {
      if (!c.title || !String(c.title).trim()) fail(`certifications[${i}].title`, "Certificate name is required.");
      if (c.credentialUrl && !isValidUrl(c.credentialUrl)) {
        fail(`certifications[${i}].credentialUrl`, "Please enter a valid credential URL.");
      }
      if (c.issueDate && Number.isNaN(new Date(c.issueDate).getTime())) {
        fail(`certifications[${i}].issueDate`, "Please enter a valid issue date.");
      }
      // A student may only attach files they uploaded themselves.
      if (c.certificateFile) {
        const url = c.certificateFile.url;
        if (typeof url !== "string" || !ownCertificateUrlRegex(req.student._id).test(url)) {
          fail(`certifications[${i}].certificateFile`, "Invalid certificate file. Please upload it again.");
        }
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0].message,
      errors,
    });
  }

  next();
};

module.exports = { validateProfileUpdate };
