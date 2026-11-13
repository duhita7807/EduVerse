// Self-check for LinkedIn post link parsing. No network. Run: node scripts/selfcheckLinkedinPost.js
const assert = require("assert");
const { urnFromLinkedinUrl, isShortLink } = require("../utils/linkedinPost");

const id = "7521608951222657024";
assert.strictEqual(urnFromLinkedinUrl(`https://www.linkedin.com/posts/a-b_java-share-${id}-IKLj/?utm_source=share`), `urn:li:share:${id}`);
assert.strictEqual(urnFromLinkedinUrl(`https://www.linkedin.com/posts/a-b_x-activity-${id}-abcd`), `urn:li:activity:${id}`);
assert.strictEqual(urnFromLinkedinUrl(`https://in.linkedin.com/posts/a-b_x-ugcPost-${id}-abcd`), `urn:li:ugcPost:${id}`);
assert.strictEqual(urnFromLinkedinUrl(`https://www.linkedin.com/posts/share-1234567-topic_x-activity-${id}-abcd`), `urn:li:activity:${id}`, "real id wins over a slug");
assert.strictEqual(urnFromLinkedinUrl(`https://evil.com/linkedin.com/posts/x-share-${id}`), null, "other hosts rejected");
assert.strictEqual(urnFromLinkedinUrl(`https://linkedin.com.evil.com/posts/x-share-${id}`), null, "lookalike host rejected");
assert.strictEqual(urnFromLinkedinUrl(""), null);

assert.ok(isShortLink("https://lnkd.in/dn82ejKD"));
for (const bad of ["http://lnkd.in/x", "https://lnkd.in.evil.com/x", "https://evil.com/lnkd.in/x", "https://lnkd.in/x/../y", "https://lnkd.in/x?u=http://127.0.0.1", "https://user@lnkd.in/x"]) {
  assert.ok(!isShortLink(bad), bad);
}
console.log("LINKEDIN POST CHECKS PASSED");
