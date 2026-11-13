/**
 * DEMO DATA: fills EMPTY profile sections (skills, certifications, projects,
 * internships, bio, career interests) with branch-appropriate sample data so
 * dashboards, readiness scores and shortlists have something to work with.
 *
 * - Never overwrites anything a student already has.
 * - Internships go to roughly half of the students (not everyone has one).
 * - GitHub, LinkedIn and photos are NOT invented (fake usernames would point
 *   at real people's accounts).
 * - Every filled field is recorded in sampleProfile-fills.json; undo with
 *     node scripts/seedMissingProfileData.js --undo
 *
 * USAGE: cd backend && node scripts/seedMissingProfileData.js [--dry-run]
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const { calculateProfileCompletion } = require("../services/profileCompletionService");
const { branchGroup } = require("../config/questionBank");

const FILLS_PATH = path.join(__dirname, "sampleProfile-fills.json");
const DRY = process.argv.includes("--dry-run");

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, min, max) => [...arr].sort(() => Math.random() - 0.5).slice(0, min + Math.floor(Math.random() * (max - min + 1)));
const monthsAgo = (m) => new Date(Date.now() - m * 30 * 86400000);

const POOLS = {
  cs: {
    skills: {
      programmingLanguages: ["Python", "Java", "C++", "JavaScript", "C", "TypeScript"],
      webTechnologies: ["React", "Node.js", "Express", "HTML", "CSS", "Django", "Flask"],
      databases: ["MySQL", "MongoDB", "PostgreSQL", "Firebase"],
      tools: ["Git", "Docker", "Postman", "Linux", "VS Code", "Pandas", "NumPy", "TensorFlow", "Power BI"],
    },
    certs: [["Python for Data Science", "NPTEL"], ["Full Stack Web Development", "Udemy"], ["Machine Learning Specialization", "Coursera"], ["AWS Cloud Practitioner Essentials", "AWS Skill Builder"], ["Introduction to Cybersecurity", "Cisco Networking Academy"], ["Data Structures and Algorithms", "NPTEL"], ["SQL (Intermediate)", "HackerRank"]],
    projects: [["Student Attendance System", "Web app to mark and report attendance with role-based login.", ["React", "Node.js", "MongoDB"]], ["Movie Recommendation Engine", "Content-based recommender using TF-IDF similarity.", ["Python", "Pandas", "Scikit-learn"]], ["Expense Tracker", "Track and chart monthly expenses with category budgets.", ["React", "Firebase"]], ["Chat Application", "Real-time chat with rooms and typing indicators.", ["Node.js", "Socket.io", "Express"]], ["House Price Predictor", "Regression model with feature engineering and a Flask API.", ["Python", "Flask", "Scikit-learn"]], ["Library Management System", "Issue/return books, fines and search.", ["Java", "MySQL"]]],
    roles: ["Web Development Intern", "Data Analyst Intern", "Python Developer Intern", "Machine Learning Intern"],
    interests: ["Web Development", "Data Science", "Machine Learning", "Cloud Computing", "Cybersecurity", "Software Development"],
  },
  mechanical: {
    skills: { programmingLanguages: ["Python", "C", "MATLAB"], webTechnologies: [], databases: [], tools: ["AutoCAD", "SolidWorks", "CATIA", "ANSYS", "Creo", "MS Excel", "GD&T"] },
    certs: [["AutoCAD Mechanical", "Autodesk"], ["SolidWorks Associate (CSWA) preparation", "Udemy"], ["Engineering Thermodynamics", "NPTEL"], ["Six Sigma Yellow Belt", "Coursera"], ["Introduction to FEA with ANSYS", "Coursera"]],
    projects: [["Solar Powered Dryer", "Designed and fabricated a solar dryer for agricultural produce.", ["SolidWorks", "Fabrication"]], ["Go-Kart Chassis Design", "Chassis design with FEA validation for a student go-kart.", ["SolidWorks", "ANSYS"]], ["Pneumatic Sheet Cutting Machine", "Low-cost pneumatic cutter for thin metal sheets.", ["AutoCAD", "Pneumatics"]], ["Heat Exchanger Performance Study", "Experimental comparison of parallel vs counter flow.", ["MATLAB", "Excel"]]],
    roles: ["Design Engineer Intern", "Production Intern", "Quality Control Trainee", "Maintenance Intern"],
    interests: ["Automobile Design", "Product Design", "Manufacturing", "Thermal Engineering", "Robotics"],
  },
  civil: {
    skills: { programmingLanguages: ["Python"], webTechnologies: [], databases: [], tools: ["AutoCAD", "STAAD.Pro", "ETABS", "Revit", "MS Project", "Primavera", "QGIS"] },
    certs: [["AutoCAD Civil 3D", "Autodesk"], ["Design of Reinforced Concrete Structures", "NPTEL"], ["Construction Project Management", "Coursera"], ["STAAD.Pro Fundamentals", "Udemy"], ["Remote Sensing and GIS", "NPTEL"]],
    projects: [["G+3 Residential Building Design", "Analysis and design of a residential building in STAAD.Pro.", ["STAAD.Pro", "AutoCAD"]], ["Rainwater Harvesting System", "Design for a college campus with cost estimate.", ["AutoCAD", "Excel"]], ["Pervious Concrete Study", "Strength and permeability tests on pervious concrete mixes.", ["Lab testing"]], ["Road Alignment Survey", "Survey and alignment design for a village road.", ["Total Station", "QGIS"]]],
    roles: ["Site Engineer Intern", "Structural Design Intern", "Quantity Surveying Intern"],
    interests: ["Structural Engineering", "Construction Management", "Transportation Engineering", "Sustainable Construction"],
  },
  electrical: {
    skills: { programmingLanguages: ["C", "Embedded C", "Python", "MATLAB", "Verilog"], webTechnologies: [], databases: [], tools: ["Arduino", "Raspberry Pi", "Proteus", "Multisim", "PCB Design", "PLC"] },
    certs: [["Embedded Systems with Arduino", "Coursera"], ["Digital Circuits", "NPTEL"], ["Internet of Things", "NPTEL"], ["PCB Design with KiCad", "Udemy"], ["Introduction to Packet Tracer", "Cisco Networking Academy"]],
    projects: [["IoT Home Automation", "Control appliances from a phone using ESP8266 and MQTT.", ["Arduino", "IoT", "Embedded C"]], ["Smart Energy Meter", "Real-time power monitoring with cloud dashboard.", ["Arduino", "IoT"]], ["Line Follower Robot", "PID-controlled line follower with IR sensors.", ["Embedded C", "Arduino"]], ["FM Transmitter", "Low-power FM transmitter design and testing.", ["Proteus", "PCB Design"]]],
    roles: ["Embedded Systems Intern", "IoT Developer Intern", "Electrical Maintenance Intern"],
    interests: ["Embedded Systems", "IoT", "VLSI Design", "Robotics", "Telecommunication"],
  },
  chemical: {
    skills: { programmingLanguages: ["Python", "MATLAB"], webTechnologies: [], databases: [], tools: ["Aspen Plus", "Aspen HYSYS", "DWSIM", "MS Excel", "AutoCAD"] },
    certs: [["Chemical Process Simulation with DWSIM", "FOSSEE (IIT Bombay)"], ["Mass Transfer Operations", "NPTEL"], ["Process Safety Management", "Coursera"], ["Introduction to Aspen Plus", "Udemy"]],
    projects: [["Biodiesel from Waste Cooking Oil", "Transesterification process and yield optimisation.", ["Lab work", "Excel"]], ["Distillation Column Simulation", "Binary distillation design using DWSIM.", ["DWSIM"]], ["Wastewater Treatment Study", "Adsorption-based dye removal using activated carbon.", ["Lab work"]]],
    roles: ["Process Engineering Intern", "Quality Control Intern", "Plant Operations Trainee"],
    interests: ["Process Engineering", "Petrochemicals", "Environmental Engineering", "Pharmaceuticals"],
  },
};
const COMPANIES = ["Nexa Labs", "BrightPath Technologies", "Sahyadri Engineering Works", "Vertex Solutions", "Kolhapur Industrial Services", "BlueOrbit Systems", "Deccan Infra Projects", "Pune Process Technologies"];

const skillCount = (s) => Object.values(s.skills || {}).flat().length;

const buildFill = (s) => {
  const pool = POOLS[branchGroup(s.branch)];
  const set = {};
  if (skillCount(s) === 0) {
    set.skills = Object.fromEntries(Object.entries(pool.skills).map(([k, v]) => [k, v.length ? pickN(v, Math.min(1, v.length), Math.min(3, v.length)) : []]));
  }
  if (!(s.certifications || []).length) {
    set.certifications = pickN(pool.certs, 1, 3).map(([title, issuedBy]) => ({ title, issuedBy, issueDate: monthsAgo(2 + Math.floor(Math.random() * 20)) }));
  }
  if (!(s.projects || []).length) {
    set.projects = pickN(pool.projects, 1, 2).map(([title, description, technologies]) => ({ title, description, technologies }));
  }
  if (!(s.internships || []).length && Math.random() < 0.5) {
    const start = 3 + Math.floor(Math.random() * 12);
    set.internships = [{ company: pick(COMPANIES), role: pick(pool.roles), startDate: monthsAgo(start + 2), endDate: monthsAgo(start), description: "Two-month internship." }];
  }
  if (!(s.careerInterests || []).length) set.careerInterests = pickN(pool.interests, 2, 3);
  if (!s.bio) {
    const interests = set.careerInterests || s.careerInterests || [];
    set.bio = `${s.year} ${s.branch} student at ${s.college}${interests.length ? `, interested in ${interests.slice(0, 2).join(" and ")}` : ""}. Looking for opportunities to apply my skills in real projects.`.slice(0, 300);
  }
  return set;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  if (process.argv.includes("--undo")) {
    const fills = JSON.parse(fs.readFileSync(FILLS_PATH, "utf8"));
    const EMPTY = { skills: { programmingLanguages: [], webTechnologies: [], databases: [], tools: [] }, certifications: [], projects: [], internships: [], careerInterests: [], bio: "" };
    const students = await Student.find({ _id: { $in: Object.keys(fills) } }).lean();
    await Student.bulkWrite(students.map((s) => {
      const reset = Object.fromEntries(fills[s._id].map((f) => [f, EMPTY[f]]));
      return { updateOne: { filter: { _id: s._id }, update: { $set: { ...reset, profileCompletion: calculateProfileCompletion({ ...s, ...reset }) } } } };
    }));
    fs.unlinkSync(FILLS_PATH);
    console.log(`↩️  Removed sample data from ${students.length} students.`);
    return mongoose.disconnect();
  }

  const students = await Student.find({ role: "student" }).lean();
  const fills = fs.existsSync(FILLS_PATH) ? JSON.parse(fs.readFileSync(FILLS_PATH, "utf8")) : {};
  const counts = {};
  const ops = [];
  for (const s of students) {
    const set = buildFill(s);
    const fields = Object.keys(set);
    if (!fields.length) continue;
    fields.forEach((f) => (counts[f] = (counts[f] || 0) + 1));
    fills[s._id] = [...new Set([...(fills[s._id] || []), ...fields])];
    ops.push({ updateOne: { filter: { _id: s._id }, update: { $set: { ...set, profileCompletion: calculateProfileCompletion({ ...s, ...set }) } } } });
  }

  console.log(`${DRY ? "[dry run] Would fill" : "Filled"} ${ops.length} students:`, counts);
  if (!DRY && ops.length) {
    await Student.bulkWrite(ops);
    fs.writeFileSync(FILLS_PATH, JSON.stringify(fills));
  }
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
