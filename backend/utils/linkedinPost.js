const axios = require("axios");

const TYPES = { activity: "activity", share: "share", ugcpost: "ugcPost" };

/** Post URN from a full LinkedIn post link, or null. Mirrors linkedinPostUrn in the frontend validators. */
const urnFromLinkedinUrl = (url) => {
  const m = String(url).match(/^https:\/\/([a-z]+\.)?linkedin\.com\/posts\/[^\s"']*(activity|share|ugcPost)-(\d{6,25})/i);
  return m ? `urn:li:${TYPES[m[2].toLowerCase()]}:${m[3]}` : null;
};

// Only this exact URL shape is ever requested, so students cannot make the server fetch other hosts.
const isShortLink = (url) => /^https:\/\/lnkd\.in\/[A-Za-z0-9_-]{1,32}\/?$/.test(String(url));

/** Follows one lnkd.in redirect, without visiting the target, and returns its post URN or null. */
const resolveShortLink = async (url) => {
  const res = await axios.get(url, {
    maxRedirects: 0,
    timeout: 8000,
    validateStatus: () => true,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36" },
  });
  return urnFromLinkedinUrl(res.headers.location || "");
};

module.exports = { urnFromLinkedinUrl, isShortLink, resolveShortLink };
