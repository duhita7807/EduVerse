/**
 * Weights for each profile section, summing to 100.
 * Matches the spec:
 * Personal Info 10, Education 15, Skills 20, Projects 20,
 * Internships 10, Certifications 10, Coding Profiles 15
 */
const WEIGHTS = {
  personalInfo: 10,
  education: 15,
  skills: 20,
  projects: 20,
  internships: 10,
  certifications: 10,
  codingProfiles: 15,
};

const hasContent = (arr) => Array.isArray(arr) && arr.length > 0;

/**
 * Calculates a 0-100 profile completion score based on which sections
 * the student has filled in.
 */
const calculateProfileCompletion = (student) => {
  let score = 0;

  // Personal Information — name, college, branch, year, rollNo, photo, bio
  const personalFields = [student.name, student.college, student.branch, student.year, student.rollNo];
  const personalFilled = personalFields.filter(Boolean).length;
  const personalBonus = [student.profilePhoto, student.bio].filter(Boolean).length;
  score += WEIGHTS.personalInfo * Math.min(1, (personalFilled + personalBonus * 0.5) / personalFields.length);

  // Education
  if (hasContent(student.education)) score += WEIGHTS.education;

  // Skills — check across all 4 categories
  const skillCategories = ["programmingLanguages", "webTechnologies", "databases", "tools"];
  const filledSkillCategories = skillCategories.filter((cat) => hasContent(student.skills?.[cat])).length;
  score += WEIGHTS.skills * (filledSkillCategories / skillCategories.length);

  // Projects
  if (hasContent(student.projects)) {
    score += WEIGHTS.projects * Math.min(1, student.projects.length / 2); // full credit at 2+ projects
  }

  // Internships
  if (hasContent(student.internships)) score += WEIGHTS.internships;

  // Certifications
  if (hasContent(student.certifications)) score += WEIGHTS.certifications;

  // Online profiles — GitHub and LinkedIn
  const codingProfiles = [student.githubUsername, student.linkedinProfile];
  const filledCodingProfiles = codingProfiles.filter(Boolean).length;
  score += WEIGHTS.codingProfiles * (filledCodingProfiles / codingProfiles.length);

  return Math.round(Math.min(100, score));
};

module.exports = { calculateProfileCompletion, WEIGHTS };
