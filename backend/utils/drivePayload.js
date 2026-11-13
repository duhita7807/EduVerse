const httpError = require("./httpError");

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const JOB_TYPES = ["full-time", "internship", "internship-ppo"];
const ROUND_TYPES = ["test", "interview", "group-discussion", "other"];

const str = (v) => (typeof v === "string" ? v.trim() : "");
const list = (v) => (Array.isArray(v) ? [...new Set(v.map(str).filter(Boolean))] : []);

/** Validates + sanitises the rounds array coming from the client. */
const buildRounds = (rounds) => {
  if (!Array.isArray(rounds)) return [];
  return rounds.map((r, i) => {
    const name = str(r.name);
    if (!name) throw httpError(400, `Round ${i + 1} needs a name.`);
    const round = {
      name,
      type: ROUND_TYPES.includes(r.type) ? r.type : "test",
      mode: r.mode === "offline" ? "offline" : "online",
      venue: str(r.venue),
    };
    if (r._id) round._id = r._id; // keep ids stable so recorded results stay linked
    if (r.scheduledAt) {
      const d = new Date(r.scheduledAt);
      if (Number.isNaN(d.getTime())) throw httpError(400, `Round "${name}" has an invalid date.`);
      round.scheduledAt = d;
    }
    return round;
  });
};

/**
 * Turns a request body into the editable fields of a Drive, throwing a 400
 * with a readable message on bad input. Status / recruiter / review fields are
 * never read from the client.
 */
const buildDrivePayload = (body = {}) => {
  const companyName = str(body.company?.name);
  if (!companyName) throw httpError(400, "Company name is required.");
  const title = str(body.title);
  if (!title) throw httpError(400, "Job role / title is required.");

  const deadline = new Date(body.applicationDeadline);
  if (!body.applicationDeadline || Number.isNaN(deadline.getTime())) {
    throw httpError(400, "A valid application deadline is required.");
  }

  const minCgpa = Number(body.eligibility?.minCgpa ?? 0);
  if (Number.isNaN(minCgpa) || minCgpa < 0 || minCgpa > 10) {
    throw httpError(400, "Minimum CGPA must be between 0 and 10.");
  }

  const years = list(body.eligibility?.years);
  if (years.some((y) => !YEARS.includes(y))) throw httpError(400, "Invalid year in eligibility.");

  const openings = Number(body.openings || 1);
  if (!Number.isInteger(openings) || openings < 1) throw httpError(400, "Openings must be a whole number of at least 1.");

  return {
    company: {
      name: companyName,
      website: str(body.company?.website),
      industry: str(body.company?.industry),
      about: str(body.company?.about),
    },
    title,
    description: str(body.description),
    jobType: JOB_TYPES.includes(body.jobType) ? body.jobType : "full-time",
    location: str(body.location),
    ctc: str(body.ctc),
    openings,
    eligibility: { minCgpa, branches: list(body.eligibility?.branches), years },
    applicationDeadline: deadline,
    rounds: buildRounds(body.rounds),
  };
};

module.exports = { buildDrivePayload, buildRounds };
