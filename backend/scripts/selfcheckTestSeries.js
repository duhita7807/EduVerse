// Self-check for the placement test series (config/testSeries.js).
// Validates all 300 questions and independently re-derives answers from the
// question text for the numeric templates. Run: node scripts/selfcheckTestSeries.js
const assert = require("assert");
const { buildTest, STAGES, TESTS_PER_STAGE, QUESTIONS_PER_TEST } = require("../config/testSeries");

const num = (s) => Number(String(s).replace(/[^0-9.]/g, ""));
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
let checked = 0, derived = 0;
const allTests = new Set();

for (const stage of STAGES) {
  const words = new Set();
  for (let t = 1; t <= TESTS_PER_STAGE; t++) {
    const qs = buildTest(stage, t);
    assert.deepStrictEqual(qs, buildTest(stage, t), `${stage} ${t} is deterministic`);
    assert.strictEqual(qs.length, QUESTIONS_PER_TEST, `${stage} ${t} has 10 questions`);
    assert.strictEqual(new Set(qs.map((q) => q.prompt)).size, QUESTIONS_PER_TEST, `${stage} ${t} prompts are distinct`);
    const key = qs.map((q) => q.prompt).join("|");
    assert.ok(!allTests.has(key), `${stage} ${t} differs from every other test`);
    allTests.add(key);

    for (const q of qs) {
      const where = `${stage} T${t}: ${q.prompt}`;
      assert.strictEqual(q.options.length, 4, `4 options — ${where}`);
      assert.strictEqual(new Set(q.options).size, 4, `options distinct — ${where} ${JSON.stringify(q.options)}`);
      assert.ok(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3, `answer key valid — ${where}`);
      const blob = q.prompt + q.options.join() + q.explanation;
      assert.ok(!/NaN|undefined|Infinity|null/.test(blob), `no broken values — ${where}`);
      assert.ok(q.explanation.length > 10, `has explanation — ${where}`);
      const ans = q.options[q.correctIndex];
      let m;

      // Independent re-derivation from the question text.
      if ((m = q.prompt.match(/^What is (\d+)% of (\d+)\?$/))) assert.strictEqual(num(ans), (+m[1] * +m[2]) / 100, where), derived++;
      if ((m = q.prompt.match(/^Find the average of ([\d, ]+)\.$/))) {
        const xs = m[1].split(", ").map(Number);
        assert.strictEqual(num(ans), xs.reduce((s, x) => s + x, 0) / xs.length, where), derived++;
      }
      if ((m = q.prompt.match(/^Find the LCM of (\d+) and (\d+)\.$/))) assert.strictEqual(num(ans), (+m[1] * +m[2]) / gcd(+m[1], +m[2]), where), derived++;
      if ((m = q.prompt.match(/^Find the HCF of (\d+) and (\d+)\.$/))) assert.strictEqual(num(ans), gcd(+m[1], +m[2]), where), derived++;
      if ((m = q.prompt.match(/A can finish a job in (\d+) days and B in (\d+) days/))) assert.strictEqual(num(ans), (+m[1] * +m[2]) / (+m[1] + +m[2]), where), derived++;
      if ((m = q.prompt.match(/sum is (\d+)\?$/))) {
        let ways = 0;
        for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === +m[1]) ways++;
        const g = gcd(ways, 36);
        assert.strictEqual(ans, `${ways / g}/${36 / g}`, where), derived++;
      }
      if ((m = q.prompt.match(/hands at (\d+):(\d+)\?$/))) {
        const raw = Math.abs(30 * +m[1] - 5.5 * +m[2]);
        assert.strictEqual(num(ans), Math.min(raw, 360 - raw), where), derived++;
      }
      if ((m = q.prompt.match(/walks (\d+) km north, then turns right and walks (\d+) km/))) assert.strictEqual(num(ans), Math.hypot(+m[1], +m[2]), where), derived++;
      if ((m = q.prompt.match(/^Which of these numbers is NOT prime\?$/))) {
        const isPrime = (n) => n > 1 && [...Array(Math.floor(Math.sqrt(n)) - 1)].every((_, i) => n % (i + 2) !== 0);
        assert.ok(!isPrime(num(ans)) && q.options.filter((o) => o !== ans).every((o) => isPrime(num(o))), where), derived++;
      }
      if ((m = q.prompt.match(/^Find the next number: ([\d, ]+), \?$/))) {
        const xs = m[1].split(", ").map(Number);
        const d1 = xs.slice(1).map((x, i) => x - xs[i]);
        if (d1.every((d) => d === d1[0])) assert.strictEqual(num(ans), xs[4] + d1[0], `arithmetic ${where}`), derived++;
        else if (xs.slice(1).every((x, i) => x / xs[i] === xs[1] / xs[0])) assert.strictEqual(num(ans), xs[4] * (xs[1] / xs[0]), `geometric ${where}`), derived++;
      }
      if (q.topic.startsWith("Verbal")) words.add(q.prompt);
      checked++;
    }
  }
  assert.ok(words.size === new Set(words).size, `${stage}: no verbal item repeats`);
}

assert.strictEqual(checked, 300);
assert.strictEqual(allTests.size, 30);
console.log(`TEST SERIES CHECKS PASSED — ${checked} questions validated, ${derived} answers independently re-derived`);
