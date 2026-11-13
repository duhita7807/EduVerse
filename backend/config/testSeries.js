/**
 * Placement test series: 3 stages x 10 fixed tests x 10 MCQs (300 questions).
 *
 * Questions are generated from templates whose answers are COMPUTED, not
 * typed, so every answer key is correct by construction. A test is seeded by
 * (stage, testNo), so "Intermediate - Test 4" is always the same 10 questions.
 * Verbal questions use curated word lists: test N uses entry N, so no word
 * repeats across a stage. Verified by scripts/selfcheckTestSeries.js.
 */

const STAGES = ["beginner", "intermediate", "advanced"];
const TESTS_PER_STAGE = 10;
const QUESTIONS_PER_TEST = 10;

/* ---------- deterministic helpers ---------- */

// mulberry32: tiny seeded PRNG, so tests are identical on every run.
const rngFor = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const shuffle = (r, arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const nCr = (n, k) => Math.round(fact(n) / (fact(k) * fact(n - k)));
const inr = (n) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const frac = (n, d) => {
  const g = gcd(n, d);
  return `${n / g}/${d / g}`;
};

/** Three distinct wrong numeric options around the answer. */
const numDistractors = (v, step) => {
  const cands = [v + step, v - step, v + 2 * step, v - 2 * step, v + 3 * step, Math.round(v * 1.25), Math.round(v * 0.8)];
  const out = [];
  for (const c of cands) if (c > 0 && c !== v && !out.includes(c)) out.push(Math.round(c * 100) / 100);
  return [...new Set(out)].filter((c) => c !== v).slice(0, 3);
};

/** Builds a question with numeric options formatted by `fmt`. */
const numQ = (topic, prompt, answer, step, fmt, explanation) => ({
  topic,
  prompt,
  answer: fmt(answer),
  wrong: numDistractors(answer, step).map(fmt),
  explanation,
});

/* ---------- verbal lists: [word, correct, [3 wrong]] ---------- */

const VERBAL = {
  beginner: {
    synonym: [["Rapid", "Quick", ["Slow", "Calm", "Late"]], ["Huge", "Enormous", ["Tiny", "Narrow", "Weak"]], ["Begin", "Start", ["Finish", "Delay", "Stop"]], ["Brave", "Courageous", ["Timid", "Lazy", "Rude"]], ["Happy", "Joyful", ["Sad", "Angry", "Tired"]], ["Assist", "Help", ["Hinder", "Ignore", "Leave"]], ["Accurate", "Correct", ["Wrong", "Vague", "Rough"]], ["Ancient", "Old", ["Modern", "Recent", "Young"]], ["Purchase", "Buy", ["Sell", "Lend", "Borrow"]], ["Silent", "Quiet", ["Loud", "Noisy", "Busy"]]],
    antonym: [["Expand", "Contract", ["Enlarge", "Grow", "Extend"]], ["Generous", "Stingy", ["Kind", "Giving", "Liberal"]], ["Victory", "Defeat", ["Success", "Triumph", "Win"]], ["Ancient", "Modern", ["Old", "Aged", "Antique"]], ["Arrive", "Depart", ["Reach", "Come", "Land"]], ["Include", "Exclude", ["Contain", "Involve", "Cover"]], ["Strong", "Weak", ["Sturdy", "Powerful", "Tough"]], ["Accept", "Reject", ["Approve", "Receive", "Admit"]], ["Increase", "Decrease", ["Raise", "Boost", "Add"]], ["Visible", "Invisible", ["Clear", "Obvious", "Seen"]]],
  },
  intermediate: {
    synonym: [["Abundant", "Plentiful", ["Scarce", "Rare", "Meagre"]], ["Candid", "Frank", ["Secretive", "Shy", "Formal"]], ["Diligent", "Hardworking", ["Lazy", "Careless", "Idle"]], ["Eloquent", "Articulate", ["Mumbling", "Silent", "Clumsy"]], ["Feasible", "Practicable", ["Impossible", "Absurd", "Risky"]], ["Lucid", "Clear", ["Confusing", "Dim", "Vague"]], ["Meticulous", "Careful", ["Sloppy", "Hasty", "Rough"]], ["Obsolete", "Outdated", ["Current", "Modern", "Novel"]], ["Prudent", "Wise", ["Reckless", "Foolish", "Rash"]], ["Tenacious", "Persistent", ["Weak", "Yielding", "Fickle"]]],
    antonym: [["Benevolent", "Malevolent", ["Kind", "Generous", "Gentle"]], ["Frugal", "Extravagant", ["Thrifty", "Careful", "Economical"]], ["Optimistic", "Pessimistic", ["Hopeful", "Positive", "Cheerful"]], ["Transparent", "Opaque", ["Clear", "Lucid", "Obvious"]], ["Humble", "Arrogant", ["Modest", "Meek", "Simple"]], ["Scarce", "Abundant", ["Rare", "Sparse", "Limited"]], ["Hostile", "Friendly", ["Aggressive", "Unkind", "Cold"]], ["Temporary", "Permanent", ["Brief", "Passing", "Short"]], ["Voluntary", "Compulsory", ["Optional", "Willing", "Free"]], ["Rigid", "Flexible", ["Stiff", "Firm", "Fixed"]]],
  },
  advanced: {
    synonym: [["Ubiquitous", "Omnipresent", ["Rare", "Unique", "Hidden"]], ["Ephemeral", "Transient", ["Eternal", "Lasting", "Stable"]], ["Pragmatic", "Practical", ["Idealistic", "Theoretical", "Dreamy"]], ["Cogent", "Convincing", ["Weak", "Confusing", "Doubtful"]], ["Laconic", "Concise", ["Verbose", "Wordy", "Rambling"]], ["Recalcitrant", "Defiant", ["Obedient", "Docile", "Compliant"]], ["Sagacious", "Wise", ["Foolish", "Naive", "Ignorant"]], ["Ameliorate", "Improve", ["Worsen", "Damage", "Weaken"]], ["Obfuscate", "Confuse", ["Clarify", "Explain", "Simplify"]], ["Perfunctory", "Cursory", ["Thorough", "Careful", "Detailed"]]],
    antonym: [["Gregarious", "Reclusive", ["Sociable", "Friendly", "Outgoing"]], ["Verbose", "Concise", ["Wordy", "Lengthy", "Prolix"]], ["Ostentatious", "Modest", ["Showy", "Flashy", "Pretentious"]], ["Magnanimous", "Petty", ["Generous", "Noble", "Forgiving"]], ["Lethargic", "Energetic", ["Sluggish", "Tired", "Listless"]], ["Candour", "Deceit", ["Honesty", "Frankness", "Openness"]], ["Zenith", "Nadir", ["Peak", "Summit", "Apex"]], ["Augment", "Diminish", ["Increase", "Enlarge", "Expand"]], ["Belligerent", "Peaceful", ["Hostile", "Combative", "Aggressive"]], ["Esoteric", "Common", ["Obscure", "Arcane", "Mysterious"]]],
  },
};
const verbal = (stage, kind, t) => {
  const [word, answer, wrong] = VERBAL[stage][kind][t - 1];
  return {
    topic: kind === "synonym" ? "Verbal: synonyms" : "Verbal: antonyms",
    prompt: `Choose the word ${kind === "synonym" ? "closest in meaning to" : "most opposite in meaning to"} “${word}”.`,
    answer,
    wrong,
    explanation: `“${word}” means the ${kind === "synonym" ? "same as" : "opposite of"} “${answer}”.`,
  };
};

/* ---------- templates: (r, t) => { topic, prompt, answer, wrong, explanation } ---------- */

const CODE_WORDS = ["CAT", "DOG", "PEN", "BOOK", "LAMP", "TREE", "GOLD", "FISH", "MILK", "STAR", "RAIN", "SHIP"];
const shiftWord = (w, k) => w.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + k + 26) % 26) + 65));
const COMPOSITES = [21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91];
const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const WORK_PAIRS = [[3, 6], [4, 12], [6, 12], [10, 15], [12, 24], [20, 30], [12, 60], [15, 30]];
const LEAK_PAIRS = [[3, 6], [4, 12], [6, 12], [10, 15], [12, 20], [20, 30], [4, 6], [8, 12]];
const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [12, 16, 20], [7, 24, 25], [9, 40, 41]];
const ARRANGE_WORDS = ["LEVEL", "BANANA", "APPLE", "LETTER", "SUCCESS", "ARRANGE", "BALLOON", "COFFEE", "PEPPER", "GOOGLE"];
const arrangements = (w) => {
  const counts = {};
  for (const c of w) counts[c] = (counts[c] || 0) + 1;
  return Object.values(counts).reduce((acc, k) => acc / fact(k), fact(w.length));
};

const TEMPLATES = {
  beginner: {
    percentOf: (r) => {
      const p = pick(r, [5, 10, 15, 20, 25, 40, 50, 75]);
      const n = int(r, 4, 40) * 20;
      return numQ("Percentages", `What is ${p}% of ${n}?`, (p * n) / 100, p >= 25 ? 10 : 5, String, `${p}% of ${n} = ${p}/100 × ${n} = ${(p * n) / 100}.`);
    },
    average: (r) => {
      const xs = Array.from({ length: 5 }, () => int(r, 10, 60));
      const fix = 5 - (xs.reduce((s, x) => s + x, 0) % 5); // make the average a whole number
      xs[4] += fix % 5;
      const avg = xs.reduce((s, x) => s + x, 0) / 5;
      return numQ("Averages", `Find the average of ${xs.join(", ")}.`, avg, 2, String, `Sum = ${xs.reduce((s, x) => s + x, 0)}; average = sum ÷ 5 = ${avg}.`);
    },
    speed: (r) => {
      const v = int(r, 4, 18) * 5;
      const t = int(r, 2, 6);
      return numQ("Speed & distance", `A bus covers ${v * t} km in ${t} hours. What is its average speed?`, v, 5, (n) => `${n} km/h`, `Speed = distance ÷ time = ${v * t} ÷ ${t} = ${v} km/h.`);
    },
    seriesArith: (r) => {
      const a = int(r, 2, 30), d = int(r, 3, 12);
      const terms = Array.from({ length: 5 }, (_, i) => a + i * d);
      return numQ("Number series", `Find the next number: ${terms.join(", ")}, ?`, a + 5 * d, d, String, `Each term increases by ${d}: ${terms[4]} + ${d} = ${a + 5 * d}.`);
    },
    ratioShare: (r) => {
      const a = int(r, 1, 4), b = a + int(r, 1, 4);
      const unit = int(r, 2, 20) * 50;
      return numQ("Ratio & proportion", `${inr((a + b) * unit)} is divided between A and B in the ratio ${a} : ${b}. What is B's share?`, b * unit, unit, inr, `Total parts = ${a + b}; one part = ${inr(unit)}; B gets ${b} × ${inr(unit)} = ${inr(b * unit)}.`);
    },
    simpleInterest: (r) => {
      const p = int(r, 2, 20) * 1000, rate = pick(r, [4, 5, 6, 8, 10, 12]), t = int(r, 2, 5);
      const si = (p * rate * t) / 100;
      return numQ("Simple interest", `Find the simple interest on ${inr(p)} at ${rate}% per annum for ${t} years.`, si, (p * rate) / 100, inr, `SI = P × R × T ÷ 100 = ${p} × ${rate} × ${t} ÷ 100 = ${inr(si)}.`);
    },
    profitPercent: (r) => {
      const cp = int(r, 4, 40) * 50, pct = pick(r, [10, 12, 15, 20, 25, 30, 40]);
      const sp = cp + (cp * pct) / 100;
      return numQ("Profit & loss", `An item bought for ${inr(cp)} is sold for ${inr(sp)}. What is the profit percentage?`, pct, 5, (n) => `${n}%`, `Profit = ${inr(sp - cp)}; profit % = ${sp - cp} ÷ ${cp} × 100 = ${pct}%.`);
    },
    synonym: (r, t) => verbal("beginner", "synonym", t),
    antonym: (r, t) => verbal("beginner", "antonym", t),
    codingDecoding: (r, t) => {
      const k = int(r, 1, 3);
      const w1 = CODE_WORDS[(t - 1) % CODE_WORDS.length], w2 = CODE_WORDS[(t + 3) % CODE_WORDS.length];
      return {
        topic: "Coding-decoding",
        prompt: `If ${w1} is written as ${shiftWord(w1, k)}, how is ${w2} written in that code?`,
        answer: shiftWord(w2, k),
        wrong: [shiftWord(w2, k + 1), shiftWord(w2, k - 1), shiftWord(w2, -k)].filter((x, i, a) => x !== shiftWord(w2, k) && a.indexOf(x) === i).slice(0, 3),
        explanation: `Each letter moves ${k} place${k > 1 ? "s" : ""} forward in the alphabet, so ${w2} → ${shiftWord(w2, k)}.`,
      };
    },
    lcm: (r) => {
      const [a, b] = pick(r, [[4, 6], [6, 8], [8, 12], [9, 12], [10, 15], [12, 18], [6, 15], [14, 21], [12, 16], [15, 20]]);
      const l = (a * b) / gcd(a, b);
      return numQ("LCM & HCF", `Find the LCM of ${a} and ${b}.`, l, gcd(a, b) * 2, String, `HCF(${a}, ${b}) = ${gcd(a, b)}, so LCM = ${a} × ${b} ÷ ${gcd(a, b)} = ${l}.`);
    },
    notPrime: (r) => {
      const c = pick(r, COMPOSITES);
      const ps = shuffle(r, PRIMES).slice(0, 3);
      const f = [3, 7, 11, 13].find((p) => c % p === 0) || 3;
      return { topic: "Number system", prompt: "Which of these numbers is NOT prime?", answer: String(c), wrong: ps.map(String), explanation: `${c} = ${f} × ${c / f}, so it is not prime; the others are prime.` };
    },
  },

  intermediate: {
    timeWork: (r) => {
      const [a, b] = pick(r, WORK_PAIRS);
      const t = (a * b) / (a + b);
      return numQ("Time & work", `A can finish a job in ${a} days and B in ${b} days. How many days will they take working together?`, t, 1, (n) => `${n} days`, `Together they do 1/${a} + 1/${b} = ${a + b}/${a * b} of the job per day, so ${a * b}/${a + b} = ${t} days.`);
    },
    compoundInterest2: (r) => {
      const p = int(r, 2, 20) * 1000, rate = pick(r, [5, 10, 20]);
      const ci = Math.round(p * ((1 + rate / 100) ** 2 - 1) * 100) / 100;
      return numQ("Compound interest", `Find the compound interest on ${inr(p)} at ${rate}% per annum for 2 years, compounded annually.`, ci, (p * rate) / 100 / 2, inr, `Amount = ${p} × (1 + ${rate}/100)² = ${inr(p + ci)}; CI = amount − principal = ${inr(ci)}.`);
    },
    ages: (r) => {
      const son = int(r, 6, 18), k = int(r, 2, 4);
      return numQ("Ages", `The sum of the ages of a father and his son is ${son * (k + 1)} years. The father is ${k} times as old as the son. How old is the son?`, son, 2, (n) => `${n} years`, `Son = x, father = ${k}x, so ${k + 1}x = ${son * (k + 1)} and x = ${son}.`);
    },
    trainPlatform: (r) => {
      const v = pick(r, [10, 15, 20, 25]), t = int(r, 12, 30);
      const train = int(r, 10, Math.floor((v * t) / 20)) * 10;
      const platform = v * t - train;
      return numQ("Trains", `A ${train} m long train crosses a ${platform} m platform in ${t} seconds. What is its speed?`, (v * 18) / 5, 9, (n) => `${n} km/h`, `Distance = ${train} + ${platform} = ${v * t} m in ${t} s = ${v} m/s = ${v} × 18/5 = ${(v * 18) / 5} km/h.`);
    },
    successivePercent: (r) => {
      const p = int(r, 4, 20) * 100, up = pick(r, [10, 20, 25]), down = pick(r, [10, 20]);
      const final = Math.round(p * (1 + up / 100) * (1 - down / 100) * 100) / 100;
      return numQ("Percentages", `A price of ${inr(p)} is increased by ${up}% and then decreased by ${down}%. What is the final price?`, final, p / 50, inr, `${p} × ${1 + up / 100} × ${1 - down / 100} = ${inr(final)}.`);
    },
    seriesGeo: (r) => {
      const a = int(r, 1, 5), q = pick(r, [2, 3]);
      const terms = Array.from({ length: 5 }, (_, i) => a * q ** i);
      return numQ("Number series", `Find the next number: ${terms.join(", ")}, ?`, a * q ** 5, a * q ** 4, String, `Each term is multiplied by ${q}: ${terms[4]} × ${q} = ${a * q ** 5}.`);
    },
    seriesSquarePlus: (r) => {
      const n0 = int(r, 1, 6), c = int(r, 1, 5);
      const terms = Array.from({ length: 5 }, (_, i) => (n0 + i) ** 2 + c);
      const next = (n0 + 5) ** 2 + c;
      return numQ("Number series", `Find the next number: ${terms.join(", ")}, ?`, next, 2, String, `The terms are n² + ${c} for n = ${n0}, ${n0 + 1}, …; next is ${n0 + 5}² + ${c} = ${next}.`);
    },
    directions: (r) => {
      const [a, b, c] = pick(r, TRIPLES);
      return numQ("Direction sense", `Ravi walks ${a} km north, then turns right and walks ${b} km. How far is he from his starting point?`, c, 1, (n) => `${n} km`, `The path forms a right angle, so distance = √(${a}² + ${b}²) = √${a * a + b * b} = ${c} km.`);
    },
    hcf: (r) => {
      const h = int(r, 3, 16);
      const [x, y] = pick(r, [[2, 3], [3, 4], [3, 5], [4, 5], [5, 7], [2, 7], [5, 6]]);
      return numQ("LCM & HCF", `Find the HCF of ${h * x} and ${h * y}.`, h, 1, String, `${h * x} = ${h} × ${x} and ${h * y} = ${h} × ${y}; ${x} and ${y} share no factor, so HCF = ${h}.`);
    },
    avgReplace: (r) => {
      const n = pick(r, [5, 8, 10]), avg = int(r, 20, 60), diff = n * int(r, 1, 4), out = int(r, 20, 50);
      return numQ("Averages", `The average of ${n} numbers is ${avg}. If ${out} is replaced by ${out + diff}, what is the new average?`, avg + diff / n, 1, String, `The sum rises by ${diff}, so the average rises by ${diff} ÷ ${n} = ${diff / n}: ${avg + diff / n}.`);
    },
    synonym: (r, t) => verbal("intermediate", "synonym", t),
    antonym: (r, t) => verbal("intermediate", "antonym", t),
  },

  advanced: {
    diceProb: (r) => {
      const s = int(r, 3, 11);
      const ways = 6 - Math.abs(7 - s);
      const wrongs = [...new Set([ways + 1, ways - 1, ways + 2].filter((w) => w > 0 && w !== ways).map((w) => frac(w, 36)))].filter((f) => f !== frac(ways, 36)).slice(0, 3);
      return { topic: "Probability", prompt: `Two fair dice are rolled. What is the probability that the sum is ${s}?`, answer: frac(ways, 36), wrong: wrongs, explanation: `${ways} of the 36 equally likely outcomes give a sum of ${s}, so P = ${ways}/36 = ${frac(ways, 36)}.` };
    },
    wordArrange: (r, t) => {
      const w = ARRANGE_WORDS[t - 1];
      const n = arrangements(w);
      return numQ("Permutations", `In how many distinct ways can the letters of the word ${w} be arranged?`, n, Math.max(10, n / 2), String, `${w} has ${w.length} letters with repeats; arrangements = ${w.length}! ÷ (product of factorials of repeated letters) = ${n}.`);
    },
    committee: (r) => {
      const m = int(r, 5, 8), w = int(r, 4, 6), a = int(r, 2, 3), b = int(r, 1, 2);
      const n = nCr(m, a) * nCr(w, b);
      return numQ("Combinations", `A committee of ${a} men and ${b} ${b === 1 ? "woman" : "women"} is to be chosen from ${m} men and ${w} women. In how many ways can this be done?`, n, Math.max(5, Math.round(n / 6)), String, `C(${m}, ${a}) × C(${w}, ${b}) = ${nCr(m, a)} × ${nCr(w, b)} = ${n}.`);
    },
    compoundInterest3: (r) => {
      const p = int(r, 1, 20) * 1000;
      const amt = Math.round(p * 1.331 * 100) / 100;
      return numQ("Compound interest", `What amount will ${inr(p)} grow to in 3 years at 10% per annum, compounded annually?`, amt, p / 10, inr, `${p} × 1.1³ = ${p} × 1.331 = ${inr(amt)}.`);
    },
    boats: (r) => {
      const b = int(r, 6, 15), s = int(r, 1, Math.min(5, b - 1)), t = int(r, 2, 5);
      return numQ("Boats & streams", `A boat goes ${(b + s) * t} km downstream in ${t} hours and ${(b - s) * t} km upstream in ${t} hours. What is its speed in still water?`, b, 1, (n) => `${n} km/h`, `Downstream ${b + s} km/h, upstream ${b - s} km/h; still water = (${b + s} + ${b - s}) ÷ 2 = ${b} km/h.`);
    },
    pipesLeak: (r) => {
      const [a, b] = pick(r, LEAK_PAIRS);
      const t = (a * b) / (b - a);
      return numQ("Pipes & cisterns", `A pipe fills a tank in ${a} hours, but a leak can empty the full tank in ${b} hours. How long does the pipe take to fill the tank with the leak open?`, t, Math.max(1, t / 4), (n) => `${n} hours`, `Net rate = 1/${a} − 1/${b} = ${b - a}/${a * b} per hour, so time = ${a * b}/${b - a} = ${t} hours.`);
    },
    clockAngle: (r) => {
      const h = int(r, 1, 11), m = int(r, 1, 5) * 10;
      const raw = Math.abs(30 * h - 5.5 * m);
      const ang = Math.min(raw, 360 - raw);
      return numQ("Clocks", `What is the smaller angle between the hour and minute hands at ${h}:${String(m).padStart(2, "0")}?`, ang, 5, (n) => `${n}°`, `Angle = |30 × ${h} − 5.5 × ${m}| = ${raw}°${raw > 180 ? `; the smaller angle is 360° − ${raw}° = ${ang}°` : ""}.`);
    },
    relativeTrains: (r) => {
      const sum = pick(r, [72, 90, 108]), s1 = int(r, 2, sum / 18 - 1) * 9, s2 = sum - s1, ms = (sum * 5) / 18, t = int(r, 8, 20);
      const l1 = int(r, 5, Math.floor((ms * t) / 10) - 5) * 10;
      return numQ("Trains", `Two trains ${l1} m and ${ms * t - l1} m long run in opposite directions at ${s1} km/h and ${s2} km/h. How long do they take to cross each other?`, t, 2, (n) => `${n} seconds`, `Relative speed = ${s1} + ${s2} = ${sum} km/h = ${ms} m/s; distance = ${ms * t} m; time = ${ms * t} ÷ ${ms} = ${t} s.`);
    },
    partnership: (r) => {
      const x = int(r, 2, 6), y = int(r, 2, 6), mx = pick(r, [6, 8, 12]), my = pick(r, [6, 8, 12]);
      const unit = int(r, 1, 10) * 100;
      const total = (x * mx + y * my) * unit;
      return numQ("Partnership", `A invests ${inr(x * 10000)} for ${mx} months and B invests ${inr(y * 10000)} for ${my} months. Out of a profit of ${inr(total)}, what is A's share?`, x * mx * unit, unit * 2, inr, `Profit is shared in the ratio ${x * mx} : ${y * my}; A gets ${x * mx}/${x * mx + y * my} × ${total} = ${inr(x * mx * unit)}.`);
    },
    seriesCubes: (r) => {
      const n0 = int(r, 1, 4), c = pick(r, [0, 1, 2]);
      const terms = Array.from({ length: 5 }, (_, i) => (n0 + i) ** 3 + c);
      const next = (n0 + 5) ** 3 + c;
      return numQ("Number series", `Find the next number: ${terms.join(", ")}, ?`, next, 10, String, `The terms are n³${c ? ` + ${c}` : ""} for n = ${n0}, ${n0 + 1}, …; next is ${n0 + 5}³${c ? ` + ${c}` : ""} = ${next}.`);
    },
    synonym: (r, t) => verbal("advanced", "synonym", t),
    antonym: (r, t) => verbal("advanced", "antonym", t),
  },
};

/** The 10 questions of one test, in the shape Assessment.questions expects. */
const buildTest = (stage, testNo) => {
  if (!STAGES.includes(stage)) throw new Error(`Unknown stage: ${stage}`);
  if (!Number.isInteger(testNo) || testNo < 1 || testNo > TESTS_PER_STAGE) throw new Error(`testNo must be 1-${TESTS_PER_STAGE}`);
  const r = rngFor(STAGES.indexOf(stage) * 1000 + testNo * 37 + 11);
  const names = shuffle(r, Object.keys(TEMPLATES[stage])).slice(0, QUESTIONS_PER_TEST);
  return names.map((name) => {
    const q = TEMPLATES[stage][name](r, testNo);
    const options = shuffle(r, [q.answer, ...q.wrong]);
    return { topic: q.topic, prompt: q.prompt, options, correctIndex: options.indexOf(q.answer), explanation: q.explanation };
  });
};

module.exports = { buildTest, STAGES, TESTS_PER_STAGE, QUESTIONS_PER_TEST, rngFor, int, pick, shuffle, gcd, fact, nCr, numDistractors };
