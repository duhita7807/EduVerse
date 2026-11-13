const fs = require("fs");
const path = require("path");
const { featuresOf } = require("../ml/features");
const { READINESS_CATEGORIES } = require("../config/readinessWeights");

const MODELS_PATH = path.join(__dirname, "..", "ml", "models.json");
let models; // undefined = not loaded yet, null = unavailable

const load = () => {
  if (models !== undefined) return models;
  try {
    models = JSON.parse(fs.readFileSync(MODELS_PATH, "utf8"));
  } catch (err) {
    console.warn(`ML models unavailable (${err.message}). Train with: ml/.venv/Scripts/python ml/train.py`);
    models = null;
  }
  return models;
};

// sklearn sends value <= threshold left; XGBoost sends value < threshold left.
const walk = (tree, row, inclusive) => {
  let i = 0;
  while (tree.f[i] >= 0) {
    const value = row[tree.f[i]];
    i = (inclusive ? value <= tree.t[i] : value < tree.t[i]) ? tree.l[i] : tree.r[i];
  }
  return tree.v[i];
};

const randomForestScore = (row, m = load()) => m.randomForest.trees.reduce((sum, t) => sum + walk(t, row, true), 0) / m.randomForest.trees.length;
const xgboostScore = (row, m = load()) => m.xgboost.trees.reduce((sum, t) => sum + walk(t, row, false), m.xgboost.base);

const clamp = (n) => Math.round(Math.max(0, Math.min(100, n)));

/**
 * Random Forest and XGBoost estimates of the readiness score. Both are trained on the
 * rule-based score (no real placement outcomes exist yet), so they estimate that score,
 * not the chance of being placed. Returns null if the model file is missing.
 */
const predictMl = (student) => {
  const m = load();
  if (!m) return null;
  const row = featuresOf(student);
  const randomForest = randomForestScore(row, m);
  const xgboost = xgboostScore(row, m);
  const ensembleScore = clamp((randomForest + xgboost) / 2);
  return {
    randomForestScore: clamp(randomForest),
    xgboostScore: clamp(xgboost),
    ensembleScore,
    category: READINESS_CATEGORIES.find((c) => ensembleScore >= c.min && ensembleScore <= c.max)?.label || "Unrated",
  };
};

module.exports = { predictMl, randomForestScore, xgboostScore, MODELS_PATH };
