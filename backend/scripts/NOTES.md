# TNP dataset → EduVerse import

Source: `Students-Data_TNP.xlsx` — 1,005 students, 192 columns, from the
college's Training & Placement cell export. EduVerse's `Student` schema only
needs a fraction of that. This folder has everything used to go from the raw
spreadsheet to real database records.

## Files

- `transform.py` — reads the original xlsx, keeps only the columns below,
  parses the messy multi-value cells, and writes `students.json`.
- `students.json` — the cleaned output: 996 student records, one JSON object
  per student, field names matching the `Student` Mongoose schema directly.
- `seedFromTNP.js` — reads `students.json` and creates each one as a real
  `Student` document (so every schema validation rule — email format, `year`
  enum, required fields — is actually enforced, not just approximated).

## Run it

```bash
cd backend
node scripts/seedFromTNP.js
```

Safe to re-run — existing emails are skipped, not duplicated.

**Every imported account gets the same password: `Student@123`.** Nobody in
the source spreadsheet gave EduVerse a password, so one had to be assigned.
This is fine for local/demo use; change it (or deactivate these accounts)
before this ever points at a real production database.

## Columns used → schema field

| Spreadsheet column(s) | → | Schema field |
|---|---|---|
| First/Middle/Last Name | → | `name` |
| College/Official Email | → | `email` |
| Campus | → | `college` |
| Degree 1 Primary Specializations | → | `branch` |
| Admission Year (see note below) | → | `year` |
| Unique ID | → | `rollNo` |
| Career Objective | → | `bio` (truncated to 300 chars) |
| Key Skills, Projects Key Skills, Internship Key Skills | → | `skills.*` (keyword-categorized into programmingLanguages/webTechnologies/databases/tools — see `categorize()` in `transform.py`; anything not recognized is kept under `tools` rather than dropped) |
| Projects Name (+ Projects Key Skills) | → | `projects[]` |
| Internship Experience columns (1, 2, overflow) | → | `internships[]` (company + parsed start/end dates; the free-text "industry/mentor" portion wasn't reliable enough to map to a specific field, so it's left out rather than guessed) |
| Assessments/Certification | → | `certifications[]` (title + provider) |
| Web Links - Github | → | `githubUsername` (extracted from the URL) |
| Web Links - LinkedIn | → | `linkedinProfile` |

**Everything else was ignored** — 170+ columns including: DOB, gender, blood
group, marital status, disability info, addresses, 12th/10th/diploma
records, semester-by-semester marks (27 columns), other-degree details,
academic gap reasons, bike ownership, passport number, GATE status, and all
placement-pipeline tracking (offer counts, interview round counts, eligible
companies, applied companies, etc.) — none of this has a corresponding field
in the EduVerse `Student` schema, so it was left out rather than forced in.

## Assumptions made (worth knowing)

- **`year`**: the spreadsheet has no direct "current year" field, only
  Admission Year. Computed as `2026 - admissionYear + 1`, clamped to
  1st–4th Year. For the 127 students with no admission year on record,
  defaulted to 4th Year (the dataset's actual most common computed value,
  since 767/1005 students were admitted in 2023).
- **CGPA / marks**: the spreadsheet stores percentage marks (e.g. `61.44`),
  but the schema's `education.cgpa` field is constrained to a 0–10 scale.
  Converting percentage→CGPA requires an assumed formula, so this was left
  out entirely rather than silently fabricating a number.
- **9 duplicate students**: 9 people appear twice in the source (same name,
  same roll number, two different personal emails — looks like duplicate
  TNP registrations). Deduped by roll number, keeping whichever of the two
  entries had more complete data.
- **Project technologies**: the source gives one skills string per student,
  not per project, and multiple projects' skills aren't reliably separable.
  All of a student's parsed project-skill tokens are attached to each of
  their individual projects, rather than guessing which skill belongs to
  which project.
- **Internship "role"**: the source's internship field only gives
  organization name, industry category, and dates — no actual job title —
  so `role` was left blank rather than mislabeling the industry as a role.

## Validated

- All 996 output records pass the schema's actual constraints (valid email
  format, valid `year` enum value, bio ≤300 chars, no duplicate email/rollNo).
- Live-tested end to end against a real MongoDB-compatible database: seeded
  records, confirmed `Student.save()` validation passes, logged in as a
  seeded student via the real `/api/auth/login` endpoint, and confirmed
  skills/projects/internships came back correctly nested and populated.
