// Self-check: the Career Assistant answers from profile data when Gemini is unavailable.
// No database needed. Run: node scripts/selfcheckOfflineAssistant.js
const assert = require("assert");
const { offlineReply } = require("../services/offlineAssistantService");

const student = (branch, skills) => ({
  branch, year: "4th Year", careerInterests: [],
  skills: { programmingLanguages: skills, webTechnologies: [], databases: [], tools: [] },
  projects: [{ title: "P1", technologies: skills.slice(0, 2) }], internships: [], certifications: [],
  education: [{ cgpa: 8 }], githubUsername: "x", linkedinProfile: "",
});
const ask = (s, text, mode = "chat", history = []) => offlineReply({ student: s, latestAnalytics: null, history: [...history, { role: "user", content: text }], mode });

for (const [branch, skills] of [["Computer Science & Engineering", ["Python", "JavaScript", "React"]], ["Mechanical Engineering", ["AutoCAD"]], ["Civil Engineering", []], ["Chemical Engineering", ["MATLAB"]], ["", []]]) {
  const s = student(branch, skills);
  const cases = {
    gaps: [ask(s, "What are my biggest skill gaps?"), /covers about \*\*\d+%\*\*/],
    career: [ask(s, "What career is suitable for my skills?"), /match/],
    readiness: [ask(s, "How can I improve my placement readiness?"), /readiness is \*\*\d+\/100/],
    projects: [ask(s, "Suggest projects for my target role."), /Project ideas for/],
    learn: [ask(s, "What skills should I learn next?"), /learn|cover the core skills/i],
    interview: [ask(s, "Help me prepare for a technical interview."), /STAR/],
    hello: [ask(s, "hello"), /readiness is/],
  };
  for (const [name, [r, re]] of Object.entries(cases)) {
    assert.ok(re.test(r.message), `${branch || "(blank)"} ${name}: ${r.message.slice(0, 120)}`);
    assert.ok(!/undefined|NaN|\[object/.test(r.message), `${branch} ${name}: broken value`);
  }
  const road = ask(s, "Make my roadmap", "roadmap");
  assert.strictEqual(road.roadmapSteps.length, 7, "roadmap has 7 stages");
  const q1 = ask(s, "Start a technical interview", "interview");
  assert.match(q1.message, /^\*\*Question 1/, "interview asks first question");
  const q2 = ask(s, "It separates based on boiling point and vapour", "interview", [{ role: "user", content: "start" }, { role: "assistant", content: q1.message }]);
  assert.match(q2.message, /key points[\s\S]*Question 2/, "interview gives feedback then next question");
}
console.log("OFFLINE ASSISTANT CHECKS PASSED");
