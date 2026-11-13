const express = require("express");
const { body } = require("express-validator");
const { registerStudent, registerRecruiter, loginStudent, logoutStudent, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { validateProfileUpdate } = require("../middleware/validateProfile");
const { NAME_REGEX, STRONG_PASSWORD_REGEX, ROLL_NO_REGEX } = require("../utils/validators");

const router = express.Router();

const ALLOWED_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const registerValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Full name is required")
    .bail()
    .isLength({ min: 2, max: 80 }).withMessage("Please enter a valid full name.")
    .bail()
    .matches(NAME_REGEX).withMessage("Please enter a valid full name."),

  body("email").trim().isEmail().withMessage("Please enter a valid email address.").normalizeEmail(),

  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .bail()
    .matches(STRONG_PASSWORD_REGEX)
    .withMessage("Password must include an uppercase letter, a lowercase letter, a number, and a special character."),

  body("college").trim().notEmpty().withMessage("College name is required").isLength({ min: 2, max: 150 }),

  body("branch").trim().notEmpty().withMessage("Branch is required").isLength({ min: 2, max: 100 }),

  body("year").trim().notEmpty().withMessage("Year is required").isIn(ALLOWED_YEARS).withMessage("Please select a valid academic year."),

  body("rollNo")
    .trim()
    .notEmpty().withMessage("Roll number is required")
    .bail()
    .matches(ROLL_NO_REGEX)
    .withMessage("Roll number should be 3-20 characters, letters/numbers/hyphens only."),
];

const recruiterRegisterValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Full name is required")
    .bail()
    .matches(NAME_REGEX).withMessage("Please enter a valid full name."),
  body("email").trim().isEmail().withMessage("Please enter a valid email address.").normalizeEmail(),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .bail()
    .matches(STRONG_PASSWORD_REGEX)
    .withMessage("Password must include an uppercase letter, a lowercase letter, a number, and a special character."),
  body("organization").trim().notEmpty().withMessage("Company name is required").isLength({ min: 2, max: 150 }),
];

const loginValidation = [
  body("email").trim().isEmail().withMessage("Please enter a valid email address.").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

router.post("/register", registerValidation, validateProfileUpdate, registerStudent);
router.post("/register-recruiter", recruiterRegisterValidation, registerRecruiter);
router.post("/login", loginValidation, loginStudent);
router.post("/logout", protect, logoutStudent);
router.get("/me", protect, getMe);

module.exports = router;
