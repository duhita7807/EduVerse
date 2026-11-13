const mongoose = require("mongoose");

/**
 * Connects to MongoDB using the URI from environment variables.
 * Exits the process on failure so the app never runs against a broken DB.
 *
 * serverSelectionTimeoutMS is set short (default is 30s) so a missing or
 * unreachable MongoDB instance fails fast with a clear message instead of
 * leaving every register/login request hanging silently — this was the
 * exact cause of "I can't log in / sign up, nothing happens" reports.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.error(
      "   → Is MongoDB actually running? If MONGO_URI points to 127.0.0.1:27017, " +
        "you need a local `mongod` process running, or switch MONGO_URI to a free " +
        "MongoDB Atlas connection string (https://www.mongodb.com/atlas)."
    );
    process.exit(1);
  }
};

module.exports = connectDB;
