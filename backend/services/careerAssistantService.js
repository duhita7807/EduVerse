const geminiClient = require("./geminiClient");
const { getBranchGroupLabel } = require("../config/careerRoles");
const { offlineReply } = require("./offlineAssistantService");

const MAX_HISTORY_MESSAGES = 12; // keep prompts small; older turns are dropped, not deleted from storage

/**
 * Builds the MINIMUM student context sent to Cloud AI — mirrors the same
 * privacy boundary as aiAnalyticsService.js (Module 3): no password, no
 * JWT, no email, no roll number. Pulls in the latest cached Module 3
 * analytics (if any) so the assistant's advice is grounded in the
 * student's actual readiness score and skill gaps instead of guessing.
 */
const buildSafeContext = (student, latestAnalytics) => {
  const context = {
    branch: student.branch,
    branchField: getBranchGroupLabel(student.branch),
    year: student.year,
    skills: student.skills,
    careerInterests: student.careerInterests || [],
    education: (student.education || []).map((e) => ({ degree: e.degree, branch: e.branch, cgpa: e.cgpa })),
    projects: (student.projects || []).map((p) => ({ title: p.title, technologies: p.technologies })),
    internshipCount: (student.internships || []).length,
    certifications: (student.certifications || []).map((c) => c.title),
    githubStats: student.githubData?.username
      ? {
          publicRepos: student.githubData.publicRepos,
          topLanguages: [...new Set((student.githubData.repositories || []).map((r) => r.language))].filter(
            (l) => l && l !== "N/A"
          ),
        }
      : null,
    onlineProfiles: {
      hasGithub: Boolean(student.githubUsername),
      hasLinkedin: Boolean(student.linkedinProfile),
    },
  };

  if (latestAnalytics) {
    context.placementReadiness = {
      overallScore: latestAnalytics.readinessScore,
      category: latestAnalytics.readinessCategory,
      componentScores: latestAnalytics.componentScores,
    };
    if (latestAnalytics.targetRole) {
      context.targetRole = latestAnalytics.targetRole;
      context.skillGaps = latestAnalytics.skillGaps;
    }
  }

  return context;
};

const MODE_INSTRUCTIONS = {
  chat: `You are answering a free-form career/skills/placement question. Be concise and specific to this student's profile.`,
  interview: `You are running a mock interview. Ask ONE interview question at a time (technical or HR, based on what the
student asked for), wait for their answer in the next turn, then give brief feedback on their most recent answer
(what was good, what was missing, how to structure it better) before asking the next question. Never present your
feedback as a guarantee of interview success.`,
  roadmap: `The student wants a career roadmap. Produce a short ordered sequence of stages
(Current Skills -> Skill Gaps -> Learning -> Practice -> Projects -> Interview Prep -> Placement Prep), each with a
one-line description tailored to their actual profile and target role. Populate the roadmapSteps array with one
object per stage: { "step": <1-based number>, "title": <stage name>, "description": <1 sentence, tailored> }.`,
  "learning-plan": `The student wants a learning plan for a specific skill or topic. Adapt the depth to what their
profile suggests about their current level. Keep it practical and structured (what to learn, why, how to practice).`,
};

const SYSTEM_PROMPT_BASE = `You are the EduVerse AI Career Assistant — a helpful, encouraging guide for engineering
students across ALL branches (Computer Science, Mechanical, Civil, Electrical, Electronics & Telecommunication,
Chemical, and others) on career direction, skill development, interview preparation, and placement readiness.

Ground every answer in the student profile data you are given — branch, skills, projects, academic record,
career interests, GitHub stats, placement readiness score, skill gaps — rather than generic advice when the
data is relevant to the question. Tailor suggestions to the student's ACTUAL branch rather than defaulting to
software/web-development advice for a non-CS student. If the profile data doesn't cover something the student
asks about, say so plainly instead of inventing details.

Hard rules:
- NEVER guarantee a placement outcome, a job offer, or a specific hiring probability.
- NEVER invent specific job openings, companies hiring, or statistics you were not given.
- NEVER claim to access real-time data, live job boards, or systems you don't have access to.
- If information is uncertain or you're inferring rather than reading it from the given data, say so.
- Keep responses focused — use short paragraphs or a few bullet points, not walls of text.

Respond ONLY with a valid JSON object (no markdown fences, no preamble) with exactly these keys:
{
  "message": "your reply to the student, in second person, markdown-lite (short paragraphs / bullets ok)",
  "suggestedActions": ["array of 0-5 short, concrete next-step suggestions"],
  "roadmapSteps": []
}
Leave "roadmapSteps" as an empty array unless the mode is "roadmap".`;

/** Validates + coerces the AI's parsed response into a guaranteed-safe shape. */
const sanitizeResponse = (parsed) => {
  const message = typeof parsed.message === "string" && parsed.message.trim() ? parsed.message.trim().slice(0, 4000) : "";
  const suggestedActions = Array.isArray(parsed.suggestedActions)
    ? parsed.suggestedActions.filter((a) => typeof a === "string").slice(0, 5)
    : [];
  const roadmapSteps = Array.isArray(parsed.roadmapSteps)
    ? parsed.roadmapSteps
        .filter((s) => s && typeof s.title === "string" && typeof s.description === "string")
        .map((s, i) => ({ step: Number.isInteger(s.step) ? s.step : i + 1, title: s.title.slice(0, 80), description: s.description.slice(0, 240) }))
        .slice(0, 10)
    : [];

  return { message, suggestedActions, roadmapSteps };
};

/**
 * Sends the conversation (trimmed to the last MAX_HISTORY_MESSAGES turns)
 * plus safe student context to Cloud AI and returns a validated response.
 * Falls back to a safe static message on any failure — the chat endpoint
 * must never 500 just because the AI call failed (spec: graceful AI
 * failure handling, same principle as Module 3).
 */
const getAssistantReply = async ({ student, latestAnalytics, history, mode = "chat" }) => {
  // No key, invalid key, quota or network failure: answer from the student's own data instead of an error.
  const offline = () => offlineReply({ student, latestAnalytics, history, mode });
  if (!geminiClient.isConfigured()) return offline();

  const context = buildSafeContext(student, latestAnalytics);

  // Gemini's Content[] format uses role "user" | "model" (not "assistant"),
  // with each turn's text wrapped in a `parts` array.
  const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\nCurrent mode: ${mode}. ${MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.chat}\n\nStudent profile context:\n${JSON.stringify(context, null, 2)}`;

  try {
    const parsed = await geminiClient.generateJson({
      systemPrompt,
      contents: trimmedHistory.length ? trimmedHistory : [{ role: "user", parts: [{ text: "Hello" }] }],
      maxOutputTokens: 1200,
    });
    const sanitized = sanitizeResponse(parsed);

    return sanitized.message ? sanitized : offline();
  } catch (err) {
    if (err.code === "GEMINI_INVALID_KEY") console.warn("Gemini rejected GEMINI_API_KEY — using offline assistant. Run: node scripts/checkGeminiKey.js");
    return offline();
  }
};

module.exports = { getAssistantReply, buildSafeContext, sanitizeResponse };
