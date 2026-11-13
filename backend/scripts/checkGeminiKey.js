// Checks whether GEMINI_API_KEY in backend/.env works, and says how to fix it if not.
// Prints only the key's prefix and length, never the key. Run: node scripts/checkGeminiKey.js
require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const key = (process.env.GEMINI_API_KEY || "").trim();
const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

(async () => {
  if (!key) {
    console.log("✗ GEMINI_API_KEY is empty in backend/.env");
    return process.exit(1);
  }
  console.log(`Key: ${key.slice(0, 6)}… (${key.length} chars). Expected: starts with "AIzaSy", 39 chars.`);
  if (!/^AIzaSy[A-Za-z0-9_-]{33}$/.test(key)) {
    console.log("✗ This is not a Gemini API key. Create one at https://aistudio.google.com/apikey (\"Create API key\"), paste it into backend/.env as GEMINI_API_KEY=AIzaSy..., then restart the backend.");
    return process.exit(1);
  }
  try {
    const r = await new GoogleGenAI({ apiKey: key }).models.generateContent({ model, contents: "Reply with the single word: ok" });
    console.log(`✓ Gemini works with model "${model}": ${r.text.trim().slice(0, 20)}`);
    console.log("Restart the backend so the running server picks up the key.");
  } catch (e) {
    const msg = String(e.message);
    console.log(`✗ Google rejected the request: ${msg.slice(0, 200)}`);
    if (/not found|NOT_FOUND/i.test(msg)) console.log(`  The model "${model}" isn't available; set GEMINI_MODEL=gemini-2.5-flash in backend/.env.`);
    else if (/quota|RESOURCE_EXHAUSTED/i.test(msg)) console.log("  The key works but its free quota is used up; wait or enable billing.");
    else console.log("  Create a new key at https://aistudio.google.com/apikey and replace GEMINI_API_KEY in backend/.env.");
    process.exit(1);
  }
})();
