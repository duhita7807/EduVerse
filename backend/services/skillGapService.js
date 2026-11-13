const { CAREER_ROLES, SUPPORTED_ROLES, getRolesForBranch } = require("../config/careerRoles");

/** Normalizes a skill string for loose, case-insensitive matching. */
const normalize = (s) => (s || "").toLowerCase().trim();

/**
 * Collects every skill signal we have about the student into one flat,
 * de-duplicated, normalized list: manually entered skills, technologies
 * listed on their projects (previously missing here — a student who only
 * listed "AutoCAD" as a project technology, not under skills.tools, was
 * getting no credit for it at all), and languages detected from their
 * synced GitHub repositories.
 */
const collectStudentSkills = (student) => {
  const s = student.skills || {};
  const manual = [
    ...(s.programmingLanguages || []),
    ...(s.webTechnologies || []),
    ...(s.databases || []),
    ...(s.tools || []),
  ];
  const projectTech = (student.projects || []).flatMap((p) => p.technologies || []);
  const githubLanguages = (student.githubData?.repositories || []).map((r) => r.language).filter((l) => l && l !== "N/A");

  return [...new Set([...manual, ...projectTech, ...githubLanguages].map(normalize))];
};

/** The student's self-declared career interests (free-text tags), normalized. */
const collectStudentInterests = (student) => (student.careerInterests || []).map(normalize);

/**
 * A required skill counts as "partial" if the student doesn't have an
 * exact match but has something that contains/relates to it (e.g. student
 * has "Express" and role requires "Express.js", or "REST API" vs "API Design").
 */
const isRelated = (requiredSkill, studentSkill) => {
  const req = normalize(requiredSkill);
  const stu = normalize(studentSkill);
  if (req === stu) return "strong";
  if (req.includes(stu) || stu.includes(req)) return "partial";
  return null;
};

/**
 * Compares the student's collected skills against a target role's
 * required skill set and classifies each required skill as
 * strong / partial / missing.
 *
 * @param {object} student
 * @param {string} targetRole - must be a key in config/careerRoles.js
 * @returns {{targetRole, strongSkills, partialSkills, missingSkills, gapPercentage, coveragePercentage}}
 */
const analyzeSkillGap = (student, targetRole) => {
  const requiredSkills = CAREER_ROLES[targetRole];
  if (!requiredSkills) {
    const error = new Error(
      `Unsupported target role "${targetRole}". Supported roles: ${SUPPORTED_ROLES.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  const studentSkills = collectStudentSkills(student);

  const strongSkills = [];
  const partialSkills = [];
  const missingSkills = [];

  requiredSkills.forEach((required) => {
    let bestMatch = null;
    for (const studentSkill of studentSkills) {
      const relation = isRelated(required, studentSkill);
      if (relation === "strong") {
        bestMatch = "strong";
        break;
      }
      if (relation === "partial") {
        bestMatch = "partial";
      }
    }

    if (bestMatch === "strong") strongSkills.push(required);
    else if (bestMatch === "partial") partialSkills.push(required);
    else missingSkills.push(required);
  });

  const coveragePercentage = Math.round(((strongSkills.length + partialSkills.length * 0.5) / requiredSkills.length) * 100);
  const gapPercentage = 100 - coveragePercentage;

  return {
    targetRole,
    requiredSkillCount: requiredSkills.length,
    strongSkills,
    partialSkills,
    missingSkills,
    coveragePercentage,
    gapPercentage,
  };
};

/**
 * An interest "hits" a role if a stated interest is a substring of the role
 * name or vice versa (e.g. interest "web development" matches "Full Stack
 * Developer" via "web"/"developer" overlap is NOT assumed — this is a
 * narrower, more literal substring check so it only fires on a genuine,
 * explainable match rather than guessing at semantic similarity).
 */
const interestMatchesRole = (interest, role) => {
  const r = normalize(role);
  return r.includes(interest) || interest.includes(r);
};

/**
 * Runs analyzeSkillGap against a set of roles and returns a best-match-first
 * list. Defaults to the roles relevant to the student's own branch (see
 * config/careerRoles.js) rather than every supported role across every
 * branch — a Mechanical student no longer sees "Full Stack Developer: 11%
 * match" cluttering their results. Pass an explicit `roles` array to
 * override this (e.g. to show every role regardless of branch).
 *
 * A student's stated career interests give a small, transparent ranking
 * bonus (+8 coverage points, capped at 100) to any role their interests
 * literally name — this is a visible nudge on an otherwise skill-based
 * score, not a hidden reweighting of the score itself.
 */
const matchAllRoles = (student, roles = null) => {
  const roleList = roles || getRolesForBranch(student.branch);
  const interests = collectStudentInterests(student);

  return roleList
    .map((role) => {
      const result = analyzeSkillGap(student, role);
      const interestBoost = interests.some((i) => interestMatchesRole(i, role)) ? 8 : 0;
      return {
        ...result,
        interestBoost,
        coveragePercentage: Math.min(100, result.coveragePercentage + interestBoost),
      };
    })
    .sort((a, b) => b.coveragePercentage - a.coveragePercentage);
};

/**
 * Turns a skill-gap result into a "why this role, what's next" career
 * insight card. Wording is deliberately hedged ("Based on your current
 * profile...") per the spec — this is a suggestion, not a guarantee.
 */
const buildCareerInsight = (gapResult) => {
  const { targetRole, coveragePercentage, strongSkills, missingSkills, interestBoost } = gapResult;

  const topMissing = missingSkills.slice(0, 3);
  let reason =
    strongSkills.length > 0
      ? `Based on your current profile, your existing strength in ${strongSkills.slice(0, 3).join(", ")} aligns well with this role.`
      : `Based on your current profile, this is a potentially suitable career path worth exploring.`;
  if (interestBoost) {
    reason += ` This also matches an interest you've listed on your profile.`;
  }

  const nextSteps =
    topMissing.length > 0
      ? `Focus next on: ${topMissing.join(", ")}.`
      : "Your skill set already covers this role's core requirements — focus on deepening project experience.";

  return {
    career: targetRole,
    matchScore: coveragePercentage,
    relevantSkills: strongSkills,
    missingSkills,
    reason,
    nextSteps,
  };
};

/**
 * Career Insights (spec section 7) — ranks every supported role by fit
 * and returns the top N as structured cards for the dashboard.
 */
const getCareerInsights = (student, limit = 5, roles = null) => {
  return matchAllRoles(student, roles)
    .slice(0, limit)
    .map(buildCareerInsight);
};

module.exports = {
  analyzeSkillGap,
  matchAllRoles,
  collectStudentSkills,
  collectStudentInterests,
  getCareerInsights,
  SUPPORTED_ROLES,
};
