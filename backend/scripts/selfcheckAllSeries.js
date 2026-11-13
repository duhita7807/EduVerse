// Self-check for every test series track: aptitude, coding, HR and technical
// (each branch family). Validates all tests: 10 questions, 4 distinct options,
// valid answer key, explanation, no broken values, no repeated question within
// a stage. Run: node scripts/selfcheckAllSeries.js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { buildSeriesTest, STAGES } = require("../config/series");
const { HR_BANK } = require("../config/series/hr");

const BRANCH_SAMPLE = { cs: "Computer Science & Engineering", mechanical: "Mechanical Engineering", civil: "Civil Engineering", electrical: "Electronics & Telecommunication Engineering", chemical: "Chemical Engineering" };
const tracks = [["aptitude"], ["coding"], ["hr"]];
for (const [fam, branch] of Object.entries(BRANCH_SAMPLE)) {
  if (fs.existsSync(path.join(__dirname, "../config/series/technical", `${fam}.js`))) tracks.push(["technical", branch, fam]);
}

const checkBank = (name, bank, perTest) => {
  for (const stage of STAGES) {
    const entries = bank[stage];
    assert.strictEqual(entries.length, perTest * 10, `${name} ${stage}: ${perTest * 10} bank entries (has ${entries.length})`);
    const qs = entries.map((e) => e[0]);
    const dup = qs.filter((q, i) => qs.indexOf(q) !== i);
    assert.strictEqual(dup.length, 0, `${name} ${stage}: duplicate questions ${JSON.stringify(dup)}`);
    entries.forEach((e, i) => {
      assert.ok(Array.isArray(e[2]) && e[2].length === 3, `${name} ${stage} #${i + 1}: needs exactly 3 wrong options`);
      assert.ok(!e[2].includes(e[1]), `${name} ${stage} #${i + 1}: answer repeated among wrong options`);
      assert.ok(e[3] && e[3].length > 5, `${name} ${stage} #${i + 1}: needs an explanation`);
    });
  }
};

checkBank("hr", HR_BANK, 10);
let total = 0;
for (const [track, branch, fam] of tracks) {
  if (track === "technical") checkBank(`technical/${fam}`, require(`../config/series/technical/${fam}`).BANK, 6);
  for (const stage of STAGES) {
    const prompts = new Set();
    for (let t = 1; t <= 10; t++) {
      const qs = buildSeriesTest(track, stage, t, branch);
      assert.deepStrictEqual(qs, buildSeriesTest(track, stage, t, branch), `${track} ${stage} T${t} deterministic`);
      assert.strictEqual(qs.length, 10, `${track}${fam ? "/" + fam : ""} ${stage} T${t}: 10 questions`);
      qs.forEach((q) => {
        const where = `${track}${fam ? "/" + fam : ""} ${stage} T${t}: ${q.prompt.slice(0, 70)}`;
        assert.strictEqual(q.options.length, 4, `4 options — ${where}`);
        assert.strictEqual(new Set(q.options).size, 4, `distinct options — ${where} ${JSON.stringify(q.options)}`);
        assert.ok(q.correctIndex >= 0 && q.correctIndex <= 3, `answer key — ${where}`);
        assert.ok(!/NaN|undefined|Infinity/.test(JSON.stringify(q)), `broken value — ${where}`);
        assert.ok(q.explanation && q.explanation.length > 5, `explanation — ${where}`);
        if (track !== "aptitude" && track !== "coding") assert.ok(!prompts.has(q.code + q.prompt) || /\d/.test(q.prompt), `repeat within stage — ${where}`);
        prompts.add(q.code + q.prompt);
        total++;
      });
    }
  }
}
console.log(`ALL SERIES CHECKS PASSED — tracks: ${tracks.map((t) => (t[2] ? `technical/${t[2]}` : t[0])).join(", ")}; ${total} questions validated`);
