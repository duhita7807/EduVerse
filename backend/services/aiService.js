const geminiClient = require("./geminiClient");

/**
 * Builds a compact, structured description of the student's profile to send
 * to the AI model as context. Keeping this small controls token usage.
 */
const buildProfileContext = (student) => {
  return {
    name: student.name,
    branch: student.branch,
    year: student.year,
    bio: student.bio,
    skills: student.skills,
    education: student.education,
    projects: (student.projects || []).map((p) => ({
      title: p.title,
      description: p.description,
      technologies: p.technologies,
    })),
    internships: (student.internships || []).map((i) => ({ company: i.company, role: i.role })),
    certifications: (student.certifications || []).map((c) => c.title),
    githubRepoCount: student.githubData?.publicRepos || 0,
    githubTopLanguages: [...new Set((student.githubData?.repositories || []).map((r) => r.language))].filter(
      (l) => l && l !== "N/A"
    ),
  };
};

const SYSTEM_PROMPT = `You are an academic career assistant analyzing a student's placement-readiness profile.
Respond ONLY with a valid JSON object (no markdown fences, no preamble) with exactly these keys:
{
  "summary": "a 2-3 sentence professional summary written in third person",
  "extractedSkills": ["array of concrete technical skills inferred from the data"],
  "suggestedCategories": ["array of skill categories the student should highlight, e.g. Backend Development"],
  "improvementSuggestions": ["array of 3-5 short, actionable, encouraging suggestions to improve the profile"]
}`;

const buildFallback = (student) => ({
  summary: `${student.name} is a ${student.year} ${student.branch} student building a technical profile. Add more projects and skills to unlock a richer AI summary.`,
  extractedSkills: [
    ...(student.skills?.programmingLanguages || []),
    ...(student.skills?.webTechnologies || []),
  ].slice(0, 10),
  suggestedCategories: geminiClient.isConfigured()
    ? ["AI analysis is temporarily unavailable — please try again shortly"]
    : ["Add GEMINI_API_KEY in .env to enable live AI analysis"],
  improvementSuggestions: [
    "Add at least 2-3 projects with clear descriptions and tech stacks",
    "Link your GitHub, LeetCode and HackerRank profiles",
    "Fill in your skills across all categories",
  ],
  generatedAt: new Date(),
});

/**
 * Calls Gemini to analyze a student's profile and produce:
 *  - a short professional summary
 *  - extracted technical skills
 *  - suggested skill categories
 *  - basic profile improvement suggestions
 *
 * This is analysis/summarization only — NOT the placement prediction model
 * (that belongs to Module 3). Falls back to a safe static response if
 * Gemini is unconfigured or the call fails, so Module 2 stays usable.
 */
const analyzeProfile = async (student) => {
  try {
    const context = buildProfileContext(student);
    const parsed = await geminiClient.generateJson({
      systemPrompt: SYSTEM_PROMPT,
      contents: `Student profile data:\n${JSON.stringify(context, null, 2)}`,
      maxOutputTokens: 1000,
    });

    return {
      summary: parsed.summary || "",
      extractedSkills: parsed.extractedSkills || [],
      suggestedCategories: parsed.suggestedCategories || [],
      improvementSuggestions: parsed.improvementSuggestions || [],
      generatedAt: new Date(),
    };
  } catch (err) {
    return buildFallback(student);
  }
};

module.exports = { analyzeProfile };
