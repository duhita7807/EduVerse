/**
 * Test series for every round: 3 stages x 10 tests x 10 MCQs per track.
 *   aptitude  — generated (config/testSeries.js)
 *   coding    — generated, verified against real Python (series/coding.js)
 *   hr        — hand-written bank (series/hr.js)
 *   technical — per branch family: numeric templates + hand-written bank (series/technical/*.js)
 */
const { buildTest, rngFor, shuffle, STAGES, TESTS_PER_STAGE } = require("../testSeries");
const { buildCodingTest } = require("./coding");
const { HR_BANK } = require("./hr");
const { branchGroup } = require("../questionBank");

const TRACKS = ["aptitude", "coding", "technical", "hr"];
const TECHNICAL = {
  cs: () => require("./technical/cs"),
  mechanical: () => require("./technical/mechanical"),
  civil: () => require("./technical/civil"),
  electrical: () => require("./technical/electrical"),
  chemical: () => require("./technical/chemical"),
};

/** Turns [question, answer, [wrong x3], why] bank entries into shuffled MCQs. */
const fromEntries = (entries, seed) => {
  const r = rngFor(seed);
  return entries.map(([prompt, answer, wrong, explanation, topic]) => {
    const options = shuffle(r, [answer, ...wrong]);
    return { topic: topic || "", prompt, code: "", options, correctIndex: options.indexOf(answer), explanation };
  });
};

const hrTest = (stage, testNo) => {
  const entries = HR_BANK[stage].slice((testNo - 1) * 10, testNo * 10).map((e) => [...e, "HR"]);
  return fromEntries(entries, 9000 + STAGES.indexOf(stage) * 100 + testNo);
};

/** Builds one series test. `branch` is the student's branch text (technical only). */
const buildSeriesTest = (track, stage, testNo, branch) => {
  if (!TRACKS.includes(track)) throw new Error(`Unknown track: ${track}`);
  if (track === "aptitude") return buildTest(stage, testNo);
  if (track === "coding") return buildCodingTest(stage, testNo);
  if (track === "hr") return hrTest(stage, testNo);
  return TECHNICAL[branchGroup(branch)]().buildTechnicalTest(stage, testNo, fromEntries);
};

module.exports = { buildSeriesTest, TRACKS, STAGES, TESTS_PER_STAGE, fromEntries, branchGroupOf: branchGroup };
