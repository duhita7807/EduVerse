const geminiClient = require("./geminiClient");
const { buildSafeContext } = require("./careerAssistantService");
const { CODING, TECHNICAL, HR_KEYPOINTS, branchGroup } = require("../config/questionBank");

/**
 * Practice assessments: question generation, answer evaluation, scoring and
 * improvement plans. Gemini does the generation and review when it works;
 * otherwise every round falls back to the built-in bank (config/questionBank.js)
 * and open-ended answers are scored by a transparent key-point check.
 */

const QUESTION_COUNT = { aptitude: 10, coding: 2, technical: 5, hr: 5 };

const LEVEL_GUIDE = {
  beginner: "fundamentals and definitions; straightforward, single-step questions",
  intermediate: "applied understanding; multi-step reasoning and common real-world scenarios",
  advanced: "depth, trade-offs, edge cases and optimisation, as asked in final placement rounds",
};

const TYPE_GUIDE = {
  aptitude:
    "quantitative aptitude, logical reasoning and verbal ability as used in campus placement tests. Each question is multiple choice with exactly 4 options and one correct option.",
  coding:
    "coding problems as in an online assessment. Each prompt states the task, input/output format and one example. The student answers with code in any language plus a short explanation.",
  technical:
    "a technical interview for the student's own branch (use their branch, skills and projects; do not default to software questions for non-CS branches).",
  hr: "an HR / behavioural interview: motivation, teamwork, conflict, strengths and weaknesses, career goals. Expect STAR-structured answers.",
};

/* ---------------- Built-in bank (used when AI is unavailable) ---------------- */

const APTITUDE_BANK = {
  beginner: [
    { topic: "Percentages", prompt: "What is 20% of 250?", options: ["25", "50", "75", "100"], correctIndex: 1, explanation: "20% of 250 = 0.2 × 250 = 50." },
    { topic: "Averages", prompt: "The average of 4, 8, 12 and 16 is:", options: ["8", "9", "10", "12"], correctIndex: 2, explanation: "(4 + 8 + 12 + 16) / 4 = 40 / 4 = 10." },
    { topic: "Number series", prompt: "Find the next number: 2, 6, 12, 20, 30, ?", options: ["40", "42", "44", "48"], correctIndex: 1, explanation: "Differences are 4, 6, 8, 10, so the next difference is 12: 30 + 12 = 42." },
    { topic: "Speed & distance", prompt: "A car travels 180 km in 3 hours. Its average speed is:", options: ["50 km/h", "55 km/h", "60 km/h", "65 km/h"], correctIndex: 2, explanation: "Speed = distance / time = 180 / 3 = 60 km/h." },
    { topic: "Verbal", prompt: "Choose the word closest in meaning to 'Rapid':", options: ["Slow", "Quick", "Calm", "Late"], correctIndex: 1, explanation: "'Rapid' means fast or quick." },
  ],
  intermediate: [
    { topic: "Profit & loss", prompt: "An item bought for ₹800 is sold for ₹920. The profit percentage is:", options: ["12%", "15%", "18%", "20%"], correctIndex: 1, explanation: "Profit = 120; 120 / 800 × 100 = 15%." },
    { topic: "Time & work", prompt: "A can finish a job in 12 days and B in 6 days. Working together, they finish it in:", options: ["3 days", "4 days", "6 days", "9 days"], correctIndex: 1, explanation: "Combined rate = 1/12 + 1/6 = 3/12 = 1/4 per day, so 4 days." },
    { topic: "Ratios", prompt: "₹1,200 is divided between A and B in the ratio 3 : 5. B's share is:", options: ["₹450", "₹600", "₹720", "₹750"], correctIndex: 3, explanation: "B gets 5/8 of 1,200 = ₹750." },
    { topic: "Logical reasoning", prompt: "All engineers are graduates. Some graduates are artists. Which conclusion must be true?", options: ["All artists are engineers", "Some engineers are artists", "All engineers are graduates", "No graduate is an artist"], correctIndex: 2, explanation: "Only the given premise 'All engineers are graduates' is certain; the others do not follow." },
    { topic: "Simple interest", prompt: "Simple interest on ₹5,000 at 8% per annum for 3 years is:", options: ["₹1,000", "₹1,200", "₹1,400", "₹1,500"], correctIndex: 1, explanation: "SI = P × R × T / 100 = 5000 × 8 × 3 / 100 = ₹1,200." },
  ],
  advanced: [
    { topic: "Probability", prompt: "Two fair dice are rolled. The probability that the sum is 8 is:", options: ["1/9", "5/36", "1/6", "7/36"], correctIndex: 1, explanation: "Favourable pairs: (2,6),(3,5),(4,4),(5,3),(6,2) = 5 of 36." },
    { topic: "Compound interest", prompt: "₹10,000 at 10% per annum compounded annually for 2 years amounts to:", options: ["₹12,000", "₹12,100", "₹12,200", "₹12,321"], correctIndex: 1, explanation: "10,000 × 1.1² = ₹12,100." },
    { topic: "Permutations", prompt: "In how many ways can the letters of the word 'LEVEL' be arranged?", options: ["30", "60", "120", "20"], correctIndex: 0, explanation: "5! / (2! × 2!) = 120 / 4 = 30 (L and E each repeat twice)." },
    { topic: "Trains", prompt: "A 150 m train passes a 250 m platform in 20 s. Its speed is:", options: ["54 km/h", "72 km/h", "60 km/h", "80 km/h"], correctIndex: 1, explanation: "Distance = 400 m in 20 s = 20 m/s = 72 km/h." },
    { topic: "Data sufficiency", prompt: "Is x > 0? (1) x² = 16  (2) x³ = 64. Which statement(s) alone are sufficient?", options: ["Only (1)", "Only (2)", "Both together, not alone", "Each alone"], correctIndex: 1, explanation: "(1) allows x = ±4; (2) gives x = 4 uniquely, so only (2) is sufficient." },
  ],
};

const HR_BANK = [
  { topic: "Introduction", prompt: "Tell me about yourself." },
  { topic: "Motivation", prompt: "Why do you want to join our company, and why this role?" },
  { topic: "Strengths & weaknesses", prompt: "What is your greatest strength, and what is one weakness you are working on?" },
  { topic: "Teamwork", prompt: "Describe a time you worked in a team and faced a disagreement. How did you handle it?" },
  { topic: "Challenge", prompt: "Tell me about the most difficult problem you solved during a project or internship." },
  { topic: "Goals", prompt: "Where do you see yourself in five years?" },
];

const openEnded = ({ topic, prompt, keyPoints, idealAnswer }) => ({ topic, prompt, options: [], keyPoints, explanation: idealAnswer || "" });

const bankQuestions = (type, level, student) => {
  if (type === "aptitude") return APTITUDE_BANK[level].map((q) => ({ ...q }));
  if (type === "hr") return HR_BANK.slice(0, QUESTION_COUNT.hr).map((q) => openEnded({ ...q, keyPoints: HR_KEYPOINTS[q.topic] || [] }));
  if (type === "coding") return CODING[level].map(openEnded);
  return TECHNICAL[branchGroup(student?.branch)][level].map(openEnded); // technical: by branch family
};

/**
 * Offline scoring for open-ended answers: each key point (synonyms split by
 * "|") counts as covered if the answer mentions it. Transparent, not a
 * judgement of quality — the UI says so.
 */
const keywordGrade = (question, answer) => {
  const text = String(answer || "").toLowerCase();
  const points = question.keyPoints || [];
  const label = (p) => p.split("|")[0];
  const covered = points.filter((p) => p.split("|").some((s) => s && text.includes(s.toLowerCase())));
  const missed = points.filter((p) => !covered.includes(p));
  const score = !text.trim() || !points.length ? 0 : Math.round((covered.length / points.length) * 10);
  return { score, covered: covered.map(label), missed: missed.map(label) };
};

/* ---------------- Sanitizers: never trust model output ---------------- */

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strList = (v, n, max) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);

const sanitizeQuestions = (type, raw) => {
  const list = Array.isArray(raw?.questions) ? raw.questions : [];
  const questions = list
    .map((q) => {
      const base = { topic: str(q?.topic, 80), prompt: str(q?.prompt, 2000), options: [], explanation: "" };
      if (!base.prompt) return null;
      if (type !== "aptitude") return base;
      const options = strList(q.options, 4, 300);
      const idx = Number(q.correctIndex);
      if (options.length !== 4 || !Number.isInteger(idx) || idx < 0 || idx > 3) return null;
      return { ...base, options, correctIndex: idx, explanation: str(q.explanation, 1000) };
    })
    .filter(Boolean)
    .slice(0, QUESTION_COUNT[type]);
  return questions.length === QUESTION_COUNT[type] ? questions : null;
};

const sanitizePlan = (v) =>
  (Array.isArray(v) ? v : [])
    .map((p) => ({ title: str(p?.title, 120), description: str(p?.description, 500) }))
    .filter((p) => p.title)
    .slice(0, 6);

/* ---------------- Generation ---------------- */

const generateQuestions = async ({ type, level, student, analytics }) => {
  if (geminiClient.isConfigured()) {
    try {
      const raw = await geminiClient.generateJson({
        systemPrompt: `You write placement-preparation questions for an Indian engineering student.
Assessment: ${TYPE_GUIDE[type]}
Level: ${level} — ${LEVEL_GUIDE[level]}.
Write exactly ${QUESTION_COUNT[type]} distinct questions covering different topics.
Student profile (tailor to it where relevant): ${JSON.stringify(buildSafeContext(student, analytics))}
Respond ONLY with JSON: {"questions":[{"topic":"short topic","prompt":"the question"${
          type === "aptitude" ? ',"options":["A","B","C","D"],"correctIndex":0,"explanation":"why the answer is correct"' : ""
        }}]}`,
        contents: `Generate the ${level} ${type} assessment.`,
        maxOutputTokens: type === "aptitude" ? 3000 : 2000,
        temperature: 0.8,
        timeoutMs: 40000,
      });
      const questions = sanitizeQuestions(type, raw);
      if (questions) return { questions, source: "ai" };
    } catch {
      // fall through to the bank
    }
  }
  return { questions: bankQuestions(type, level, student), source: "bank" };
};

/* ---------------- Evaluation ---------------- */

/** Aptitude is graded locally; AI (if available) only writes the plan. */
const gradeAptitude = (questions, answers) => {
  const results = questions.map((q, i) => {
    const correct = Number(answers[i]) === q.correctIndex && answers[i] !== "";
    return { score: correct ? 10 : 0, feedback: correct ? "Correct." : `Correct answer: ${q.options[q.correctIndex]}`, idealAnswer: q.explanation };
  });
  const right = results.filter((r) => r.score === 10).length;
  const missedTopics = [...new Set(questions.filter((_, i) => results[i].score === 0).map((q) => q.topic).filter(Boolean))];
  return { results, score: Math.round((right / questions.length) * 100), right, missedTopics };
};

const fallbackAptitudePlan = (missedTopics) =>
  missedTopics.length
    ? missedTopics.slice(0, 5).map((t) => ({ title: `Revise ${t}`, description: `Review the formula/method for ${t} and solve 15–20 timed practice questions on it.` }))
    : [{ title: "Move up a level", description: "You answered everything correctly. Try the next difficulty level and practise under time pressure." }];

const evaluate = async ({ type, level, questions, answers, student, analytics }) => {
  const context = JSON.stringify(buildSafeContext(student, analytics));

  if (type === "aptitude" || type === "series") {
    const graded = gradeAptitude(questions, answers);
    const out = {
      score: graded.score,
      aiReviewed: false,
      results: graded.results,
      summary: `You answered ${graded.right} of ${questions.length} correctly (${graded.score}%).`,
      strengths: [...new Set(questions.filter((_, i) => graded.results[i].score === 10).map((q) => q.topic).filter(Boolean))].slice(0, 5),
      weaknesses: graded.missedTopics.slice(0, 5),
      improvementPlan: fallbackAptitudePlan(graded.missedTopics),
    };
    if (geminiClient.isConfigured()) {
      try {
        const raw = await geminiClient.generateJson({
          systemPrompt: `A student took a ${level} placement aptitude test and scored ${graded.score}%. Topics missed: ${JSON.stringify(graded.missedTopics)}.
Profile: ${context}
Write a short, encouraging summary and a practical improvement plan (3-5 steps, specific practice, no guarantees of placement).
Respond ONLY with JSON: {"summary":"2-3 sentences","improvementPlan":[{"title":"","description":""}]}`,
          contents: "Write the feedback.",
          maxOutputTokens: 900,
        });
        const plan = sanitizePlan(raw?.improvementPlan);
        if (plan.length) out.improvementPlan = plan;
        if (str(raw?.summary, 2000)) out.summary = `${out.summary} ${str(raw.summary, 1800)}`;
        out.aiReviewed = true;
      } catch {
        // keep the locally generated plan
      }
    }
    return out;
  }

  // Open-ended rounds: AI review only. No invented scores without it.
  if (geminiClient.isConfigured()) {
    try {
      const raw = await geminiClient.generateJson({
        systemPrompt: `You are a fair, encouraging placement interviewer reviewing a ${level} ${type} round (${TYPE_GUIDE[type]}).
Score each answer 0-10 against what a ${level}-level candidate should say. Empty or off-topic answers score 0.
For coding answers judge correctness, approach, complexity and code clarity.
Give specific feedback (what was good, what was missing) and a concise model answer for each question.
Then give an overall score 0-100, 2-4 strengths, 2-4 weaknesses and a personalised improvement plan (3-5 steps) based on the student's profile.
Never guarantee placement outcomes.
Student profile: ${context}
Respond ONLY with JSON: {"overallScore":0,"summary":"2-3 sentences","results":[{"score":0,"feedback":"","idealAnswer":""}],"strengths":[],"weaknesses":[],"improvementPlan":[{"title":"","description":""}]}
The results array must have exactly ${questions.length} entries, in question order.`,
        contents: JSON.stringify(questions.map((q, i) => ({ question: q.prompt, answer: answers[i] || "(no answer)" }))),
        maxOutputTokens: 4000,
        timeoutMs: 45000,
      });
      const results = (Array.isArray(raw?.results) ? raw.results : []).slice(0, questions.length).map((r) => ({
        score: Math.max(0, Math.min(10, Math.round(Number(r?.score) || 0))),
        feedback: str(r?.feedback, 1500),
        idealAnswer: str(r?.idealAnswer, 3000),
      }));
      if (results.length === questions.length) {
        const overall = Number(raw?.overallScore);
        return {
          // Prefer the model's holistic score; fall back to the per-question average.
          score: Number.isFinite(overall) ? Math.max(0, Math.min(100, Math.round(overall))) : Math.round((results.reduce((s, r) => s + r.score, 0) / (results.length * 10)) * 100),
          aiReviewed: true,
          results,
          summary: str(raw?.summary, 2000),
          strengths: strList(raw?.strengths, 4, 300),
          weaknesses: strList(raw?.weaknesses, 4, 300),
          improvementPlan: sanitizePlan(raw?.improvementPlan),
        };
      }
    } catch {
      // fall through
    }
  }
  // No AI: score built-in questions by key-point coverage.
  if (questions.every((q) => q.keyPoints?.length)) {
    const graded = questions.map((q, i) => keywordGrade(q, answers[i]));
    const score = Math.round((graded.reduce((s, g) => s + g.score, 0) / (questions.length * 10)) * 100);
    const topic = (i) => questions[i].topic || `Question ${i + 1}`;
    return {
      score,
      aiReviewed: false,
      results: graded.map((g, i) => ({
        score: g.score,
        feedback: [g.covered.length && `Covered: ${g.covered.join(", ")}.`, g.missed.length && `Missing: ${g.missed.join(", ")}.`].filter(Boolean).join(" ") || "No answer given.",
        idealAnswer: questions[i].explanation || "",
      })),
      summary: `Scored ${score}/100 by checking which key points your answers cover (AI review is unavailable, so wording and depth were not judged). Compare each answer with the model answer below.`,
      strengths: graded.map((g, i) => (g.score >= 7 ? topic(i) : null)).filter(Boolean).slice(0, 4),
      weaknesses: graded.map((g, i) => (g.score < 5 ? topic(i) : null)).filter(Boolean).slice(0, 4),
      improvementPlan: graded
        .map((g, i) => (g.missed.length ? { title: `Revise ${topic(i)}`, description: `Make sure you can explain: ${g.missed.join(", ")}. Practise saying the model answer in your own words.` } : null))
        .filter(Boolean)
        .slice(0, 5)
        .concat(type === "hr" ? [{ title: "Use the STAR method", description: "Structure each answer as Situation, Task, Action, Result, and end with what you learned." }] : []),
    };
  }

  return {
    score: null,
    aiReviewed: false,
    results: questions.map(() => ({ score: undefined, feedback: "", idealAnswer: "" })),
    summary: "Your answers are saved, but AI feedback is unavailable right now, so this round has not been scored. It will need a valid GEMINI_API_KEY on the server.",
    strengths: [],
    weaknesses: [],
    improvementPlan:
      type === "hr"
        ? [
            { title: "Use the STAR method", description: "Structure each answer as Situation, Task, Action, Result, and end with what you learned." },
            { title: "Prepare 4–5 stories", description: "Have short examples ready for teamwork, conflict, failure, leadership and a challenging project." },
          ]
        : [],
  };
};

module.exports = { generateQuestions, evaluate, gradeAptitude, keywordGrade, sanitizeQuestions, QUESTION_COUNT, APTITUDE_BANK };
