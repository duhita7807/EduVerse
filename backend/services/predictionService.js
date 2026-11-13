const readinessService = require("./readinessService");
const { predictMl } = require("./mlModelService");

/**
 * predictionService is the single point of contact the rest of the app
 * uses to get a readiness prediction. Today it delegates to the
 * transparent weighted-scoring engine in readinessService.js.
 *
 * To swap in a trained ML model later (e.g. a Random Forest classifier),
 * replace the body of `predict()` with a call to that model and keep the
 * same return shape — nothing in analyticsController or the frontend
 * needs to change.
 */
const ENGINE_VERSION = "weighted-scoring-v1"; // bump when the engine changes

/**
 * @param {object} student - full Student mongoose document (or plain object)
 * @returns {{ overallScore: number, category: string, componentScores: object, engine: string }}
 */
const predict = (student) => {
  const result = readinessService.calculateOverallReadiness(student);
  return { ...result, engine: ENGINE_VERSION, ml: predictMl(student) };
};

module.exports = { predict, ENGINE_VERSION };
