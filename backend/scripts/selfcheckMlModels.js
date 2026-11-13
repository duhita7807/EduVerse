// Self-check: Node reproduces the trained models' Python predictions; rule-based results stay unchanged.
// Run: node scripts/selfcheckMlModels.js
const assert = require("assert");
const fs = require("fs");
const { predictMl, randomForestScore, xgboostScore, MODELS_PATH } = require("../services/mlModelService");
const { calculateOverallReadiness } = require("../services/readinessService");
const { predict } = require("../services/predictionService");
const { FEATURE_NAMES, featuresOf } = require("../ml/features");

const m = JSON.parse(fs.readFileSync(MODELS_PATH, "utf8"));
assert.deepStrictEqual(m.features, FEATURE_NAMES, "model was trained on the current feature list");

m.samples.X.forEach((row, i) => {
  assert.ok(Math.abs(randomForestScore(row) - m.samples.randomForest[i]) < 1e-6, `Random Forest sample ${i}`);
  // XGBoost computes in 32-bit floats, Node in 64-bit: allow rounding noise only.
  assert.ok(Math.abs(xgboostScore(row) - m.samples.xgboost[i]) < 1e-3, `XGBoost sample ${i}`);
});
assert.ok(m.randomForest.trees.length === 100 && m.xgboost.trees.length === 200, "both full models exported");

const empty = { name: "x" };
const full = {
  name: "x", college: "c", branch: "CSE", year: "4th Year", rollNo: "1", education: [{ cgpa: 9 }],
  skills: { programmingLanguages: ["a", "b", "c", "d"], webTechnologies: ["e", "f", "g"], databases: ["h", "i"], tools: ["j", "k", "l"] },
  projects: [1, 2, 3, 4].map((n) => ({ title: `p${n}`, technologies: [`t${n}`, `u${n}`] })),
  internships: [{}, {}], certifications: [{}, {}, {}], githubUsername: "g", linkedinProfile: "l",
  githubData: { username: "g", publicRepos: 8, repositories: [{ stars: 15, language: "JS" }] },
};
assert.strictEqual(featuresOf(empty).length, FEATURE_NAMES.length, "feature row is complete for an empty profile");
assert.ok(predictMl(full).ensembleScore > predictMl(empty).ensembleScore, "a stronger profile scores higher");

for (const s of [empty, full]) {
  const { ml, engine, ...rule } = predict(s);
  assert.deepStrictEqual(rule, calculateOverallReadiness(s), "existing score, category and components unchanged");
  assert.strictEqual(engine, "weighted-scoring-v1", "engine label unchanged");
  assert.ok(ml && ml.ensembleScore >= 0 && ml.ensembleScore <= 100 && ml.category, "ml result attached");
}
console.log("ML MODEL CHECKS PASSED");
