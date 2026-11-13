/**
 * Role → required skill set, used by skillGapService.js.
 * Skill names are matched case-insensitively against the student's
 * combined skills list (skills.* + project technologies + GitHub languages).
 *
 * Roles are grouped by branch below (BRANCH_ROLE_GROUPS) purely for
 * organization and for powering branch-aware recommendations — every role
 * still lives in this one flat CAREER_ROLES object, and analyzeSkillGap()
 * will happily score a student against ANY role here regardless of their
 * own branch (a Mechanical student curious about Data Analyst can still
 * select it directly). The branch grouping only affects which roles are
 * surfaced by DEFAULT in Career Insights / the role dropdown.
 *
 * Add a new role by adding a new key here and listing it under the
 * relevant branch group(s) below — no controller changes needed.
 */
const CAREER_ROLES = {
  // ---- Computer Science / IT / Software -----------------------------
  "Full Stack Developer": [
    "HTML", "CSS", "JavaScript", "React", "Node.js", "Express.js", "MongoDB", "REST API", "Git", "GitHub",
  ],
  "Frontend Developer": [
    "HTML", "CSS", "JavaScript", "React", "Responsive Design", "Git", "REST API", "TypeScript",
  ],
  "Backend Developer": [
    "Node.js", "Express.js", "REST API", "MongoDB", "SQL", "Authentication", "Git", "API Design",
  ],
  "Java Developer": [
    "Java", "OOP", "Spring Boot", "SQL", "REST API", "Git", "Data Structures", "Multithreading",
  ],
  "Python Developer": [
    "Python", "Django", "Flask", "REST API", "SQL", "Git", "OOP", "Unit Testing",
  ],
  "Cloud/DevOps Engineer": [
    "Linux", "Docker", "Kubernetes", "CI/CD", "AWS", "Git", "Networking Basics", "Scripting",
  ],

  // ---- Data / AI / ML (CSE - Data Science, CSE - AI & ML, and IT) ----
  "Data Analyst": [
    "Python", "SQL", "Excel", "Pandas", "Data Visualization", "Statistics", "Power BI", "Tableau",
  ],
  "Data Scientist": [
    "Python", "NumPy", "Pandas", "Statistics", "Machine Learning", "SQL", "Data Visualization", "Scikit-learn",
  ],
  "Machine Learning Engineer": [
    "Python", "NumPy", "Pandas", "Matplotlib", "Scikit-learn", "Machine Learning", "Statistics", "SQL", "Git", "Model Evaluation",
  ],
  "Data Engineer": [
    "Python", "SQL", "ETL", "Data Pipelines", "Apache Spark", "Cloud Data Warehousing", "Git",
  ],
  "AI Engineer": [
    "Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "NLP", "Computer Vision",
  ],

  // ---- Mechanical Engineering -----------------------------------------
  "Mechanical Design Engineer": [
    "AutoCAD", "SolidWorks", "CATIA", "GD&T", "Machine Design", "Mechanical Drawing", "Material Science",
  ],
  "Manufacturing/Production Engineer": [
    "CAD/CAM", "Lean Manufacturing", "Six Sigma", "Quality Control", "Production Planning", "AutoCAD", "Industrial Engineering",
  ],
  "CAE/Simulation Engineer": [
    "ANSYS", "SolidWorks Simulation", "Finite Element Analysis", "CFD", "MATLAB", "Mechanical Design",
  ],
  "Automobile Engineer": [
    "Automotive Systems", "CATIA", "Vehicle Dynamics", "Engine Design", "AutoCAD", "Thermodynamics",
  ],
  "HVAC/Thermal Engineer": [
    "Thermodynamics", "HVAC Design", "Heat Transfer", "AutoCAD", "Refrigeration Systems",
  ],

  // ---- Civil Engineering ------------------------------------------------
  "Structural Design Engineer": [
    "AutoCAD", "STAAD.Pro", "ETABS", "Structural Analysis", "Concrete Design", "Steel Design",
  ],
  "Site/Construction Engineer": [
    "Construction Management", "AutoCAD", "Site Supervision", "Estimation & Costing", "Surveying", "Project Scheduling",
  ],
  "Geotechnical Engineer": [
    "Soil Mechanics", "Foundation Design", "Geotechnical Investigation", "AutoCAD", "STAAD.Pro",
  ],
  "BIM/Revit Engineer": [
    "Revit", "BIM", "AutoCAD", "3D Modeling", "Construction Documentation",
  ],

  // ---- Electrical Engineering --------------------------------------------
  "Electrical Design Engineer": [
    "AutoCAD Electrical", "Circuit Design", "MATLAB", "Power Systems", "Electrical Drawing", "PLC",
  ],
  "Power Systems Engineer": [
    "Power Systems Analysis", "MATLAB", "SCADA", "Transformers", "Power Electronics", "Protection Systems",
  ],
  "Control Systems Engineer": [
    "PLC", "SCADA", "MATLAB", "Control Theory", "Instrumentation", "Automation",
  ],

  // ---- Electronics & Telecommunication (ECE / E&TC) ----------------------
  "Embedded Systems Engineer": [
    "Embedded C", "Microcontrollers", "ARM", "RTOS", "PCB Design", "Circuit Design",
  ],
  "VLSI Design Engineer": [
    "VLSI", "Verilog", "VHDL", "Digital Design", "ASIC Design", "CMOS",
  ],
  "Electronics Design Engineer": [
    "PCB Design", "Circuit Design", "Embedded C", "Microcontrollers", "Signal Processing",
  ],
  "Telecom Network Engineer": [
    "Networking Basics", "Signal Processing", "Wireless Communication", "Telecommunication Protocols", "Linux",
  ],

  // ---- Chemical Engineering -------------------------------------------
  "Process Engineer": [
    "Process Simulation", "Aspen Plus", "Chemical Process Design", "Mass Transfer", "Heat Transfer", "P&ID",
  ],
  "Chemical Plant Engineer": [
    "Plant Operations", "Process Safety", "P&ID", "Process Simulation", "Quality Control",
  ],
  "Quality Control Engineer (Chemical)": [
    "Quality Control", "Process Safety", "Lab Analysis", "Six Sigma", "Chemical Process Design",
  ],
};

const SUPPORTED_ROLES = Object.keys(CAREER_ROLES);

/**
 * Branch groups, each with (a) keywords matched case-insensitively and
 * loosely (substring match) against a student's free-text `branch` field,
 * and (b) the list of CAREER_ROLES keys considered "core" to that branch.
 * Order matters: more specific groups (e.g. "CSE - Data Science") are
 * listed before the general CS group so they match first when a branch
 * string could plausibly match more than one group.
 */
const BRANCH_ROLE_GROUPS = [
  {
    group: "Data Science / AI & ML",
    keywords: ["data science", "artificial intelligence", "machine learning", " ai", "ai & ml", "ai-ml", "ai and ml"],
    roles: ["Data Scientist", "Machine Learning Engineer", "Data Analyst", "AI Engineer", "Data Engineer", "Backend Developer"],
  },
  {
    group: "Computer Science / Information Technology",
    keywords: ["computer", "information technology", " it", "software", "cse"],
    roles: ["Full Stack Developer", "Frontend Developer", "Backend Developer", "Java Developer", "Python Developer", "Cloud/DevOps Engineer", "Data Analyst"],
  },
  {
    group: "Mechanical Engineering",
    keywords: ["mechanical", "automobile", "automotive", "production engineering", "industrial engineering"],
    roles: ["Mechanical Design Engineer", "Manufacturing/Production Engineer", "CAE/Simulation Engineer", "Automobile Engineer", "HVAC/Thermal Engineer"],
  },
  {
    group: "Civil Engineering",
    keywords: ["civil", "construction", "structural"],
    roles: ["Structural Design Engineer", "Site/Construction Engineer", "Geotechnical Engineer", "BIM/Revit Engineer"],
  },
  {
    group: "Electrical Engineering",
    keywords: ["electrical"],
    roles: ["Electrical Design Engineer", "Power Systems Engineer", "Control Systems Engineer"],
  },
  {
    group: "Electronics & Telecommunication",
    keywords: ["electronics", "telecommunication", "e&tc", "etc engineering", "ece", "instrumentation"],
    roles: ["Embedded Systems Engineer", "VLSI Design Engineer", "Electronics Design Engineer", "Telecom Network Engineer"],
  },
  {
    group: "Chemical Engineering",
    keywords: ["chemical", "petrochemical", "polymer"],
    roles: ["Process Engineer", "Chemical Plant Engineer", "Quality Control Engineer (Chemical)"],
  },
];

const normalizeBranch = (branch) => ` ${(branch || "").toLowerCase().trim()} `;

/**
 * Returns the CAREER_ROLES keys considered relevant to a student's branch,
 * by loose keyword matching against BRANCH_ROLE_GROUPS. A branch can match
 * more than one group (rare, but harmless — roles are de-duplicated).
 *
 * If no group matches (an unlisted or unusually-named branch), this
 * deliberately falls back to the FULL list of supported roles rather than
 * an empty list — showing every role is a better failure mode than
 * showing none, and the student can still see which ones they're closest to.
 */
const getRolesForBranch = (branch) => {
  const normalized = normalizeBranch(branch);
  const matchedRoles = new Set();
  let matchedAnyGroup = false;

  BRANCH_ROLE_GROUPS.forEach(({ keywords, roles }) => {
    const matches = keywords.some((kw) => normalized.includes(kw));
    if (matches) {
      matchedAnyGroup = true;
      roles.forEach((r) => matchedRoles.add(r));
    }
  });

  return matchedAnyGroup ? [...matchedRoles] : [...SUPPORTED_ROLES];
};

/** Human-readable branch-group label for a student's branch, or null if unmatched. */
const getBranchGroupLabel = (branch) => {
  const normalized = normalizeBranch(branch);
  const match = BRANCH_ROLE_GROUPS.find(({ keywords }) => keywords.some((kw) => normalized.includes(kw)));
  return match ? match.group : null;
};

/**
 * Roles grouped by branch for the role picker: the student's own branch first, then every other
 * branch group, then anything ungrouped. Each role appears once, in the first group that lists it.
 */
const getRoleGroups = (branch) => {
  const own = getBranchGroupLabel(branch);
  const ordered = [...BRANCH_ROLE_GROUPS].sort((a, b) => (b.group === own) - (a.group === own));
  const seen = new Set();
  const groups = ordered
    .map((g) => ({ group: g.group, own: g.group === own, roles: g.roles.filter((r) => CAREER_ROLES[r] && !seen.has(r) && seen.add(r)) }))
    .filter((g) => g.roles.length);
  const rest = SUPPORTED_ROLES.filter((r) => !seen.has(r));
  return rest.length ? [...groups, { group: "Other roles", own: false, roles: rest }] : groups;
};

module.exports = { CAREER_ROLES, SUPPORTED_ROLES, BRANCH_ROLE_GROUPS, getRolesForBranch, getBranchGroupLabel, getRoleGroups };
