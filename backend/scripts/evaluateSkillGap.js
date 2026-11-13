// Measures skill-gap detection against constructed ground truth (not expert judgement): each synthetic
// student holds a known subset of a role's required skills, so which skills are truly missing is known.
// Positive class = "skill is missing". Writes ml/skillGapEvaluation.json. Run: node scripts/evaluateSkillGap.js
const fs = require("fs");
const path = require("path");
const { analyzeSkillGap } = require("../services/skillGapService");
const { CAREER_ROLES } = require("../config/careerRoles");

const TRIALS_PER_ROLE = 200;
let seed = 42;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const sample = (list, n) => [...list].sort(() => rnd() - 0.5).slice(0, n);

const norm = (s) => String(s).toLowerCase().trim();
const realSkills = {};
for (const s of require("./students.json")) {
  for (const v of Object.values(s.skills || {}).flat()) realSkills[v] = (realSkills[v] || 0) + 1;
}
const realVocabulary = Object.entries(realSkills).sort((a, b) => b[1] - a[1]).slice(0, 200).map(([k]) => k);
const allRequired = [...new Set(Object.values(CAREER_ROLES).flat())];

const run = (name, extras) => {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  const confusions = {};
  for (const [role, required] of Object.entries(CAREER_ROLES)) {
    for (let t = 0; t < TRIALS_PER_ROLE; t++) {
      const held = sample(required, Math.floor(rnd() * (required.length + 1)));
      const pool = extras(required);
      const other = sample(pool, Math.min(pool.length, 5));
      const skills = [...held, ...other];
      const gap = analyzeSkillGap({ skills: { programmingLanguages: skills, webTechnologies: [], databases: [], tools: [] }, projects: [] }, role);
      for (const req of required) {
        const truthMissing = !held.includes(req);
        const predMissing = gap.missingSkills.includes(req);
        if (truthMissing && predMissing) tp++;
        else if (!truthMissing && predMissing) fp++;
        else if (truthMissing && !predMissing) {
          fn++;
          const cause = skills.find((s) => norm(req).includes(norm(s)) || norm(s).includes(norm(req)));
          const key = `"${cause}" counted towards "${req}"`;
          confusions[key] = (confusions[key] || 0) + 1;
        } else tn++;
      }
    }
  }
  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  return {
    name, decisions: tp + fp + fn + tn, tp, fp, fn, tn,
    precision: +precision.toFixed(4), recall: +recall.toFixed(4), f1: +((2 * precision * recall) / (precision + recall)).toFixed(4),
    topMissedGaps: Object.entries(confusions).sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
};

const report = {
  groundTruth: "constructed; not validated by experts or students",
  roles: Object.keys(CAREER_ROLES).length,
  trialsPerRole: TRIALS_PER_ROLE,
  scenarios: [
    run("Only the role's own skills", () => []),
    run("Plus skills required by other roles", (req) => allRequired.filter((s) => !req.includes(s))),
    run("Plus common skills from imported student records", (req) => realVocabulary.filter((s) => !req.map(norm).includes(norm(s)))),
  ],
};
fs.writeFileSync(path.join(__dirname, "..", "ml", "skillGapEvaluation.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));
