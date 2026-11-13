/**
 * Shared builder for technical series: each test = 4 numeric problems
 * (computed answers, from the branch's templates) + 6 subject questions
 * (hand-written bank; test N uses entries (N-1)*6 .. N*6-1 of the stage).
 */
const { rngFor, int, pick, shuffle, STAGES } = require("../../testSeries");

const NUMERIC_PER_TEST = 4;
const BANK_PER_TEST = 6;

// Distractors keep the answer's precision (small engineering values must not round together).
const decimals = (v) => (String(v).split(".")[1] || "").length;
const technicalDistractors = (v, step) => {
  const d = Math.max(decimals(v), decimals(step), 2);
  const fix = (x) => Math.round(x * 10 ** d) / 10 ** d;
  const out = [];
  for (const c of [v + step, v - step, v + 2 * step, v - 2 * step, v * 1.25, v * 0.8, v + 3 * step].map(fix)) if (c > 0 && c !== v && !out.includes(c)) out.push(c);
  return out.slice(0, 3);
};
/** Numeric question with formatted options. */
const numQ = (topic, prompt, answer, step, fmt, explanation) => ({
  topic,
  prompt,
  answer: fmt(answer),
  wrong: technicalDistractors(answer, step).map(fmt),
  explanation,
});
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

const makeTechnicalBuilder = (seedBase, templates, bank) => (stage, testNo, fromEntries) => {
  const r = rngFor(seedBase + STAGES.indexOf(stage) * 1000 + testNo * 71);
  const names = shuffle(r, Object.keys(templates[stage])).slice(0, NUMERIC_PER_TEST);
  const numeric = names.map((n) => {
    const q = templates[stage][n](r, testNo);
    const options = shuffle(r, [q.answer, ...q.wrong.slice(0, 3)]);
    return { topic: q.topic, prompt: q.prompt, code: "", options, correctIndex: options.indexOf(q.answer), explanation: q.explanation };
  });
  const entries = bank[stage].slice((testNo - 1) * BANK_PER_TEST, testNo * BANK_PER_TEST);
  const concept = fromEntries(entries, seedBase + 500 + STAGES.indexOf(stage) * 100 + testNo);
  return shuffle(r, [...numeric, ...concept]);
};

module.exports = { makeTechnicalBuilder, numQ, round, int, pick, NUMERIC_PER_TEST, BANK_PER_TEST };
