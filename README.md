# EduVerse — Module 1 & Module 2

**Student AI for Intelligent Career Prediction, Skill Gap Analysis, and Placement Readiness**

This delivers two fully functional modules:

- **Module 1** — Authentication & Student Profile Management
- **Module 2** — Digital Profile Creation Engine (GitHub integration, dashboard, profile completion %, AI insights)

Placement prediction, skill-gap prediction, Random Forest modeling, and recruiter ranking are **intentionally not implemented** — those belong to a later AI Analytics module.

---

## 1. Project structure

```
eduverse/
├── backend/
│   ├── config/           # MongoDB connection
│   ├── controllers/      # auth, profile, github, ai
│   ├── middleware/       # JWT auth guard, error handler
│   ├── models/           # Student schema
│   ├── routes/           # REST API routes
│   ├── services/         # githubService, aiService, profileCompletionService
│   ├── uploads/          # uploaded profile photos (served statically)
│   ├── utils/            # generateToken.js, seedData.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── api/           # axios instance with JWT interceptor
    │   ├── components/    # DashboardLayout, ProgressBar, SectionCard, ProtectedRoute
    │   ├── context/        # AuthContext (global auth state)
    │   ├── pages/          # Landing, Register, Login, Dashboard, MyProfile,
    │   │                   # EditProfile, DigitalProfile, Integrations
    │   ├── styles/         # tokens.css (design system)
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env.example
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 2. Technology stack

| Layer          | Technology                              |
|----------------|------------------------------------------|
| Frontend       | React 18 + Vite + React Router           |
| Backend        | Node.js + Express.js                     |
| Database       | MongoDB + Mongoose                       |
| Auth           | JWT + bcrypt                             |
| AI integration | Google Gemini API (`@google/genai`) — profile analysis, placement analytics, career assistant |
| External API   | GitHub REST API (public repos/profile)   |

---

## 3. Installation

### Prerequisites
- Node.js 18+
- A MongoDB instance — either [local](https://www.mongodb.com/try/download/community) (`mongod` running on `27017`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

### Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI, JWT_SECRET, and optionally GITHUB_TOKEN / GEMINI_API_KEY
npm run dev          # starts on http://localhost:5000 (nodemon, auto-reload)
```

`.env` variables:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/eduverse
JWT_SECRET=replace_this_with_a_long_random_secret_key
JWT_EXPIRES_IN=7d
GITHUB_TOKEN=            # optional — raises GitHub rate limit from 60/hr to 5000/hr
GEMINI_API_KEY=          # optional — enables live AI profile analysis (get one free at https://aistudio.google.com/apikey)
GEMINI_MODEL=gemini-flash-latest
CLIENT_URL=http://localhost:5173
```

> If `GEMINI_API_KEY` is left blank, the AI insights endpoint still works — it returns a sensible rule-based fallback instead of calling the API, so Module 2 stays fully functional without any paid key.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# edit .env if your backend runs on a different URL
npm run dev          # starts on http://localhost:5173
```

### Load sample test data (optional)

```bash
cd backend
npm run seed
```

This creates one ready-to-use account:

```
email:    aarav.sharma@example.edu
password: password123
```

It comes pre-filled with education, skills, two projects, an internship, a certification, and a GitHub username (`octocat`) so you can see the Digital Profile dashboard and completion bar populated immediately — sync GitHub from the Integrations page to pull live repo data for it.

---

## 4. Running both together

Open two terminals:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Visit **http://localhost:5173**. Register a new account or log in with the seeded account above.

---

## 5. REST API reference

| Method | Endpoint                  | Auth | Description                              |
|--------|----------------------------|------|-------------------------------------------|
| POST   | `/api/auth/register`       | —    | Create a student account                  |
| POST   | `/api/auth/login`          | —    | Log in, returns JWT                       |
| POST   | `/api/auth/logout`         | ✅   | Stateless logout                          |
| GET    | `/api/auth/me`             | ✅   | Get current student (session bootstrap)   |
| GET    | `/api/profile`             | ✅   | Get full profile                          |
| PUT    | `/api/profile`             | ✅   | Update editable profile fields            |
| POST   | `/api/profile/photo`       | ✅   | Upload profile photo (multipart)          |
| GET    | `/api/profile/completion`  | ✅   | Get completion % + section breakdown      |
| POST   | `/api/github/sync`         | ✅   | Fetch & cache public GitHub data           |
| GET    | `/api/github`              | ✅   | Get last cached GitHub data                |
| POST   | `/api/ai/analyze`          | ✅   | Run AI profile analysis                   |
| GET    | `/api/ai/insights`         | ✅   | Get last generated AI insights             |

All protected routes require `Authorization: Bearer <token>`.

---

## 6. How Module 1 and Module 2 work together

**Module 1 is the foundation.** When a student registers, the backend hashes their password with bcrypt and creates a `Student` document holding both their identity fields (name, email, college, branch, year, roll number) and empty placeholders for every field Module 2 will later fill in (skills, projects, GitHub username, etc.) — it's a single schema, not two separate tables, so there's no join or sync problem between "account" and "profile." Login issues a signed JWT; every subsequent request — profile reads, edits, GitHub syncs, AI analysis — passes through the `protect` middleware, which verifies that JWT and attaches the student document to `req.student`. This is what makes routes like `PUT /api/profile` or `POST /api/ai/analyze` "private": without a valid token from Module 1's login flow, Module 2's features are unreachable.

**Module 2 builds the digital profile on top of that identity.** The Edit Profile page writes structured data (education, skills, projects, internships, certifications, coding usernames) back to the same `Student` document via `PUT /api/profile`. The GitHub integration is a separate enrichment step: given the student's saved `githubUsername`, `githubService.js` calls the public GitHub REST API, and the result is cached directly on the student document (`githubData`) so the dashboard never needs to hit GitHub on every page load — only when the student clicks "Sync." LeetCode and HackerRank have no public official APIs, so those fields are simple manual entries on the same schema, exactly as the spec allows.

Every time profile data changes — a manual edit or a GitHub sync — `profileCompletionService.js` recalculates the weighted completion percentage and saves it on the student document, so the progress bar on the Dashboard and Digital Profile pages is always in sync with whatever was just edited. The AI analysis step (`aiService.js`) reads that same accumulated data — skills, projects, GitHub languages — and asks Gemini for a short summary, extracted skills, and improvement suggestions; it is explicitly scoped to *descriptive* analysis of the existing profile, not prediction, keeping it inside Module 2's boundary and out of the later placement-readiness model's territory.

In short: **Module 1 answers "who is this student and are they logged in," and Module 2 answers "what does this student's profile actually contain" — both live on one `Student` record, connected by the JWT issued at login.**

---

## 7. Notes for later modules

The schema and AI service were deliberately kept generic so a later "AI Analytics" module can add placement-readiness prediction, skill-gap analysis, and recruiter ranking without restructuring Module 1/2 — it would read from the same `Student` document and add its own routes/controllers rather than modifying these.

---

# Module 3 — AI Analytics

Module 3 is built **on top of** Module 1 & 2 without modifying any existing file's behavior — the only two Module 1/2 files touched were `backend/server.js` (two lines added to mount the new routes) and `backend/.env.example` (a comment clarifying the AI key is now shared). Everything else below is additive.

## What was added

**Backend**

```
backend/
├── config/
│   ├── careerRoles.js          # NEW — role → required skills dataset
│   └── readinessWeights.js     # NEW — scoring weights & category thresholds
├── controllers/
│   └── analyticsController.js  # NEW
├── middleware/
│   └── rateLimiter.js          # NEW — simple in-memory limiter for the /analyze route
├── models/
│   └── Analytics.js            # NEW — references Student via userId, doesn't duplicate it
├── routes/
│   └── analyticsRoutes.js      # NEW — reuses the EXISTING middleware/auth.js `protect`
├── services/
│   ├── readinessService.js            # NEW — 7 independent component calculators
│   ├── predictionService.js           # NEW — thin abstraction so a real ML model can
│   │                                     replace the scoring engine later without touching
│   │                                     the controller
│   ├── analyticsService.js            # NEW — combines readiness + derives strengths/weaknesses
│   ├── skillGapService.js             # NEW — compares student skills vs. a target role
│   ├── learningRecommendationService.js  # NEW — prioritized week-by-week roadmap
│   ├── projectRecommendationService.js   # NEW — project suggestions per role
│   └── aiAnalyticsService.js          # NEW — Cloud AI call with a safe, minimal payload
└── server.js                    # MODIFIED — 2 lines: require + app.use for analyticsRoutes
```

**Frontend**

```
frontend/src/
├── components/analytics/        # NEW — 8 reusable components (see spec section 18)
├── pages/AIAnalytics.jsx        # NEW
├── services/analyticsApi.js     # NEW — thin wrapper reusing the existing axios instance
├── App.jsx                      # MODIFIED — added the /analytics route
├── components/DashboardLayout.jsx  # MODIFIED — added "AI Analytics" nav link
└── pages/Dashboard.jsx          # MODIFIED — added a "View AI Analytics" quick link
```

No existing component, page, model, controller, or route was rewritten — Module 3 only reads the `Student` document Module 1/2 already maintain (skills, projects, internships, certifications, GitHub cache, coding usernames, `profileCompletion`) and writes to its own new `Analytics` collection.

## Why the architecture is explainable (not a black box)

- **`readinessService.js`** has one pure function per component (`calculateTechnicalSkillScore`, `calculateProjectScore`, etc.), each returning 0–100. `calculateOverallReadiness()` just combines them using weights pulled from `config/readinessWeights.js` — nothing is hard-coded inline, so you can retune the whole system by editing one config file.
- **`predictionService.js`** is the only place that decides *which* engine produces the score. Today it's `readinessService` (rule-based). To plug in a trained Random Forest later, you'd change the body of `predict()` to call the model and keep the same `{ overallScore, category, componentScores }` return shape — no other file needs to change.
- **The Cloud AI call never sets the number.** `aiAnalyticsService.js` receives the already-computed `readiness` object as context and is explicitly instructed to *explain* it, not invent a new score. The controller always uses `analyticsService`'s number for `readinessScore`, regardless of what the AI says.

## New REST endpoints (all require `Authorization: Bearer <token>`)

| Method | Endpoint                                | Body / Query                        | Description |
|--------|------------------------------------------|--------------------------------------|--------------|
| GET    | `/api/analytics/readiness`               | —                                     | Readiness score, category, component breakdown, strengths/weaknesses — no AI call, instant |
| POST   | `/api/analytics/skill-gap`               | `{ "targetRole": "Full Stack Developer" }` | Strong/partial/missing skills + coverage % for one role |
| GET    | `/api/analytics/career-insights`         | —                                     | Top 5 career matches ranked by skill coverage |
| GET    | `/api/analytics/learning-recommendations`| `?targetRole=...` (optional, falls back to last analyzed role) | Prioritized learning roadmap + project recs |
| GET    | `/api/analytics/cached`                  | —                                     | Last saved full analysis (no recalculation) — used on page load |
| POST   | `/api/analytics/analyze`                 | `{ "targetRole": "Full Stack Developer" }` (optional) | Full pipeline: readiness + skill gap + career insights + roadmap + project recs + AI summary. Persists to `Analytics`. Rate-limited to 5 requests/minute per student. |

Every route pulls the student from `req.student` (set by the existing `protect` middleware from the JWT) — **no route accepts a user id from the frontend.**

## Manual testing guide (Postman / curl)

1. **Get a token** — reuse your existing Module 1 login:
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"aarav.sharma@example.edu","password":"password123"}'
   # copy the "token" field from the response
   ```

2. **Readiness (no AI, instant)**
   ```bash
   curl http://localhost:5000/api/analytics/readiness \
     -H "Authorization: Bearer <TOKEN>"
   ```

3. **Skill gap for a role**
   ```bash
   curl -X POST http://localhost:5000/api/analytics/skill-gap \
     -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
     -d '{"targetRole":"Full Stack Developer"}'
   ```

4. **Invalid role (should 400)**
   ```bash
   curl -X POST http://localhost:5000/api/analytics/skill-gap \
     -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
     -d '{"targetRole":"Astronaut"}'
   ```

5. **Career insights**
   ```bash
   curl http://localhost:5000/api/analytics/career-insights \
     -H "Authorization: Bearer <TOKEN>"
   ```

6. **Full analysis (readiness + skill gap + roadmap + AI summary)**
   ```bash
   curl -X POST http://localhost:5000/api/analytics/analyze \
     -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
     -d '{"targetRole":"Full Stack Developer"}'
   ```
   Call this 6 times quickly to see the rate limiter return `429`.

7. **No token (should 401)**
   ```bash
   curl http://localhost:5000/api/analytics/readiness
   ```

8. **Missing/incomplete profile** — register a brand-new account and immediately call `/api/analytics/readiness`: you'll get a valid low score plus `"lowDataWarning": true` rather than an error, so the frontend can show "Complete your profile..." instead of breaking.

9. **Cloud AI failure / no key configured** — leave `GEMINI_API_KEY` blank in `.env` and call `/api/analytics/analyze`: it still returns `success: true` with a fallback `aiSummary` instead of failing the whole request.

I also ran the scoring/skill-gap/roadmap logic directly with `node -e` against a mock profile (Aarav Sharma's seed-data shape) while building this, confirming the readiness score, category, skill classifications, and week-numbered roadmap all come out sane before wiring them to the API — worth re-running that kind of check any time you tune the weights in `config/readinessWeights.js`.

## What Module 3 deliberately does NOT do

Per the project boundary: no recruiter dashboard, no recruiter ranking, no trained Random Forest (the architecture is ready for one via `predictionService.js`, but none is trained/shipped), no job marketplace, no automated applications, no resume generation. The AI is explicitly barred from stating placement probabilities or guaranteed outcomes — all career-facing language is hedged ("Based on your current profile...").


---

# Redesign + Validation + Module 4 — AI Career Assistant

This pass did three things on top of Modules 1-3: a full UI redesign, an app-wide validation system, and a new Module 4 chatbot. **No existing Module 1-3 endpoint was removed or renamed** — the changes below are additive, plus a small number of surgical edits (listed under "Files modified") to wire validation and the new design system into existing pages.

## A. Files created

**Backend**
- `models/ChatConversation.js` — Module 4 chat history
- `services/careerAssistantService.js` — Cloud AI integration for the assistant (safe context, mode-aware prompting, response sanitization)
- `controllers/careerAssistantController.js`, `routes/careerAssistantRoutes.js` — chat/interview/roadmap/learning-plan/history endpoints
- `utils/validators.js` — shared backend validation patterns (name, password strength, roll no, GitHub username, LinkedIn URL, CGPA, generic URL)
- `middleware/validateProfile.js` — validates the entire profile-update payload before it touches the DB

**Frontend**
- `context/ToastContext.jsx` — global toast notifications
- `components/Modal.jsx`, `components/ConfirmDialog.jsx`, `components/EmptyState.jsx`, `components/LoadingSkeleton.jsx`, `components/PageHeader.jsx`, `components/FormField.jsx`
- `components/chat/ChatMessage.jsx`, `components/chat/TypingIndicator.jsx`
- `hooks/useFormValidation.js` — shared form state + validate-on-blur/change/submit logic
- `utils/validators.js` (frontend mirror of the backend rules), `utils/apiError.js` (status-code → friendly message mapping)
- `services/careerAssistantApi.js`
- `pages/CareerAssistant.jsx` — the Module 4 chat page

## B. Files modified

- `backend/server.js` — mounted `careerAssistantRoutes` at `/api/career-assistant`
- `backend/routes/authRoutes.js` — strong password / name-format / year-whitelist validation
- `backend/routes/profileRoutes.js` — wired in `validateProfileUpdate`
- `backend/services/githubService.js`, `backend/controllers/githubController.js` — spec-exact error messages ("GitHub profile not found...") with correct status codes (400 vs 502)
- `backend/controllers/analyticsController.js` — target-role error message aligned to spec wording
- `frontend/src/styles/tokens.css` — full redesign (light modern SaaS theme, dark-indigo sidebar, indigo/purple/cyan gradient accents, toast/modal/skeleton/step-indicator/chat CSS)
- `frontend/src/main.jsx` — mounted `ToastProvider`
- `frontend/src/context/AuthContext.jsx` — listens for a global session-expired event; `register()` now optionally saves Step-3 professional info right after account creation
- `frontend/src/api/axios.js` — broadcasts a `session-expired` event on 401, added request timeout
- `frontend/src/App.jsx` — added `/career-assistant` route
- `frontend/src/components/DashboardLayout.jsx`, `SectionCard.jsx`, `ProgressBar.jsx`, `ProtectedRoute.jsx` — redesigned for the new theme; sidebar got an "AI Career Assistant" nav item
- `frontend/src/pages/Landing.jsx`, `Login.jsx`, `Register.jsx` (now a 3-step wizard), `Dashboard.jsx`, `MyProfile.jsx`, `EditProfile.jsx`, `Integrations.jsx` — redesigned + validation/toasts wired in

## C. APIs added/modified

New (Module 4, all JWT-protected):

| Method | Endpoint | Body | Notes |
|--------|----------|------|-------|
| POST | `/api/career-assistant/chat` | `{ message, conversationId? }` | Free-form Q&A |
| POST | `/api/career-assistant/interview` | `{ message, conversationId? }` | Mock interview mode |
| POST | `/api/career-assistant/roadmap` | `{ targetRole?, conversationId? }` | Returns `roadmapSteps[]` too |
| POST | `/api/career-assistant/learning-plan` | `{ topic, conversationId? }` | |
| GET | `/api/career-assistant/history` | — | Summary list |
| GET | `/api/career-assistant/history/:id` | — | Full conversation |
| DELETE | `/api/career-assistant/history/:id` | — | Delete one |
| DELETE | `/api/career-assistant/history` | — | Clear all |

All four AI-driven routes share a 15-requests/minute-per-student rate limit (spec: "Please wait a moment before sending another request.").

Modified (validation only — same URL/method/response shape):
- `POST /api/auth/register` — stricter validation (see below)
- `PUT /api/profile` — now runs `validateProfileUpdate` first
- `POST /api/github/sync` — improved error messages/status codes

## D. Database changes

- New collection: `chatconversations` (via `ChatConversation` model) — `{ userId, title, messages: [{role, content, suggestedActions, mode, timestamp}] }`. References `Student` by `userId`; nothing on the `Student` schema changed.

## E. Environment variables required

No new variables — Module 4 reuses `GEMINI_API_KEY` / `GEMINI_MODEL` already used by Modules 2 & 3. See the updated comment in `backend/.env.example`.

## F. Installation commands

```bash
cd backend && npm install     # express-validator etc. already in package.json from Module 1
cd ../frontend && npm install lucide-react   # new: icon library for the redesigned UI
```
(`npm install` alone in `frontend/` also works if you run it after pulling this update, since `lucide-react` is now listed in `package.json`.)

## G. Run commands

Unchanged from Modules 1-3:
```bash
cd backend && npm run dev      # http://localhost:5000
cd frontend && npm run dev     # http://localhost:5173
```

## H. Testing checklist

**Validation (backend, verified with `node -e` scripts against `utils/validators.js` and `middleware/validateProfile.js`):**
- ✅ Name regex accepts "Aarav Sharma", rejects "A1 23"
- ✅ Password regex rejects "password", accepts "Passw0rd!"
- ✅ GitHub username regex rejects "-bad-", accepts "octocat"
- ✅ LinkedIn regex rejects "abc123", accepts a real LinkedIn URL
- ✅ `validateProfileUpdate` rejects an education entry with `endYear < startYear` and a bad CGPA, with per-field messages; accepts a valid payload and de-duplicates skills case-insensitively

**Module 4 (verified with `node -e` scripts against `careerAssistantService.js`):**
- ✅ `buildSafeContext` never includes password, email, or roll number in the AI payload
- ✅ `sanitizeResponse` drops non-string suggested actions and malformed roadmap steps, and returns an empty message (triggering the fallback) for a non-string `message`

**Manual (do this yourself once a live MongoDB is connected):**
- [ ] Full register (all 3 steps) → login → dashboard flow
- [ ] Duplicate email on register → correct error
- [ ] Weak password on register → strength meter + rejection
- [ ] Invalid roll number, CGPA, education year order, project URL on Edit Profile → inline + summary errors, backend also rejects if bypassed
- [ ] GitHub sync with a bad/nonexistent username → friendly error, no crash
- [ ] Career Assistant: send a chat message, switch to Interview/Roadmap/Learning Plan modes, delete a conversation, clear all history
- [ ] Send 20 chat messages in under a minute → 429 with the spec's exact message
- [ ] Expire/remove the JWT then make any request → toast "Your session has expired..." + redirect to login

## I. Summary of Module 1-4 functionality

- **Module 1** — registration (now a 3-step wizard with strong password + name/roll-number validation), login, logout, JWT auth, protected routes, profile CRUD — all unchanged in behavior, strengthened in validation.
- **Module 2** — digital profile, skills/projects/internships/certifications, GitHub sync (now with spec-exact error handling), profile completion — unchanged in behavior, validated end-to-end on save.
- **Module 3** — placement readiness scoring, skill gap analysis, career insights, learning/project recommendations, AI profile analysis — untouched.
- **Module 4 (new)** — an AI Career Assistant chatbot personalized with the student's actual profile and Module 3 analytics (never their password/JWT/email), supporting free-form chat, a mock-interview mode, a career-roadmap generator, and topic-specific learning plans, with persisted, resumable, deletable conversation history.

The whole app now shares one visual design system (light, indigo/purple/cyan-accented, dark sidebar), one toast/error-handling layer, and one validation approach (shared regex rules mirrored frontend/backend) across all four modules.

---

# UI/UX Redesign + Gemini AI Integration (latest pass)

This pass changed **presentation only** — no route, controller, model, or business-logic file was touched beyond swapping the AI provider underneath the three existing AI services. Every API contract, response shape, and page behavior is identical to before.

## New visual design — "Aurora"

A from-scratch, unique palette chosen to avoid the generic indigo/purple SaaS look and the "gaming neon" look equally:

- **Surfaces**: warm ivory paper (`#faf7f1`) instead of clinical white/gray, with a deep aubergine-black (`#1c1530`) sidebar for contrast.
- **Accent**: a three-tone "aurora" gradient — teal (`#0e8272`) → violet (`#7c3aed`) → coral (`#ef7a54`) — used only for primary buttons, active nav state, and AI-highlight cards, never as a page-wide background.
- **Typography**: Fraunces (a warm serif) for headings and big numbers, paired with Inter for body text — an editorial pairing distinct from the all-sans-serif template look.
- **Glass effect**: `.card.ai-glow` (used for the Placement Readiness card, AI Insight panels, and the Career Assistant header) now has genuine glassmorphism — a translucent white layer over soft aurora-colored radial gradients with `backdrop-filter: blur()`.
- **AI visuals**: `ReadinessScore.jsx` now renders a true animated SVG gradient ring (score-dependent gradient + soft glow) instead of a flat-color arc; `LearningRoadmap.jsx` is now a connected numbered timeline.
- All existing component class names (`.card`, `.btn.brass`, `.nav-item-active`, `.chat-bubble`, etc.) were preserved, so the re-skin is a token/CSS change, not a component rewrite — every page automatically picked up the new look.

## Gemini AI integration

All three AI-powered features (Module 2 profile analysis, Module 3 placement-analytics narrative, Module 4 career assistant) now call **Google Gemini** instead of Anthropic Claude, through one shared wrapper:

- `backend/services/geminiClient.js` — the only file that imports `@google/genai` or reads `GEMINI_API_KEY`. Every AI service (`aiService.js`, `aiAnalyticsService.js`, `careerAssistantService.js`) calls `geminiClient.generateJson(...)` and never touches the SDK or the key directly.
- **Security**: `GEMINI_API_KEY` is read via `process.env` on the backend only. It is never included in any API response, never referenced in any frontend file, and there is nothing in `frontend/.env` that could leak it — confirmed by grepping the whole `frontend/src` tree for the string "GEMINI" (zero matches).
- **No behavior change**: each service's function signature, return shape, and graceful-fallback-on-failure behavior (used when the key is missing or the API call fails) are unchanged — only the HTTP call underneath was swapped.
- Verified with `node -e` scripts: all three services still return their correct fallback shape with no key configured, and a configured-but-unreachable key (this sandbox has no network access to Google's API) is caught and falls back gracefully rather than crashing the request.

### Environment variable change

```
# Before
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6

# Now
GEMINI_API_KEY=            # get one free at https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-flash-latest
```

### New dependency

```bash
cd backend && npm install   # @google/genai is now in package.json
```

**Note:** live Gemini API calls could not be tested end-to-end in this sandbox (no network access to `generativelanguage.googleapis.com` here) — the integration was verified by inspecting the installed SDK's real type definitions (not from memory) and by exercising the request-building, JSON-parsing, and error-fallback code paths directly. Run one real request with your own `GEMINI_API_KEY` once deployed to confirm end-to-end.

---

# Troubleshooting: "I can't log in / sign up — I see an error and can't get to the next page"

This almost always means the backend never actually connected to MongoDB, even though `npm run dev` printed "🚀 EduVerse API running...". Here's why: the Express server itself starts immediately, but the database connection happens separately — if MongoDB isn't reachable, every register/login request needs the database and will fail (older versions of this project would hang silently for up to 30 seconds before failing; `config/db.js` now fails within ~8 seconds with a clear message).

**How to check:** look at your backend terminal right after starting it. If you see:
```
❌ MongoDB connection error: connect ECONNREFUSED 127.0.0.1:27017
```
...then MongoDB is not running/reachable at the address in `MONGO_URI`. Fix with **one** of these:

### Option A — MongoDB Atlas (easiest, no install)
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Get its connection string (looks like `mongodb+srv://user:password@cluster.mongodb.net/eduverse`)
3. Paste it into `backend/.env` as `MONGO_URI=...`
4. Restart the backend (`npm run dev`)

### Option B — Local MongoDB
1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Start it (`mongod` in a terminal, or as a background service)
3. Keep `MONGO_URI=mongodb://127.0.0.1:27017/eduverse` in `backend/.env`
4. Restart the backend

**Other things to check if login/register still fails after MongoDB connects:**
- Confirm `frontend/.env` exists and contains `VITE_API_URL=http://localhost:5000/api` — if this file is missing, the frontend still works via a built-in default pointing at `localhost:5000`, but it's worth confirming if you changed ports.
- Confirm `backend/.env`'s `CLIENT_URL` matches the URL your frontend actually runs on (Vite's default is `http://localhost:5173`) — a mismatch here causes CORS errors, which also show up as a login failure.
- Open your browser's DevTools → Network tab while trying to log in. A "Failed to fetch" / red request means the backend isn't reachable at all (check it's actually running); a request that completes with a 4xx/5xx status will show the actual error message from the backend.

## Note on the Gemini API key in this delivery

The `GEMINI_API_KEY` in `backend/.env` is the one you provided, included as requested. However, it doesn't match the standard Gemini API key format — real keys from [Google AI Studio](https://aistudio.google.com/apikey) always start with `AIzaSy` and are 39 characters long; the key provided is 53 characters and starts with `AQ.`, which looks like it may be a different kind of Google credential (e.g. an OAuth token) rather than an API key. The app will still run fine either way — every AI feature (Module 2 analysis, Module 3 insights, Module 4 chat) has a built-in fallback and will simply show a "temporarily unavailable" message instead of crashing if the key doesn't work. If you want live AI responses, generate a fresh key at the link above and drop it into `backend/.env`.

---

## Update: Certificate uploads + "Neural" AI UI

### Certificate upload module
- **Edit Profile → Certifications** now has, per certificate: title, issuer, issue date, credential URL and a **drag-and-drop file upload** (PDF / PNG / JPG / WebP, max 5 MB) with progress bar, replace, view and remove.
- Files are uploaded immediately to `POST /api/profile/certificate-file` and attached to the certificate when you press **Save profile** (unsaved uploads show a "Save profile to keep this file" flag).
- `DELETE /api/profile/certificate-file?url=…` discards an upload that was never saved (called automatically when you replace/remove it). Files that are removed from a saved certificate are deleted from disk on save.
- **Security:** extension + MIME allow-list, magic-byte signature check, random unguessable filenames, ownership check (a student can only attach files they uploaded), `nosniff` header on `/uploads`.
- **My Profile** and **Digital Profile** show certificates as cards with "View certificate" / "Verify credential" links (image files show a thumbnail).
- Reusable component: `frontend/src/components/FileUploader.jsx` (pass a different `uploadUrl`/`accept` to reuse it for other documents).
- Files live in `backend/uploads/certificates/` (swap multer disk storage for S3/Cloudinary in production).

### UI redesign
- Dark "Neural" theme: design tokens in `frontend/src/styles/tokens.css` (values changed, variable names kept so all components still work) plus an **AI effects layer** at the bottom of that file: animated aurora + grid backdrop, glass cards with cursor spotlight, rotating gradient borders on AI cards, shimmering gradient text, glow buttons, pulsing AI sparkles, scan-line on the landing preview.
- `components/NeuralBackground.jsx` — interactive neural-network particle canvas behind the app (static frame with `prefers-reduced-motion`).
- `hooks/useSpotlight.js` — cursor spotlight for cards.
- Fonts changed to Space Grotesk / Inter / JetBrains Mono (`index.html`).
- Fix: profile photos are now resolved against the API origin (`utils/assetUrl.js`); previously `/uploads/...` pointed at the Vite dev server.

---

## Placement drive workflow (Recruiter → TPO → Students)

Three new account types sit alongside students, all using the same login:

| Role | How the account is created | Lands on |
|------|----------------------------|----------|
| `recruiter` | Self-register at `/register-recruiter` | `/recruiter` |
| `tpo` | Created on server start from `TPO_EMAIL` / `TPO_PASSWORD` in `backend/.env` | `/tpo` |
| `admin` | Unchanged (`ADMIN_EMAIL` / `ADMIN_PASSWORD`); can also use the TPO screens | `/admin` |

### Flow

1. **Recruiter adds company + eligibility** (`/recruiter/drives/new`): company, role, CTC, min CGPA, branches, years, deadline, rounds → drive status `pending`.
2. **TPO verifies** (`/tpo/drives/:id`): approves (optionally adjusting eligibility; sees how many students qualify) or sends it back with a note → `approved` / `rejected`. A rejected drive can be edited and resubmitted by the recruiter.
3. **Approved drive appears to eligible students** (`/drives`): filtered server-side by CGPA (best CGPA in the student's education entries), branch and year.
4. **Students apply** — one application per drive, blocked after the deadline or when ineligible.
5. **Recruiter conducts test/interview** — records each round's result and a recommend / don't-recommend decision per applicant, then **submits results to the TPO** → `results_submitted`.
6. **TPO finalizes** — selection is pre-filled from recommendations; the TPO adjusts and publishes → `finalized`.
7. **Students get the final result** on `/applications` and on their dashboard's Placements card. Before finalization they only see "Applied" / "Result under review" — recruiter evaluations are never exposed to students.

### New API (all role-protected server-side)

- `POST /api/auth/register-recruiter`
- `/api/recruiter/*` — stats, drives CRUD, rounds, `PATCH …/applications/:id` (evaluate), `POST …/submit-results`
- `/api/tpo/*` — stats, drives, `PATCH …/review`, `POST …/finalize`
- `/api/placement/*` — student summary, eligible drives, apply, my applications

### Note on eligibility

Students must have a CGPA in **Edit Profile → Education** to match drives with a CGPA cut-off.

### Resume PDF (students)

A **Download resume (PDF)** button on the student dashboard (and on **Resume** in the sidebar) builds the PDF in the browser from the student's profile. It is ATS-friendly: real selectable text, one column, standard section names (Summary, Education, Technical Skills, Experience, Projects, Certifications), plain bullets, standard Helvetica fonts, no images or tables. The Resume page lets the student edit the summary and hide sections before downloading.

Uses the `pdf-lib` package. After pulling these changes run `npm install` in `frontend/` once.

## TPO student directory

TPO / admin accounts get **Students** (`/tpo/students`): every registered student's submitted data from MongoDB, with
search (name, roll no, email, skills, projects, companies, certificates) and filters (branch, year, college, skills,
min CGPA, profile completion, account status, has projects/internships/certifications/GitHub/LinkedIn), sorting and
pagination. Click a row for the full profile, resume PDF and drive applications.

API (role `tpo`/`admin`): `GET /api/tpo/students`, `GET /api/tpo/students/facets`, `GET /api/tpo/students/:id`.
