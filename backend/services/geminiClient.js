const { GoogleGenAI } = require("@google/genai");

/**
 * Single shared Gemini client for the whole backend. The API key is read
 * from process.env.GEMINI_API_KEY ONLY on the server — it is never sent to,
 * or readable by, the frontend. Every AI-powered feature (Module 2 profile
 * analysis, Module 3 placement analytics, Module 4 career assistant) calls
 * through this one wrapper instead of talking to the Gemini SDK directly,
 * so the API key, model name, timeout and JSON-parsing/error behavior stay
 * in exactly one place.
 */
let client = null;
let warnedAboutKeyShape = false;

/**
 * Real Gemini Developer API keys (from https://aistudio.google.com/apikey)
 * are always 39 characters starting with "AIzaSy". If GEMINI_API_KEY is set
 * but doesn't match that shape, it's some other kind of Google credential
 * (an OAuth access token, a different product's key, etc.) and every Gemini
 * call WILL fail — but because every caller in this codebase catches the
 * error and falls back to a static response, that failure is invisible to
 * the user; they just see every "AI" feature quietly stuck on fallback
 * content. Log this once, loudly, at the point of first use so it's not
 * mistaken for a code bug.
 */
const isValidKeyShape = (key) => /^AIzaSy[A-Za-z0-9_-]{33}$/.test(key);

const warnInvalidKeyShape = (key) => {
  if (warnedAboutKeyShape) return;
  warnedAboutKeyShape = true;
  console.error(
    "⚠️  GEMINI_API_KEY does not look like a real Gemini Developer API key " +
      "(expected 39 characters starting with 'AIzaSy'). Every AI feature " +
      "(profile analysis, placement analytics, career assistant) will keep " +
      "failing until this is replaced. Get a real key at " +
      `https://aistudio.google.com/apikey — current value looks like: ` +
      `"${key.slice(0, 6)}...${key.slice(-4)}" (${key.length} chars).`
  );
};

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
};

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

const getModelName = () => process.env.GEMINI_MODEL || "gemini-flash-latest";

/**
 * Calls Gemini and returns the parsed JSON object from its response.
 * Throws on any failure (no key configured, network error, empty response,
 * unparseable JSON) — every caller in this codebase wraps this in a
 * try/catch and falls back to a safe static response, so a Gemini outage
 * never breaks a request.
 *
 * @param {object} options
 * @param {string} options.systemPrompt - system instruction (persona + required JSON shape)
 * @param {string|Array} options.contents - a single user prompt string, OR a full
 *   Gemini `Content[]` array (role: "user" | "model") for multi-turn conversations
 * @param {number} [options.maxOutputTokens]
 * @param {number} [options.temperature]
 * @param {number} [options.timeoutMs]
 */
const generateJson = async ({
  systemPrompt,
  contents,
  maxOutputTokens = 1200,
  temperature = 0.6,
  timeoutMs = 25000,
}) => {
  const ai = getClient();
  if (!ai) {
    const err = new Error("GEMINI_API_KEY is not configured");
    err.code = "GEMINI_NOT_CONFIGURED";
    throw err;
  }

  // Fail fast and distinguishably on a clearly-malformed key, rather than
  // spending a network round-trip only to get a generic auth failure back
  // from Google's API — this is exactly the state this codebase has been
  // shipped in (a non-Gemini credential in GEMINI_API_KEY), and every
  // caller needs to be able to tell this apart from a transient failure.
  if (!isValidKeyShape(process.env.GEMINI_API_KEY)) {
    warnInvalidKeyShape(process.env.GEMINI_API_KEY);
    const err = new Error("GEMINI_API_KEY is set but does not look like a valid Gemini API key");
    err.code = "GEMINI_INVALID_KEY";
    throw err;
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await ai.models.generateContent({
      model: getModelName(),
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        maxOutputTokens,
        temperature,
        abortSignal: controller.signal,
      },
    });

    const text = response.text;
    if (!text || !text.trim()) {
      throw new Error("Gemini returned an empty response");
    }

    // Defensive cleanup: the model is asked for raw JSON, but strip markdown
    // fences if it adds them anyway.
    const cleaned = text.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(cleaned);
    } catch (parseErr) {
      throw new Error("Gemini returned an unparseable response");
    }
  } finally {
    clearTimeout(timeoutHandle);
  }
};

module.exports = { generateJson, isConfigured, getModelName, isValidKeyShape };
