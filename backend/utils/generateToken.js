const jwt = require("jsonwebtoken");

/**
 * Signs a JWT for a given student id.
 * @param {string} id - Mongo ObjectId of the student
 * @returns {string} signed JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = generateToken;
