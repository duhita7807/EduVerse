/**
 * Built-in questions for the practice rounds, used when the AI service is
 * unavailable. Each open-ended question carries `keyPoints`: what a good
 * answer must mention. Synonyms are separated by "|" and matched
 * case-insensitively (see assessmentService.keywordGrade). `idealAnswer` is
 * shown after submission.
 */

const CODING = {
  beginner: [
    {
      topic: "Strings",
      prompt:
        "Write a function that checks whether a string is a palindrome, ignoring case and non-alphanumeric characters.\nInput: \"A man, a plan, a canal: Panama\"  Output: true",
      keyPoints: ["lower|tolower|casefold|upper", "isalnum|alphanumeric|regex|replace|filter", "two pointer|left|right|reverse|[::-1]", "return"],
      idealAnswer:
        "Normalise the string (lower-case, keep only letters/digits), then compare it with its reverse, or walk two pointers inwards from both ends. O(n) time.\n\ndef is_pal(s):\n    t = [c.lower() for c in s if c.isalnum()]\n    return t == t[::-1]",
    },
    {
      topic: "Arrays",
      prompt: "Given an array of integers, return the largest and the second-largest distinct values.\nInput: [4, 9, 2, 9, 7]  Output: 9, 7",
      keyPoints: ["loop|for|while|iterate", "max|largest|first", "second", "distinct|!=|duplicate|equal"],
      idealAnswer:
        "Single pass keeping `first` and `second`. When a value beats `first`, shift first into second; otherwise update `second` if the value is smaller than first but bigger than second (skip duplicates of first). O(n) time, O(1) space.",
    },
  ],
  intermediate: [
    {
      topic: "Hashing",
      prompt: "Two Sum: given an array and a target, return the indices of the two numbers that add up to the target.\nInput: [2, 7, 11, 15], target 9  Output: [0, 1]",
      keyPoints: ["hash|map|dict|object|set", "complement|target -|target-", "o(n)|linear|single pass|one pass", "index|indices|return"],
      idealAnswer:
        "Store each value's index in a hash map. For each element x, check whether target - x is already in the map; if so return both indices. One pass, O(n) time and O(n) space, instead of the O(n²) double loop.",
    },
    {
      topic: "Stacks",
      prompt: "Check whether a string of brackets '()[]{}' is balanced.\nInput: \"{[()]}\"  Output: true    Input: \"([)]\"  Output: false",
      keyPoints: ["stack|push|pop|append", "matching|pair|map|dict", "empty", "o(n)|linear"],
      idealAnswer:
        "Push every opening bracket on a stack. For a closing bracket, the stack must be non-empty and its top must be the matching opener; pop it. At the end the stack must be empty. O(n) time, O(n) space.",
    },
  ],
  advanced: [
    {
      topic: "Sliding window",
      prompt: "Find the length of the longest substring without repeating characters.\nInput: \"abcabcbb\"  Output: 3 (\"abc\")",
      keyPoints: ["sliding window|window|two pointer|left|start", "hash|map|set|dict|last seen", "max|longest", "o(n)|linear"],
      idealAnswer:
        "Sliding window: move `right` across the string, store each character's last index in a map; when a character repeats inside the window, move `left` to lastIndex + 1. Track the maximum window size. O(n) time, O(min(n, alphabet)) space.",
    },
    {
      topic: "Graphs",
      prompt: "Given a grid of '1' (land) and '0' (water), count the number of islands (groups of land connected up/down/left/right).",
      keyPoints: ["dfs|bfs|depth|breadth|queue|recurs", "visited|mark|sink|set to 0", "neighbo|4 direction|up|adjacent", "count|islands", "o(m*n)|o(rows|o(r*c)|o(n*m)|each cell"],
      idealAnswer:
        "Scan every cell; when you find unvisited land, increment the count and flood-fill (DFS or BFS) from it, marking all connected land as visited so it is not counted again. Each cell is visited once: O(rows × cols) time.",
    },
  ],
};

/** Branch families; matched against the student's branch text. */
const BRANCH_GROUPS = [
  { id: "mechanical", test: /mech|automobile|production|manufactur/i },
  { id: "civil", test: /civil|construction|structural/i },
  { id: "chemical", test: /chem|petro|process/i },
  { id: "electrical", test: /electr|e&tc|entc|telecom|eee|ece|instrument/i },
  { id: "cs", test: /(?:)/ }, // CS/IT/AI/Data Science and anything else (incl. blank)
];
const branchGroup = (branch = "") => BRANCH_GROUPS.find((g) => g.test.test(branch)).id;

const TECHNICAL = {
  cs: {
    beginner: [
      { topic: "OOP", prompt: "Explain the four pillars of object-oriented programming with an example.", keyPoints: ["encapsulation", "inheritance", "polymorphism", "abstraction", "example|e.g|for instance|class"], idealAnswer: "Encapsulation (bundling data with methods and hiding internals), inheritance (a class reusing another's behaviour), polymorphism (one interface, many implementations, e.g. method overriding) and abstraction (exposing only what matters). Example: a Shape base class with area() overridden by Circle and Square." },
      { topic: "DBMS", prompt: "What is the difference between a primary key and a foreign key?", keyPoints: ["unique", "null", "references|refer|another table|relationship", "integrity"], idealAnswer: "A primary key uniquely identifies each row and cannot be NULL. A foreign key is a column that references the primary key of another table, enforcing referential integrity between the two tables." },
      { topic: "Data structures", prompt: "Compare an array and a linked list. When would you use each?", keyPoints: ["contiguous|index|random access|o(1)", "insert|delete", "pointer|node|next", "memory|size|resize"], idealAnswer: "Arrays are contiguous: O(1) index access but costly inserts/deletes in the middle and fixed or amortised resizing. Linked lists use nodes with pointers: O(1) insert/delete at a known node but O(n) access. Use arrays for frequent reads, lists for frequent insertions." },
    ],
    intermediate: [
      { topic: "Operating systems", prompt: "What is a deadlock? State the four necessary conditions and one way to prevent it.", keyPoints: ["mutual exclusion", "hold and wait|hold & wait", "no preemption|non-preemption", "circular wait", "prevent|avoid|order|banker"], idealAnswer: "A deadlock is when processes wait on each other forever. All four must hold: mutual exclusion, hold and wait, no preemption, circular wait. Prevent it by breaking one, e.g. acquire resources in a fixed global order to remove circular wait (or use the Banker's algorithm to avoid unsafe states)." },
      { topic: "DBMS", prompt: "Explain normalization up to 3NF with a short example.", keyPoints: ["1nf|atomic", "2nf|partial dependency", "3nf|transitive", "redundan|anomal"], idealAnswer: "Normalization removes redundancy and update anomalies. 1NF: atomic values, no repeating groups. 2NF: no partial dependency of non-key columns on part of a composite key. 3NF: no transitive dependency (non-key depending on non-key). Example: move a student's department name into a separate Department table keyed by dept_id." },
      { topic: "Web", prompt: "What happens when you type a URL into a browser and press Enter?", keyPoints: ["dns", "tcp|handshake", "tls|https|ssl", "http request|get request|request", "render|html|dom"], idealAnswer: "The browser resolves the domain via DNS, opens a TCP connection (plus a TLS handshake for HTTPS), sends an HTTP GET request, the server responds with HTML, and the browser parses it, fetches CSS/JS/images and renders the DOM." },
    ],
    advanced: [
      { topic: "System design", prompt: "How would you design a URL shortener like bit.ly? Cover storage, ID generation and scaling.", keyPoints: ["hash|base62|base 62|id generat|counter", "database|db|key-value|store", "cache|redis", "redirect|301|302", "scal|shard|load balanc|replica"], idealAnswer: "Generate a short code with a base62-encoded counter or hash, store code→URL in a key-value store, serve redirects (301/302) from a cache such as Redis for hot links, and scale reads with replicas, writes with sharding by code, behind a load balancer. Handle collisions and expiry." },
      { topic: "Concurrency", prompt: "Explain the difference between a process and a thread, and how race conditions are prevented.", keyPoints: ["memory|address space", "thread", "race condition|shared", "lock|mutex|semaphore|synchroni|atomic"], idealAnswer: "Processes have separate address spaces; threads share their process's memory, which makes them cheaper but exposes shared data. Race conditions occur when threads access shared state without coordination; prevent them with mutexes/locks, semaphores, atomic operations or immutable data." },
      { topic: "Algorithms", prompt: "Explain dynamic programming and when it applies, with an example.", keyPoints: ["overlapping subproblem", "optimal substructure", "memo|tabulat|cache|table", "example|fibonacci|knapsack|lcs"], idealAnswer: "DP applies when a problem has overlapping subproblems and optimal substructure. Store sub-results (memoization top-down or tabulation bottom-up) to avoid recomputation, e.g. 0/1 knapsack or Fibonacci in O(n) instead of O(2ⁿ)." },
    ],
  },
  mechanical: {
    beginner: [
      { topic: "Thermodynamics", prompt: "State the first and second laws of thermodynamics.", keyPoints: ["energy|conserv", "heat|work", "entropy", "100%|completely|cannot convert|irreversib|cold to hot"], idealAnswer: "First law: energy is conserved; heat supplied equals the change in internal energy plus work done. Second law: entropy of an isolated system never decreases, so no engine converts heat completely into work and heat does not flow from cold to hot on its own." },
      { topic: "Strength of materials", prompt: "What is the difference between stress and strain? Define Young's modulus.", keyPoints: ["force|load", "area", "deformation|change in length|elongation", "ratio|stress/strain|elastic"], idealAnswer: "Stress is internal force per unit area (σ = F/A); strain is deformation per unit original length (ε = ΔL/L, dimensionless). Young's modulus is stress divided by strain in the elastic region (E = σ/ε)." },
      { topic: "Manufacturing", prompt: "Differentiate between casting and forging.", keyPoints: ["molten|melt|mould|mold", "plastic deformation|hammer|press|forc", "strength|grain", "complex shape|intricate"], idealAnswer: "Casting pours molten metal into a mould, good for complex shapes but may contain porosity. Forging shapes solid metal by compressive force (hammer/press), producing aligned grain flow and higher strength, but limited shape complexity." },
    ],
    intermediate: [
      { topic: "IC engines", prompt: "Compare 2-stroke and 4-stroke engines.", keyPoints: ["power stroke|every revolution|two revolution", "efficien|fuel", "lubricat|oil", "valve|port"], idealAnswer: "A 4-stroke engine completes a power stroke every two crank revolutions using valves, giving better fuel efficiency and lower emissions. A 2-stroke delivers a power stroke every revolution using ports, so it is lighter and more powerful for its size but less efficient and mixes oil with fuel for lubrication." },
      { topic: "Heat transfer", prompt: "Explain the three modes of heat transfer with an example of each.", keyPoints: ["conduction", "convection", "radiation", "example|e.g"], idealAnswer: "Conduction through a solid by molecular contact (a heated rod), convection by fluid motion (boiling water, air cooling), and radiation by electromagnetic waves without a medium (sunlight)." },
      { topic: "Machine design", prompt: "What is factor of safety and why is it used?", keyPoints: ["ultimate|yield|failure", "working|allowable|design stress", "ratio", "uncertaint|variation|unknown"], idealAnswer: "Factor of safety = failure (ultimate or yield) stress ÷ working (allowable) stress. It covers uncertainties in loads, material properties, manufacturing defects and analysis assumptions." },
    ],
    advanced: [
      { topic: "Refrigeration", prompt: "Explain the vapour compression refrigeration cycle and define COP.", keyPoints: ["compressor", "condenser", "expansion", "evaporator", "cop|coefficient of performance"], idealAnswer: "Refrigerant is compressed to high pressure (compressor), rejects heat and condenses (condenser), drops pressure through an expansion valve, then absorbs heat and evaporates in the evaporator. COP = refrigerating effect ÷ work input." },
      { topic: "Vibrations", prompt: "What is resonance and how is it avoided in machine design?", keyPoints: ["natural frequency", "forcing|excitation|operating frequency", "amplitude", "damping|stiffness|mass|isolat"], idealAnswer: "Resonance occurs when the forcing frequency matches a natural frequency, causing large amplitudes. Avoid it by shifting natural frequency (change stiffness or mass), adding damping, or using vibration isolators, keeping operating speed away from critical speeds." },
      { topic: "Industrial engineering", prompt: "Explain lean manufacturing and name the types of waste it targets.", keyPoints: ["waste|muda", "inventory", "overproduction", "waiting|transport|motion|defect", "continuous improvement|kaizen|value"], idealAnswer: "Lean maximises customer value by eliminating waste (muda): overproduction, waiting, transport, over-processing, inventory, motion and defects, through continuous improvement (kaizen), JIT and standard work." },
    ],
  },
  civil: {
    beginner: [
      { topic: "Concrete", prompt: "What is the water-cement ratio and why is it important?", keyPoints: ["water", "cement", "strength", "workab|durab"], idealAnswer: "It is the weight ratio of water to cement in a mix. A lower ratio gives higher strength and durability; too low reduces workability, so admixtures are used to balance them." },
      { topic: "Surveying", prompt: "What is the difference between plane and geodetic surveying?", keyPoints: ["curvature|curved", "small area|small", "large area|large", "earth"], idealAnswer: "Plane surveying ignores the earth's curvature and suits small areas; geodetic surveying accounts for curvature and is used for large areas such as national mapping." },
      { topic: "Building materials", prompt: "What are the main tests done on bricks?", keyPoints: ["compressive|strength", "water absorption|absorption", "efflorescence", "dimension|hardness|soundness"], idealAnswer: "Compressive strength, water absorption, efflorescence, dimensional tolerance, hardness and soundness tests." },
    ],
    intermediate: [
      { topic: "Structures", prompt: "Explain bending moment and shear force in a simply supported beam with a central point load.", keyPoints: ["wl/4|pl/4|maximum at centre|mid", "shear", "w/2|p/2|reaction", "zero"], idealAnswer: "Each support reacts W/2. Shear force is +W/2 left of the load and −W/2 right of it, changing sign at mid-span. Bending moment is zero at supports and maximum WL/4 at the centre, where shear changes sign." },
      { topic: "Geotechnical", prompt: "What is the difference between consolidation and compaction of soil?", keyPoints: ["water|pore", "air", "time|gradual|long", "mechanical|rolling|load|dynamic"], idealAnswer: "Compaction expels air by mechanical means quickly; consolidation expels pore water gradually under sustained load, often over months or years in clays." },
      { topic: "RCC", prompt: "Why is steel used as reinforcement in concrete?", keyPoints: ["tension|tensile", "compression", "thermal|expansion", "bond"], idealAnswer: "Concrete is strong in compression but weak in tension; steel carries the tension. They have similar thermal expansion coefficients and bond well, so they act together." },
    ],
    advanced: [
      { topic: "Design", prompt: "Compare limit state method and working stress method of design.", keyPoints: ["partial safety|load factor|factored", "serviceability", "collapse|ultimate", "elastic|permissible"], idealAnswer: "Working stress keeps stresses within permissible elastic limits using a single factor of safety. Limit state design uses partial safety factors on loads and materials and checks both the ultimate (collapse) and serviceability (deflection, cracking) limit states, giving more economical, realistic designs." },
      { topic: "Transportation", prompt: "Compare flexible and rigid pavements.", keyPoints: ["bitumen|asphalt", "concrete", "load distribut|grain to grain|slab action", "maintenance|life|cost"], idealAnswer: "Flexible (bituminous) pavements spread load grain-to-grain through layers, are cheaper initially but need more maintenance. Rigid (concrete) pavements distribute load by slab action, last longer with low maintenance but cost more initially." },
      { topic: "Hydraulics", prompt: "State Bernoulli's equation and its assumptions.", keyPoints: ["pressure", "velocity|kinetic", "elevation|datum|potential", "incompressible|steady|non-viscous|inviscid|streamline"], idealAnswer: "Along a streamline, p/ρg + v²/2g + z is constant. Assumes steady, incompressible, non-viscous flow along a streamline." },
    ],
  },
  electrical: {
    beginner: [
      { topic: "Circuits", prompt: "State Ohm's law and Kirchhoff's current and voltage laws.", keyPoints: ["v = ir|v=ir|v=i*r|voltage", "current law|kcl|node|junction", "voltage law|kvl|loop", "sum|zero"], idealAnswer: "Ohm's law: V = IR. KCL: the algebraic sum of currents at a node is zero. KVL: the algebraic sum of voltages around a closed loop is zero." },
      { topic: "Electronics", prompt: "What is a diode and how does it work in forward and reverse bias?", keyPoints: ["p-n|pn junction", "forward", "reverse", "depletion|barrier", "one direction|rectif"], idealAnswer: "A diode is a p-n junction that conducts mainly in one direction. Forward bias narrows the depletion region so current flows once the barrier voltage (~0.7 V for Si) is crossed; reverse bias widens it, allowing only tiny leakage until breakdown." },
      { topic: "Digital", prompt: "Explain universal gates and why NAND is called universal.", keyPoints: ["nand", "nor", "any|all|implement", "and|or|not"], idealAnswer: "NAND and NOR are universal because any Boolean function (AND, OR, NOT and therefore every circuit) can be built using only one of them." },
    ],
    intermediate: [
      { topic: "Machines", prompt: "Explain the working principle of a transformer and the types of losses.", keyPoints: ["mutual induction|faraday|electromagnetic induction", "core loss|iron loss|hysteresis|eddy", "copper loss|i2r|i²r", "ac|alternating"], idealAnswer: "A transformer works on mutual (electromagnetic) induction: alternating flux from the primary induces EMF in the secondary. Losses: iron/core losses (hysteresis and eddy current) and copper (I²R) losses in the windings." },
      { topic: "Communication", prompt: "Compare AM and FM modulation.", keyPoints: ["amplitude", "frequency", "noise", "bandwidth"], idealAnswer: "AM varies the carrier amplitude; FM varies the carrier frequency. FM is far more noise-immune with better quality but needs more bandwidth; AM is simpler and has longer range." },
      { topic: "Microcontrollers", prompt: "Difference between a microprocessor and a microcontroller?", keyPoints: ["ram|rom|memory", "peripheral|i/o|timer", "chip|single", "embedded|application"], idealAnswer: "A microprocessor is a CPU needing external memory and peripherals, suited to general computing. A microcontroller integrates CPU, RAM, ROM, timers and I/O on one chip for embedded control applications." },
    ],
    advanced: [
      { topic: "Power systems", prompt: "Why is power transmitted at high voltage?", keyPoints: ["current", "i2r|i²r|loss", "conductor|cost|copper", "efficien"], idealAnswer: "For the same power, higher voltage means lower current, so I²R losses fall sharply and thinner, cheaper conductors can be used, improving efficiency." },
      { topic: "Control systems", prompt: "Explain open-loop vs closed-loop control and the effect of feedback.", keyPoints: ["feedback", "error", "stabil|accura", "disturbance|sensitiv"], idealAnswer: "Open-loop control acts without measuring output; closed-loop control feeds the output back, computes the error and corrects it. Feedback improves accuracy and disturbance rejection and reduces sensitivity to parameter changes, but can cause instability if poorly tuned." },
      { topic: "Signals", prompt: "State the sampling theorem and what aliasing is.", keyPoints: ["nyquist", "twice|2 times|2x|2fm", "aliasing|overlap", "anti-aliasing|low pass|filter"], idealAnswer: "A band-limited signal can be reconstructed if sampled at least twice its highest frequency (Nyquist rate). Sampling slower causes aliasing, where high frequencies fold into low ones; prevent it with an anti-aliasing low-pass filter." },
    ],
  },
  chemical: {
    beginner: [
      { topic: "Unit operations", prompt: "What is distillation and on what principle does it work?", keyPoints: ["boiling point|volatil", "separat", "vapour|vapor", "condens"], idealAnswer: "Distillation separates liquid mixtures based on differences in volatility (boiling points): the more volatile component vaporises, is condensed and collected." },
      { topic: "Fluid mechanics", prompt: "Differentiate between laminar and turbulent flow.", keyPoints: ["reynolds", "2000|2100|4000", "layer|smooth|parallel", "eddies|chaotic|mixing"], idealAnswer: "Laminar flow moves in smooth parallel layers (Re < ~2100 in pipes); turbulent flow is chaotic with eddies and strong mixing (Re > ~4000). The Reynolds number decides the regime." },
      { topic: "Thermodynamics", prompt: "What is the difference between an exothermic and an endothermic reaction?", keyPoints: ["release|gives out", "absorb", "heat|energy", "enthalpy|δh|delta h"], idealAnswer: "Exothermic reactions release heat (ΔH < 0), endothermic reactions absorb heat (ΔH > 0)." },
    ],
    intermediate: [
      { topic: "Reaction engineering", prompt: "Compare a CSTR and a plug flow reactor.", keyPoints: ["mix|uniform", "conversion", "volume|size", "residence time|space time"], idealAnswer: "A CSTR is perfectly mixed so outlet equals tank composition; a PFR has no axial mixing so concentration changes along its length. For positive-order reactions a PFR reaches the same conversion with a smaller volume." },
      { topic: "Heat transfer", prompt: "Why is a counter-current heat exchanger more efficient than co-current?", keyPoints: ["temperature difference|lmtd|driving force", "opposite", "outlet|exit", "area"], idealAnswer: "In counter-current flow the fluids move in opposite directions, keeping a larger, more uniform temperature difference (higher LMTD) along the length, so more heat is transferred per unit area and the cold outlet can exceed the hot outlet temperature." },
      { topic: "Mass transfer", prompt: "State Fick's law of diffusion.", keyPoints: ["flux", "concentration gradient|gradient", "diffusivity|diffusion coefficient", "proportional"], idealAnswer: "The diffusive flux is proportional to the negative concentration gradient: J = −D·dC/dx, where D is the diffusivity." },
    ],
    advanced: [
      { topic: "Process control", prompt: "Explain P, PI and PID control actions.", keyPoints: ["proportional", "integral|offset", "derivative|rate", "overshoot|stabil|response"], idealAnswer: "P action responds proportionally to error but leaves an offset; I action integrates error to remove the offset; D action reacts to the rate of change, reducing overshoot and improving stability. PID combines all three." },
      { topic: "Safety", prompt: "What is HAZOP and how is it conducted?", keyPoints: ["hazard", "guide word|no|more|less", "deviation", "team|node|p&id"], idealAnswer: "HAZOP (Hazard and Operability study) is a systematic team review of a process (node by node on P&IDs) applying guide words (no, more, less, reverse...) to parameters to find deviations, their causes, consequences and safeguards." },
      { topic: "Plant design", prompt: "How would you scale up a process from lab to plant?", keyPoints: ["pilot", "heat transfer|mixing|mass transfer", "dimensionless|similarity|reynolds", "safety|cost|economic"], idealAnswer: "Move lab → pilot plant → full scale, keeping key dimensionless groups (Reynolds, Nusselt, power number) similar, re-checking heat removal, mixing and mass transfer limits that change with size, alongside safety studies and cost/economic analysis." },
    ],
  },
};

const HR_KEYPOINTS = {
  Introduction: ["degree|engineering|student|branch|college", "project", "skill", "internship|experience|worked", "goal|aim|looking for|interested"],
  Motivation: ["company|organisation|organization", "role|position", "skill|contribute|value", "learn|grow|career"],
  "Strengths & weaknesses": ["strength", "weakness", "example|for instance|when i", "improv|working on|learning"],
  Teamwork: ["team", "situation|when|project", "disagree|conflict", "listen|discuss|communicat", "result|outcome|learned"],
  Challenge: ["problem|challenge", "approach|steps|analy", "action|i did|i implemented|i built", "result|outcome|learned"],
  Goals: ["five years|5 years|future", "skill|expertise", "role|position|lead", "company|organisation|growth"],
};

module.exports = { CODING, TECHNICAL, HR_KEYPOINTS, branchGroup };
