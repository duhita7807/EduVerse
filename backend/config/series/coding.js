/**
 * Coding test series: 3 stages x 10 tests x 10 MCQs, generated.
 *
 * Each question shows a short Python snippet (or a complexity question) and
 * asks for its output. The answer is computed here by mirroring the snippet's
 * logic, and scripts/verifyCodingSeries.py runs every snippet in real Python
 * to confirm the answer key matches the actual output.
 */
const { rngFor, int, pick, shuffle, fact } = require("../testSeries");

const list = (xs) => `[${xs.join(", ")}]`;
const uniq3 = (answer, cands) => [...new Set(cands.map(String))].filter((c) => c !== String(answer)).slice(0, 3);
// Program output can be zero or negative, so distractors may be too.
const outputDistractors = (v, step) => uniq3(v, [v + step, v - step, v + 2 * step, v - 2 * step, -v, v + 3 * step]);
const numQ = (topic, code, answer, step, explanation) => ({
  topic,
  prompt: "What does this Python code print?",
  code,
  answer: String(answer),
  wrong: outputDistractors(answer, step),
  explanation,
});

const WORDS = ["PLACEMENT", "INTERVIEW", "ALGORITHM", "COMPILER", "DATABASE", "NETWORK", "PYTHON", "BACKEND", "FRONTEND", "STARTUP", "PROGRAM", "RECURSION"];
const COMPLEXITY = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"];

const LOOPS = {
  beginner: [
    ["for i in range(n):\n    total += i", "O(n)", "One pass over n items."],
    ["for i in range(n):\n    for j in range(n):\n        count += 1", "O(n²)", "Two nested loops of n iterations each."],
    ["x = arr[0] + arr[-1]", "O(1)", "A fixed number of operations, independent of n."],
    ["i = n\nwhile i > 1:\n    i = i // 2", "O(log n)", "n is halved each iteration."],
  ],
  intermediate: [
    ["for i in range(n):\n    j = 1\n    while j < n:\n        j *= 2", "O(n log n)", "n iterations, each doing log n doublings."],
    ["for i in range(n):\n    for j in range(i, n):\n        count += 1", "O(n²)", "n + (n−1) + … + 1 = n(n+1)/2 iterations."],
    ["Binary search on a sorted list of n items", "O(log n)", "The search range halves on every comparison."],
    ["for i in range(0, n, 2):\n    total += i", "O(n)", "n/2 iterations is still linear."],
  ],
  advanced: [
    ["Recurrence T(n) = 2T(n/2) + n (merge sort)", "O(n log n)", "log n levels, each doing n work (Master theorem case 2)."],
    ["Recurrence T(n) = T(n/2) + 1", "O(log n)", "One step per halving."],
    ["def f(n):\n    if n <= 1:\n        return 1\n    return f(n - 1) + f(n - 1)", "O(2ⁿ)", "Each call makes two calls: 2ⁿ calls in total."],
    ["Recurrence T(n) = T(n - 1) + n", "O(n²)", "n + (n−1) + … + 1 = O(n²)."],
  ],
};
const complexityQ = (stage, r) => {
  const [snippet, answer, why] = pick(r, LOOPS[stage]);
  const isCode = snippet.includes("\n") || snippet.includes("=");
  return {
    topic: "Time complexity",
    prompt: isCode ? "What is the time complexity of this code, as a function of n?" : `What is the time complexity of: ${snippet}?`,
    code: isCode ? snippet : "",
    answer,
    wrong: shuffle(r, COMPLEXITY.filter((c) => c !== answer)).slice(0, 3),
    explanation: why,
  };
};

const TEMPLATES = {
  beginner: {
    sumLoop: (r) => {
      const a = int(r, 1, 5), b = int(r, 6, 15);
      let t = 0;
      for (let i = a; i < b; i++) t += i;
      return numQ("Loops", `total = 0\nfor i in range(${a}, ${b}):\n    total += i\nprint(total)`, t, b - 1, `range(${a}, ${b}) gives ${a}…${b - 1}; their sum is ${t}.`);
    },
    countMultiples: (r) => {
      const n = int(r, 15, 60), k = int(r, 3, 7);
      return numQ("Conditionals", `count = 0\nfor i in range(1, ${n} + 1):\n    if i % ${k} == 0:\n        count += 1\nprint(count)`, Math.floor(n / k), 1, `Multiples of ${k} from 1 to ${n}: ${n} // ${k} = ${Math.floor(n / k)}.`);
    },
    listIndex: (r) => {
      const xs = Array.from({ length: 6 }, () => int(r, 1, 30)), i = int(r, 0, 3), j = int(r, 1, 3);
      const v = xs[i] + xs[xs.length - j];
      return numQ("Lists", `nums = ${list(xs)}\nprint(nums[${i}] + nums[-${j}])`, v, 3, `nums[${i}] = ${xs[i]} and nums[-${j}] = ${xs[xs.length - j]}, so ${v}.`);
    },
    stringSlice: (r, t) => {
      const w = WORDS[(t - 1) % WORDS.length], a = int(r, 0, 3), b = int(r, a + 2, Math.min(w.length, a + 5));
      const ans = w.slice(a, b);
      return { topic: "Strings", prompt: "What does this Python code print?", code: `s = "${w}"\nprint(s[${a}:${b}])`, answer: ans, wrong: uniq3(ans, [w.slice(a, b + 1), w.slice(a + 1, b + 1), w.slice(Math.max(0, a - 1), b), w.slice(a, b - 1)]), explanation: `s[${a}:${b}] takes indexes ${a} to ${b - 1}: "${ans}".` };
    },
    divMod: (r) => {
      const x = int(r, 20, 99), y = int(r, 3, 9);
      const ans = `${Math.floor(x / y)} ${x % y}`;
      return { topic: "Operators", prompt: "What does this Python code print?", code: `x = ${x}\ny = ${y}\nprint(x // y, x % y)`, answer: ans, wrong: uniq3(ans, [`${(x / y).toFixed(1)} ${x % y}`, `${Math.floor(x / y)} ${Math.floor(x / y)}`, `${x % y} ${Math.floor(x / y)}`, `${Math.floor(x / y) + 1} ${x % y}`]), explanation: `// is floor division (${Math.floor(x / y)}) and % is the remainder (${x % y}).` };
    },
    swapArith: (r) => {
      const x = int(r, 2, 40), y = int(r, 2, 40);
      return { topic: "Variables", prompt: "What does this Python code print?", code: `a, b = ${x}, ${y}\na = a + b\nb = a - b\na = a - b\nprint(a, b)`, answer: `${y} ${x}`, wrong: uniq3(`${y} ${x}`, [`${x} ${y}`, `${x + y} ${x}`, `${y} ${x + y}`, `${x + y} ${y}`]), explanation: "These three steps swap a and b without a temporary variable." };
    },
    whileHalve: (r) => {
      const n = int(r, 10, 200);
      let m = n, steps = 0;
      while (m > 1) { m = Math.floor(m / 2); steps++; }
      return numQ("Loops", `n = ${n}\nsteps = 0\nwhile n > 1:\n    n = n // 2\n    steps += 1\nprint(steps)`, steps, 1, `n is halved until it reaches 1: ${steps} steps.`);
    },
    maxLoop: (r) => {
      const xs = Array.from({ length: 6 }, () => int(r, 1, 99));
      return numQ("Lists", `nums = ${list(xs)}\nbest = nums[0]\nfor x in nums:\n    if x > best:\n        best = x\nprint(best)`, Math.max(...xs), 3, `The loop keeps the largest value seen: ${Math.max(...xs)}.`);
    },
    branches: (r) => {
      const x = int(r, 5, 60), t = int(r, 10, 40);
      const out = x % 2 === 0 && x > t ? "A" : x % 3 === 0 ? "B" : "C";
      return { topic: "Conditionals", prompt: "What does this Python code print?", code: `x = ${x}\nif x % 2 == 0 and x > ${t}:\n    print("A")\nelif x % 3 == 0:\n    print("B")\nelse:\n    print("C")`, answer: out, wrong: ["A", "B", "C", "Nothing is printed"].filter((o) => o !== out), explanation: `${x} % 2 = ${x % 2}, ${x} > ${t} is ${x > t ? "True" : "False"}, ${x} % 3 = ${x % 3}, so it prints ${out}.` };
    },
    evenSquares: (r) => {
      const n = int(r, 5, 9);
      const xs = [];
      for (let i = 0; i < n; i++) if (i % 2 === 0) xs.push(i * i);
      const ans = list(xs);
      return { topic: "Lists", prompt: "What does this Python code print?", code: `items = []\nfor i in range(${n}):\n    if i % 2 == 0:\n        items.append(i * i)\nprint(items)`, answer: ans, wrong: uniq3(ans, [list(xs.slice(1)), list([...xs, n * n]), list(xs.map((v, k) => (2 * k + 1) ** 2).filter((v) => Math.sqrt(v) < n)), list(xs.map((v) => Math.sqrt(v)))]), explanation: `Even i from 0 to ${n - 1}, squared: ${ans}.` };
    },
    strLenMul: (r, t) => {
      const w = WORDS[(t + 4) % WORDS.length], k = int(r, 2, 4);
      return numQ("Strings", `word = "${w}"\nprint(len(word) * ${k})`, w.length * k, k, `len("${w}") is ${w.length}; × ${k} = ${w.length * k}.`);
    },
    complexity: (r) => complexityQ("beginner", r),
  },

  intermediate: {
    nestedCount: (r) => {
      const n = int(r, 4, 12);
      return numQ("Nested loops", `count = 0\nfor i in range(${n}):\n    for j in range(i, ${n}):\n        count += 1\nprint(count)`, (n * (n + 1)) / 2, n, `Inner loop runs ${n}, ${n - 1}, …, 1 times: ${n}×${n + 1}/2 = ${(n * (n + 1)) / 2}.`);
    },
    factorial: (r) => {
      const k = int(r, 3, 7);
      return numQ("Recursion", `def f(n):\n    if n <= 1:\n        return 1\n    return n * f(n - 1)\n\nprint(f(${k}))`, fact(k), fact(k - 1), `f(${k}) = ${k}! = ${fact(k)}.`);
    },
    fibIter: (r) => {
      const n = int(r, 5, 14);
      let a = 0, b = 1;
      for (let i = 0; i < n; i++) [a, b] = [b, a + b];
      return numQ("Loops", `a, b = 0, 1\nfor _ in range(${n}):\n    a, b = b, a + b\nprint(a)`, a, Math.max(1, b - a), `After ${n} steps a is the ${n}th Fibonacci number: ${a}.`);
    },
    reverse: (r, t) => {
      const w = WORDS[(t - 1) % WORDS.length].toLowerCase();
      const ans = [...w].reverse().join("");
      return { topic: "Strings", prompt: "What does this Python code print?", code: `s = "${w}"\nprint(s[::-1])`, answer: ans, wrong: uniq3(ans, [w, ans.slice(1) + ans[0], w.slice(1) + w[0], [...w].reverse().join("").toUpperCase()]), explanation: "A step of −1 walks the string backwards, reversing it." };
    },
    dictCount: (r, t) => {
      const w = ["banana", "mississippi", "programming", "assessment", "committee", "successful", "parallel", "letter", "balloon", "coffee"][t - 1];
      const ch = pick(r, [...new Set(w)].filter((c) => w.split(c).length > 2));
      const n = w.split(ch).length - 1;
      return numQ("Dictionaries", `text = "${w}"\ncounts = {}\nfor ch in text:\n    counts[ch] = counts.get(ch, 0) + 1\nprint(counts["${ch}"])`, n, 1, `"${ch}" appears ${n} times in "${w}".`);
    },
    comprehension: (r) => {
      const a = int(r, 1, 4), b = int(r, a + 4, a + 8);
      const xs = [];
      for (let x = a; x < b; x++) if (x % 2 === 1) xs.push(x * x);
      const ans = list(xs);
      return { topic: "List comprehension", prompt: "What does this Python code print?", code: `print([x * x for x in range(${a}, ${b}) if x % 2 == 1])`, answer: ans, wrong: uniq3(ans, [list(xs.slice(0, -1)), list(xs.map((v) => Math.sqrt(v))), list(Array.from({ length: b - a }, (_, k) => a + k).filter((x) => x % 2 === 0).map((x) => x * x)), list([...xs, b * b])]), explanation: `Odd x in ${a}…${b - 1}, squared: ${ans}.` };
    },
    stack: (r) => {
      const xs = Array.from({ length: 5 }, () => int(r, 1, 50));
      const pops = int(r, 1, 3);
      const ans = xs[xs.length - 1 - pops];
      return { topic: "Stacks", prompt: "What does this Python code print?", code: `stack = []\nfor x in ${list(xs)}:\n    stack.append(x)\n${"stack.pop()\n".repeat(pops)}print(stack[-1])`, answer: String(ans), wrong: uniq3(ans, [xs[xs.length - pops], xs[0], xs[pops], xs[xs.length - 1]]).concat(["None"]).slice(0, 3), explanation: `A stack is LIFO: popping ${pops} item${pops > 1 ? "s" : ""} leaves ${ans} on top.` };
    },
    digitSum: (r) => {
      const n = int(r, 1000, 99999);
      const s = String(n).split("").reduce((a, d) => a + +d, 0);
      return numQ("Loops", `n = ${n}\ns = 0\nwhile n > 0:\n    s += n % 10\n    n //= 10\nprint(s)`, s, 2, `The loop adds the digits of ${n}: ${s}.`);
    },
    gcdFn: (r) => {
      const g = int(r, 2, 12), x = g * int(r, 2, 9), y = g * int(r, 2, 9);
      const real = ((a, b) => { while (b) [a, b] = [b, a % b]; return a; })(x, y);
      return numQ("Functions", `def g(a, b):\n    while b:\n        a, b = b, a % b\n    return a\n\nprint(g(${x}, ${y}))`, real, Math.max(1, Math.floor(real / 2)), `Euclid's algorithm returns the GCD of ${x} and ${y}: ${real}.`);
    },
    splitJoin: (r) => {
      const ws = shuffle(r, ["red", "blue", "green", "black", "white", "gold"]).slice(0, 3);
      const ans = [...ws].reverse().join("-");
      return { topic: "Strings", prompt: "What does this Python code print?", code: `words = "${ws.join(" ")}".split()\nprint("-".join(words[::-1]))`, answer: ans, wrong: uniq3(ans, [ws.join("-"), [...ws].reverse().join(" "), ws.join(""), `${ws[2]}-${ws[0]}-${ws[1]}`]), explanation: `split() gives ${list(ws.map((w) => `'${w}'`))}; reversed and joined with "-": ${ans}.` };
    },
    sortedSlice: (r) => {
      const xs = shuffle(r, Array.from({ length: 30 }, (_, k) => k + 1)).slice(0, 6);
      const sorted = [...xs].sort((a, b) => a - b);
      const ans = list(sorted.slice(1, 3));
      return { topic: "Sorting", prompt: "What does this Python code print?", code: `nums = ${list(xs)}\nprint(sorted(nums)[1:3])`, answer: ans, wrong: uniq3(ans, [list(sorted.slice(0, 2)), list(xs.slice(1, 3)), list(sorted.slice(1, 4)), list(sorted.slice(2, 4))]), explanation: `sorted(nums) = ${list(sorted)}; [1:3] takes indexes 1 and 2: ${ans}.` };
    },
    complexity: (r) => complexityQ("intermediate", r),
  },

  advanced: {
    fastPow: (r) => {
      const b = int(r, 2, 5), e = int(r, 3, 9);
      return numQ("Recursion", `def p(b, e):\n    if e == 0:\n        return 1\n    half = p(b, e // 2)\n    return half * half if e % 2 == 0 else half * half * b\n\nprint(p(${b}, ${e}))`, b ** e, b ** (e - 1), `Fast exponentiation computes ${b}^${e} = ${b ** e}.`);
    },
    fibCalls: (r) => {
      const k = int(r, 3, 8);
      const calls = (n) => (n < 2 ? 1 : 1 + calls(n - 1) + calls(n - 2));
      return numQ("Recursion", `calls = 0\n\ndef fib(n):\n    global calls\n    calls += 1\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nfib(${k})\nprint(calls)`, calls(k), 2, `Naive recursion calls fib ${calls(k)} times for n = ${k} (calls(n) = 1 + calls(n−1) + calls(n−2)).`);
    },
    bubbleSwaps: (r) => {
      const xs = shuffle(r, Array.from({ length: 9 }, (_, k) => k + 1)).slice(0, 6);
      let inv = 0;
      for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) if (xs[i] > xs[j]) inv++;
      return numQ("Sorting", `nums = ${list(xs)}\nswaps = 0\nfor i in range(len(nums)):\n    for j in range(len(nums) - 1 - i):\n        if nums[j] > nums[j + 1]:\n            nums[j], nums[j + 1] = nums[j + 1], nums[j]\n            swaps += 1\nprint(swaps)`, inv, 2, `Bubble sort makes one swap per inversion; this list has ${inv} inversions.`);
    },
    binarySteps: (r) => {
      const n = int(r, 15, 100), target = int(r, 0, n - 1);
      let lo = 0, hi = n - 1, steps = 0;
      while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); steps++; if (mid === target) break; else if (mid < target) lo = mid + 1; else hi = mid - 1; }
      return numQ("Searching", `lo, hi, steps = 0, ${n} - 1, 0\ntarget = ${target}\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    steps += 1\n    if mid == target:\n        break\n    elif mid < target:\n        lo = mid + 1\n    else:\n        hi = mid - 1\nprint(steps)`, steps, 1, `Binary search over 0…${n - 1} finds ${target} after ${steps} comparison${steps > 1 ? "s" : ""}.`);
    },
    diagonals: (r) => {
      const m = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => int(r, 1, 9)));
      const d1 = m[0][0] + m[1][1] + m[2][2], d2 = m[0][2] + m[1][1] + m[2][0];
      return numQ("2D lists", `m = [${m.map(list).join(", ")}]\nmain = sum(m[i][i] for i in range(3))\nanti = sum(m[i][2 - i] for i in range(3))\nprint(main - anti)`, d1 - d2, 2, `Main diagonal ${d1} − anti-diagonal ${d2} = ${d1 - d2}.`);
    },
    bitOps: (r) => {
      const a = int(r, 5, 31), b = int(r, 5, 31);
      const ans = `${a & b} ${a | b} ${a ^ b}`;
      return { topic: "Bit manipulation", prompt: "What does this Python code print?", code: `a, b = ${a}, ${b}\nprint(a & b, a | b, a ^ b)`, answer: ans, wrong: uniq3(ans, [`${a | b} ${a & b} ${a ^ b}`, `${a & b} ${a ^ b} ${a | b}`, `${a + b} ${a | b} ${a ^ b}`, `${a & b} ${a | b} ${Math.abs(a - b)}`]), explanation: `${a} = ${a.toString(2)}₂ and ${b} = ${b.toString(2)}₂: AND ${a & b}, OR ${a | b}, XOR ${a ^ b}.` };
    },
    bfsOrder: (r) => {
      const nodes = ["A", "B", "C", "D", "E", "F"];
      const g = { A: shuffle(r, ["B", "C"]), B: shuffle(r, ["D", "E"]), C: ["F"], D: [], E: ["F"], F: [] };
      const order = [], seen = new Set(["A"]), q = ["A"];
      while (q.length) { const v = q.shift(); order.push(v); for (const w of g[v]) if (!seen.has(w)) { seen.add(w); q.push(w); } }
      const dfs = [], seen2 = new Set();
      const go = (v) => { seen2.add(v); dfs.push(v); for (const w of g[v]) if (!seen2.has(w)) go(w); };
      go("A");
      const fmt = (xs) => list(xs.map((x) => `'${x}'`));
      return { topic: "Graphs (BFS)", prompt: "What does this Python code print?", code: `from collections import deque\ngraph = {${nodes.map((n) => `'${n}': ${fmt(g[n])}`).join(", ")}}\norder, seen, q = [], {'A'}, deque(['A'])\nwhile q:\n    v = q.popleft()\n    order.append(v)\n    for w in graph[v]:\n        if w not in seen:\n            seen.add(w)\n            q.append(w)\nprint(order)`, answer: fmt(order), wrong: uniq3(fmt(order), [fmt(dfs), fmt(["A", ...[...order.slice(1)].reverse()]), fmt(nodes), fmt([order[0], order[2], order[1], ...order.slice(3)])]), explanation: `BFS visits level by level from A: ${order.join(" → ")}.` };
    },
    compress: (r, t) => {
      const s = ["aaabbc", "aabcccd", "abbbccaa", "zzzyyx", "kkkkmmn", "ppqqqrr", "aabbbbc", "xxyyyzzz", "mmmnnoop", "ttuuuvw"][t - 1];
      let out = "";
      for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i]) j++; out += s[i] + (j - i); i = j; }
      return { topic: "Strings", prompt: "What does this Python code print?", code: `s = "${s}"\nout, i = "", 0\nwhile i < len(s):\n    j = i\n    while j < len(s) and s[j] == s[i]:\n        j += 1\n    out += s[i] + str(j - i)\n    i = j\nprint(out)`, answer: out, wrong: uniq3(out, [out.replace(/1/g, ""), [...new Set(s)].join(""), out.replace(/(\D)(\d)/g, "$2$1"), s]), explanation: `Run-length encoding: each run of a character becomes the character followed by its count: ${out}.` };
    },
    sortKey: (r) => {
      const ps = Array.from({ length: 4 }, () => [int(r, 1, 9), int(r, 1, 5)]);
      const sorted = [...ps].sort((p, q) => p[1] - q[1] || p[0] - q[0]);
      const tup = (p) => `(${p[0]}, ${p[1]})`;
      return { topic: "Sorting", prompt: "What does this Python code print?", code: `pairs = [${ps.map(tup).join(", ")}]\npairs.sort(key=lambda p: (p[1], p[0]))\nprint(pairs[0])`, answer: tup(sorted[0]), wrong: uniq3(tup(sorted[0]), [tup([...ps].sort((p, q) => p[0] - q[0] || p[1] - q[1])[0]), tup(ps[0]), tup(sorted[sorted.length - 1]), tup([sorted[0][1], sorted[0][0]]), tup(sorted[1]), tup(sorted[2]), tup([sorted[0][0] + 1, sorted[0][1]])]), explanation: `Sorted by the second value, then the first: the first pair is ${tup(sorted[0])}.` };
    },
    generator: (r) => {
      const n = int(r, 10, 40);
      let s = 0;
      for (let i = 0; i < n; i++) if (i % 3 === 0) s += i;
      return numQ("Generators", `def gen(n):\n    for i in range(n):\n        if i % 3 == 0:\n            yield i\n\nprint(sum(gen(${n})))`, s, 3, `The generator yields multiples of 3 below ${n}; their sum is ${s}.`);
    },
    complexity: (r) => complexityQ("advanced", r),
  },
};

const buildCodingTest = (stage, testNo) => {
  const r = rngFor(5000 + ["beginner", "intermediate", "advanced"].indexOf(stage) * 1000 + testNo * 53);
  const names = shuffle(r, Object.keys(TEMPLATES[stage])).slice(0, 10);
  return names.map((name) => {
    const q = TEMPLATES[stage][name](r, testNo);
    const options = shuffle(r, [q.answer, ...q.wrong.slice(0, 3)]);
    return { topic: q.topic, prompt: q.prompt, code: q.code || "", options, correctIndex: options.indexOf(q.answer), explanation: q.explanation };
  });
};

module.exports = { buildCodingTest };

/** All 300 questions with their location, for verification scripts. */
const allCodingQuestions = () =>
  ["beginner", "intermediate", "advanced"].flatMap((stage) =>
    Array.from({ length: 10 }, (_, i) => buildCodingTest(stage, i + 1).map((q) => ({ ...q, where: `${stage} T${i + 1}` }))).flat()
  );
module.exports.allCodingQuestions = allCodingQuestions;
