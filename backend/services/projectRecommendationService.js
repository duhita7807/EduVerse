const { analyzeSkillGap } = require("./skillGapService");

// A small curated catalog keyed by role. Each project is picked to cover
// several of that role's commonly-missing skills at once.
const PROJECT_CATALOG = {
  "Full Stack Developer": [
    {
      title: "AI-Based Student Placement Dashboard",
      description: "A full-stack dashboard that tracks student profiles, skills, and readiness scores.",
      technologies: ["React", "Node.js", "Express", "MongoDB", "REST API", "JWT"],
      skillsDeveloped: ["React", "Node.js", "Express.js", "MongoDB", "REST API", "Authentication"],
      difficulty: "Intermediate",
    },
    {
      title: "Dockerized Task Management App",
      description: "A to-do/task app deployed with Docker to practice containerization and deployment.",
      technologies: ["React", "Node.js", "Docker", "MongoDB"],
      skillsDeveloped: ["Docker", "CI/CD", "Deployment"],
      difficulty: "Intermediate",
    },
  ],
  "Backend Developer": [
    {
      title: "JWT-Secured E-commerce API",
      description: "A REST API with authentication, role-based access, and order management.",
      technologies: ["Node.js", "Express", "MongoDB", "JWT"],
      skillsDeveloped: ["REST API", "Authentication", "API Design"],
      difficulty: "Intermediate",
    },
  ],
  "Data Analyst": [
    {
      title: "Placement Trends Dashboard",
      description: "An analysis of placement/salary data using SQL and a visualization library.",
      technologies: ["Python", "SQL", "Pandas", "Power BI"],
      skillsDeveloped: ["SQL", "Data Visualization", "Statistics"],
      difficulty: "Beginner",
    },
  ],
  "Machine Learning Engineer": [
    {
      title: "Placement Readiness Predictor (Learning Project)",
      description: "A small classifier trained on synthetic student profile data to predict a readiness label.",
      technologies: ["Python", "Scikit-learn", "Pandas", "NumPy"],
      skillsDeveloped: ["Machine Learning", "Model Evaluation", "Scikit-learn"],
      difficulty: "Advanced",
    },
  ],

  // ---- Mechanical ----
  "Mechanical Design Engineer": [
    {
      title: "Gearbox Assembly Design",
      description: "A fully modeled and toleranced gearbox assembly with a complete manufacturing drawing set.",
      technologies: ["SolidWorks", "AutoCAD", "GD&T"],
      skillsDeveloped: ["SolidWorks", "Machine Design", "Mechanical Drawing"],
      difficulty: "Intermediate",
    },
  ],
  "CAE/Simulation Engineer": [
    {
      title: "Structural FEA Comparison Study",
      description: "A finite-element stress/deformation comparison of two design iterations of a load-bearing part.",
      technologies: ["ANSYS", "SolidWorks Simulation"],
      skillsDeveloped: ["Finite Element Analysis", "CFD", "Mechanical Design"],
      difficulty: "Advanced",
    },
  ],

  // ---- Civil ----
  "Structural Design Engineer": [
    {
      title: "Multi-Storey Frame Analysis & Design",
      description: "Structural analysis and member design of a small multi-storey building frame under gravity and lateral loads.",
      technologies: ["STAAD.Pro", "AutoCAD", "ETABS"],
      skillsDeveloped: ["Structural Analysis", "Concrete Design", "Steel Design"],
      difficulty: "Advanced",
    },
  ],
  "BIM/Revit Engineer": [
    {
      title: "Coordinated BIM Model of a Small Building",
      description: "An architectural + structural Revit model with clash detection and a full drawing sheet set.",
      technologies: ["Revit", "AutoCAD", "BIM"],
      skillsDeveloped: ["Revit", "BIM", "3D Modeling"],
      difficulty: "Intermediate",
    },
  ],

  // ---- Electronics & Telecommunication ----
  "Embedded Systems Engineer": [
    {
      title: "Microcontroller-Based Environmental Logger",
      description: "A sensor-driven embedded device that logs and displays environmental data in real time.",
      technologies: ["Embedded C", "Microcontrollers", "PCB Design"],
      skillsDeveloped: ["Embedded C", "Microcontrollers", "Circuit Design"],
      difficulty: "Intermediate",
    },
  ],
  "VLSI Design Engineer": [
    {
      title: "Digital System Design in Verilog",
      description: "A small sequential digital system (e.g. a traffic-light or vending-machine controller) designed and simulated in Verilog.",
      technologies: ["Verilog", "VHDL"],
      skillsDeveloped: ["VLSI", "Digital Design", "Verilog"],
      difficulty: "Advanced",
    },
  ],

  // ---- Chemical ----
  "Process Engineer": [
    {
      title: "Process Simulation & Mass/Energy Balance Study",
      description: "A steady-state flowsheet simulation of a separation or reaction process with a full mass/energy balance report.",
      technologies: ["Aspen Plus"],
      skillsDeveloped: ["Process Simulation", "Mass Transfer", "Chemical Process Design"],
      difficulty: "Advanced",
    },
  ],
};

const GENERIC_PROJECT = {
  title: "Portfolio Project Covering Missing Skills",
  description: "A focused project designed to demonstrate the skills currently missing from your profile.",
  difficulty: "Intermediate",
};

/**
 * Recommends 1-2 projects for the target role, explaining which of the
 * student's missing skills each project would help demonstrate.
 */
const recommendProjects = (student, targetRole) => {
  const gap = analyzeSkillGap(student, targetRole);
  const catalog = PROJECT_CATALOG[targetRole] || [];

  const recommendations = (catalog.length ? catalog : [GENERIC_PROJECT]).map((project) => {
    const skillsDeveloped = project.skillsDeveloped || gap.missingSkills.slice(0, 5);
    const addressesMissing = skillsDeveloped.filter((s) => gap.missingSkills.includes(s));

    return {
      title: project.title,
      description: project.description,
      technologies: project.technologies || skillsDeveloped,
      skillsDeveloped,
      difficulty: project.difficulty,
      whyItHelps:
        addressesMissing.length > 0
          ? `Directly demonstrates ${addressesMissing.join(", ")} — currently missing from your profile.`
          : `Reinforces core skills required for ${targetRole}.`,
    };
  });

  return { targetRole, recommendations };
};

module.exports = { recommendProjects };
