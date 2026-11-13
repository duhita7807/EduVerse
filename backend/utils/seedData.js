/**
 * Seeds the database with one sample student for quick testing.
 * Run with: npm run seed
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const Student = require("../models/Student");
const { calculateProfileCompletion } = require("../services/profileCompletionService");

const seed = async () => {
  await connectDB();

  const email = "aarav.sharma@example.edu";
  await Student.deleteOne({ email });

  const hashedPassword = await bcrypt.hash("password123", 10);

  const student = new Student({
    name: "Aarav Sharma",
    email,
    password: hashedPassword,
    college: "Indian Institute of Information Technology",
    branch: "Computer Science & Engineering",
    year: "3rd Year",
    rollNo: "CS21B045",
    bio: "Full-stack developer passionate about building AI-powered products.",
    skills: {
      programmingLanguages: ["JavaScript", "Python", "Java"],
      webTechnologies: ["React", "Node.js", "Express"],
      databases: ["MongoDB", "MySQL"],
      tools: ["Git", "Docker", "Postman"],
    },
    education: [
      {
        degree: "B.Tech",
        institution: "Indian Institute of Information Technology",
        branch: "Computer Science & Engineering",
        startYear: 2022,
        endYear: 2026,
        cgpa: 8.7,
      },
    ],
    projects: [
      {
        title: "EduVerse",
        description: "AI-powered placement readiness platform for students.",
        technologies: ["React", "Node.js", "MongoDB"],
        githubRepo: "https://github.com/aaravsharma/eduverse",
      },
      {
        title: "Campus Connect",
        description: "A social platform for college clubs and event management.",
        technologies: ["React Native", "Firebase"],
        githubRepo: "https://github.com/aaravsharma/campus-connect",
      },
    ],
    internships: [
      {
        company: "TechNova Solutions",
        role: "Frontend Developer Intern",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-07-31"),
        description: "Built reusable React components for a B2B SaaS dashboard.",
      },
    ],
    certifications: [
      { title: "Meta Front-End Developer", issuedBy: "Coursera", issueDate: new Date("2024-12-01") },
    ],
    githubUsername: "octocat",
    linkedinProfile: "https://linkedin.com/in/aaravsharma",
    leetcodeUsername: "aarav_codes",
    hackerrankUsername: "aarav_sharma",
  });

  student.profileCompletion = calculateProfileCompletion(student);
  await student.save();

  console.log("✅ Seed complete. Login with:");
  console.log(`   email: ${email}`);
  console.log("   password: password123");
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
