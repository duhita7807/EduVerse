const { analyzeSkillGap } = require("./skillGapService");

// Small reference library so recommendations have concrete, believable
// content instead of generic filler. Add entries here as new skills come up;
// any skill without an entry still gets a sensible generic recommendation.
const SKILL_LIBRARY = {
  "Docker": {
    objective: "Understand containerization and write a working Dockerfile",
    practiceTask: "Containerize one of your existing backend projects",
    suggestedProject: "Dockerized REST API with a docker-compose database",
    durationWeeks: 2,
  },
  "CI/CD": {
    objective: "Automate build, test, and deploy steps for a project",
    practiceTask: "Set up a GitHub Actions workflow that runs tests on push",
    suggestedProject: "CI pipeline for an existing GitHub repository",
    durationWeeks: 1,
  },
  "Testing": {
    objective: "Write unit and integration tests for backend routes",
    practiceTask: "Add Jest/Supertest tests to an existing Express API",
    suggestedProject: "Test suite for your Full Stack Developer project",
    durationWeeks: 1,
  },
  "REST API": {
    objective: "Design and build a REST API following standard conventions",
    practiceTask: "Build CRUD endpoints with proper status codes and validation",
    suggestedProject: "A small REST API for a to-do or notes app",
    durationWeeks: 2,
  },
  "Node.js": {
    objective: "Build a server-side application using Node.js and Express",
    practiceTask: "Build an authentication API with JWT",
    suggestedProject: "Backend service for a personal project",
    durationWeeks: 2,
  },
  "React": {
    objective: "Build component-driven UIs with state and hooks",
    practiceTask: "Build a small multi-page app with React Router",
    suggestedProject: "A dashboard UI consuming a public API",
    durationWeeks: 2,
  },
  "SQL": {
    objective: "Write queries covering joins, aggregation, and indexing basics",
    practiceTask: "Model and query a small relational database",
    suggestedProject: "Data analysis project using SQL on a public dataset",
    durationWeeks: 2,
  },
  "Machine Learning": {
    objective: "Understand core supervised learning workflows",
    practiceTask: "Train and evaluate a classifier on a public dataset",
    suggestedProject: "A predictive model with a short evaluation report",
    durationWeeks: 3,
  },

  // ---- Mechanical ----
  "AutoCAD": {
    objective: "Produce accurate 2D engineering drawings with correct dimensioning and tolerances",
    practiceTask: "Draft a complete 2D assembly drawing of a mechanical component from a sample 3D model",
    suggestedProject: "2D-to-3D conversion of a mechanical part with a full drawing sheet",
    durationWeeks: 2,
  },
  "SolidWorks": {
    objective: "Model parts and assemblies, and run basic simulations",
    practiceTask: "Design and assemble a multi-part mechanical component (e.g. a gearbox or bracket assembly)",
    suggestedProject: "3D CAD model and assembly of a small mechanical device, with a rendered drawing set",
    durationWeeks: 3,
  },
  "ANSYS": {
    objective: "Run and interpret structural or thermal finite-element simulations",
    practiceTask: "Perform a static structural analysis on a simple bracket and interpret stress/deformation results",
    suggestedProject: "FEA stress analysis report comparing two design iterations of the same part",
    durationWeeks: 3,
  },
  "MATLAB": {
    objective: "Model and simulate a basic engineering system numerically",
    practiceTask: "Write a MATLAB script to simulate and plot the response of a simple mechanical or electrical system",
    suggestedProject: "Simulation and analysis of a system's behaviour under varying input conditions",
    durationWeeks: 2,
  },
  // ---- Civil ----
  "STAAD.Pro": {
    objective: "Model and analyze a basic structural frame",
    practiceTask: "Model a simple multi-storey frame and analyze it for gravity and lateral loads",
    suggestedProject: "Structural analysis and design report for a small building frame",
    durationWeeks: 3,
  },
  "Revit": {
    objective: "Build a coordinated 3D building information model",
    practiceTask: "Model a small building's architectural and structural elements in Revit",
    suggestedProject: "BIM model of a small residential or commercial building with drawing sheets",
    durationWeeks: 3,
  },
  // ---- Electronics / Electrical ----
  "Embedded C": {
    objective: "Write and debug firmware for a microcontroller",
    practiceTask: "Interface a sensor with a microcontroller and read/display its output",
    suggestedProject: "A microcontroller-based mini project (e.g. temperature logger or automated switch)",
    durationWeeks: 3,
  },
  "PCB Design": {
    objective: "Design and lay out a basic printed circuit board",
    practiceTask: "Design a schematic and PCB layout for a simple circuit (e.g. a sensor interface board)",
    suggestedProject: "A fabricated or simulated PCB for a small electronics project",
    durationWeeks: 3,
  },
  "Verilog": {
    objective: "Describe and simulate basic digital logic in HDL",
    practiceTask: "Write and simulate Verilog modules for a combinational and a sequential circuit",
    suggestedProject: "A small digital system (e.g. a traffic-light controller) implemented and simulated in Verilog",
    durationWeeks: 3,
  },
  // ---- Chemical ----
  "Aspen Plus": {
    objective: "Simulate a basic chemical process flowsheet",
    practiceTask: "Build a steady-state simulation of a simple separation or reaction process",
    suggestedProject: "Process simulation and mass/energy balance report for a chosen chemical process",
    durationWeeks: 3,
  },
};

const DEFAULT_ENTRY = {
  objective: "Build a working understanding through a small hands-on project",
  practiceTask: "Complete a focused tutorial, then rebuild it without following along",
  suggestedProject: "A small project applying this skill in isolation",
  durationWeeks: 2,
};

/**
 * Builds a prioritized, week-by-week learning roadmap from a student's
 * missing (and partial) skills for a target role. Missing skills are
 * prioritized over partial ones since they represent the bigger gap.
 */
const generateLearningRoadmap = (student, targetRole) => {
  const gap = analyzeSkillGap(student, targetRole);

  const prioritized = [
    ...gap.missingSkills.map((skill) => ({ skill, priority: "High" })),
    ...gap.partialSkills.map((skill) => ({ skill, priority: "Medium" })),
  ];

  let weekCursor = 1;
  const roadmap = prioritized.map(({ skill, priority }) => {
    const entry = SKILL_LIBRARY[skill] || DEFAULT_ENTRY;
    const startWeek = weekCursor;
    const endWeek = weekCursor + entry.durationWeeks - 1;
    weekCursor = endWeek + 1;

    return {
      skill,
      priority,
      reason:
        priority === "High"
          ? `${skill} is required for ${targetRole} and currently missing from your profile.`
          : `${skill} is required for ${targetRole} and you have related but incomplete experience.`,
      learningObjective: entry.objective,
      practiceTask: entry.practiceTask,
      suggestedProject: entry.suggestedProject,
      estimatedDuration: `${entry.durationWeeks} week${entry.durationWeeks > 1 ? "s" : ""}`,
      weekRange: `Week ${startWeek}–${endWeek}`,
    };
  });

  return { targetRole, roadmap };
};

module.exports = { generateLearningRoadmap, SKILL_LIBRARY };
