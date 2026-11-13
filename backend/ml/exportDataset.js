// Writes ml/dataset.csv from MongoDB: numeric features + target only, no names, emails or ids.
// Run from backend/: node ml/exportDataset.js
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { FEATURE_NAMES, featuresOf } = require("./features");
const { calculateOverallReadiness } = require("../services/readinessService");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const students = await mongoose.connection.db.collection("students").find({ role: "student" }).toArray();
  const rows = students.map((s) => [...featuresOf(s), calculateOverallReadiness(s).overallScore].join(","));
  fs.writeFileSync(path.join(__dirname, "dataset.csv"), [[...FEATURE_NAMES, "readinessScore"].join(","), ...rows].join("\n") + "\n");
  console.log(`wrote ml/dataset.csv: ${rows.length} rows`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
