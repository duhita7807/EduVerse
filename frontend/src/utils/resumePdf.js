import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Builds an ATS-friendly resume PDF from a student profile, entirely in the
 * browser (pdf-lib, no server round-trip).
 *
 * "ATS-friendly" here means what applicant-tracking parsers actually need:
 *  - real, selectable text in reading order (no images, no text-as-graphics);
 *  - one column, no tables, text boxes, icons or multi-column tricks;
 *  - standard section names (Summary, Education, Technical Skills, Experience,
 *    Projects, Certifications) and plain "•" bullets;
 *  - standard base-14 fonts (Helvetica), so nothing depends on embedded fonts;
 *  - links written out as plain text, document title/author set in metadata.
 */

const W = 595.28; // A4
const H = 841.89;
const MX = 44;
const MT = 46;
const MB = 46;
const CW = W - MX * 2;
const INK = rgb(0.07, 0.07, 0.07);
const SOFT = rgb(0.33, 0.33, 0.33);

// Characters the standard fonts can't draw are mapped to a plain equivalent or dropped.
const MAP = {
  "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"', "\u00A0": " ", "\u2192": "->",
  "\u2713": "", "\u2714": "", "\u200B": "", "\t": " ", "\u2022": "\u2022",
};

const monthYear = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "");
const stripProto = (u = "") => String(u).replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
const range = (a, b, openEnded) => [a, b || (openEnded && a ? "Present" : "")].filter(Boolean).join(" - ");

export const resumeFileName = (name) => `${String(name || "Resume").trim().replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "") || "Resume"}_Resume.pdf`;

/**
 * @param {object} p        student profile (as returned by GET /api/profile)
 * @param {object} [opts]   { summary?: string, sections?: { education, skills, projects, internships, certifications } }
 * @returns {Promise<Uint8Array>} the PDF bytes
 */
export async function generateResumePdf(p, opts = {}) {
  const show = { education: true, skills: true, projects: true, internships: true, certifications: true, ...(opts.sections || {}) };
  const summary = (opts.summary ?? p.bio ?? "").trim();

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const allowed = new Set(regular.getCharacterSet());

  const clean = (t) =>
    Array.from(String(t ?? "").replace(/\r/g, ""))
      .map((ch) => {
        if (ch === "\n") return ch;
        if (MAP[ch] !== undefined) return MAP[ch];
        return allowed.has(ch.codePointAt(0)) ? ch : "";
      })
      .join("");

  pdf.setTitle(`${clean(p.name) || "Student"} - Resume`);
  pdf.setAuthor(clean(p.name) || "Student");
  pdf.setSubject("Resume");
  pdf.setProducer("EduVerse");
  pdf.setCreator("EduVerse");

  let page;
  let y;
  const newPage = () => {
    page = pdf.addPage([W, H]);
    y = H - MT;
  };
  newPage();
  const need = (h) => { if (y - h < MB) newPage(); };

  // Greedy word wrap that also hard-breaks single words wider than the line (long URLs).
  const wrap = (text, font, size, maxW) => {
    const lines = [];
    for (const para of clean(text).split("\n")) {
      let line = "";
      for (let word of para.split(/\s+/).filter(Boolean)) {
        while (font.widthOfTextAtSize(word, size) > maxW) {
          let cut = word.length;
          while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > maxW) cut -= 1;
          if (line) { lines.push(line); line = ""; }
          lines.push(word.slice(0, cut));
          word = word.slice(cut);
        }
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, size) <= maxW) line = test;
        else { lines.push(line); line = word; }
      }
      lines.push(line);
    }
    return lines.length ? lines : [""];
  };

  const draw = (t, x, { font = regular, size = 10, color = INK } = {}) => page.drawText(t, { x, y: y - size, size, font, color });
  const lh = (size) => size * 1.34;

  const centered = (t, opts2 = {}) => {
    const { font = regular, size = 10 } = opts2;
    wrap(t, font, size, CW).forEach((ln) => {
      need(lh(size));
      draw(ln, (W - font.widthOfTextAtSize(ln, size)) / 2, opts2);
      y -= lh(size);
    });
  };

  const heading = (title) => {
    need(46);
    y -= 9;
    draw(title.toUpperCase(), MX, { font: bold, size: 10.5 });
    y -= lh(10.5) - 1;
    page.drawLine({ start: { x: MX, y: y + 1 }, end: { x: MX + CW, y: y + 1 }, thickness: 0.8, color: INK });
    y -= 5;
  };

  // "left ............ right" on one line; left wraps if it is too long.
  const row = (left, right, { leftFont = bold, size = 10.5, rightFont = regular } = {}) => {
    const r = clean(right);
    const rw = r ? rightFont.widthOfTextAtSize(r, 9.5) : 0;
    const lines = wrap(left, leftFont, size, CW - rw - (rw ? 14 : 0));
    lines.forEach((ln, i) => {
      need(lh(size));
      draw(ln, MX, { font: leftFont, size });
      if (i === 0 && r) page.drawText(r, { x: MX + CW - rw, y: y - 9.5, size: 9.5, font: rightFont, color: SOFT });
      y -= lh(size);
    });
  };

  const para = (text, { font = regular, size = 10, color = INK, x = MX, indent = 0 } = {}) => {
    wrap(text, font, size, CW - (x - MX) - indent).forEach((ln) => {
      need(lh(size));
      draw(ln, x + indent, { font, size, color });
      y -= lh(size);
    });
  };

  const bullets = (text) => {
    const items = clean(text).split("\n").map((s) => s.replace(/^\s*[-*\u2022]\s*/, "").trim()).filter(Boolean);
    items.forEach((item) => {
      const lines = wrap(item, regular, 10, CW - 16);
      lines.forEach((ln, i) => {
        need(lh(10));
        if (i === 0) draw("\u2022", MX + 3, { size: 10 });
        draw(ln, MX + 15, { size: 10 });
        y -= lh(10);
      });
    });
  };

  // ---------- Header ----------
  centered(p.name || "Student", { font: bold, size: 21 });
  const contact = [p.email, p.githubUsername && `github.com/${p.githubUsername}`, p.linkedinProfile && stripProto(p.linkedinProfile)].filter(Boolean).join("  |  ");
  if (contact) centered(contact, { size: 9.5 });
  const school = [p.college, p.branch, p.year].filter(Boolean).join("  |  ");
  if (school) centered(school, { size: 9.5 });

  // ---------- Summary ----------
  if (summary) {
    heading("Summary");
    para(summary);
  }

  // ---------- Education ----------
  const education = p.education || [];
  if (show.education && education.length) {
    heading("Education");
    education.forEach((e) => {
      need(40);
      row(e.institution || "", range(e.startYear, e.endYear));
      const degree = [e.degree, e.branch].filter(Boolean).join(", ");
      if (degree || e.cgpa != null) row(degree, e.cgpa != null ? `CGPA: ${e.cgpa}` : "", { leftFont: regular, size: 10 });
      y -= 3;
    });
  }

  // ---------- Technical skills ----------
  const groups = [
    ["Languages", p.skills?.programmingLanguages],
    ["Web", p.skills?.webTechnologies],
    ["Databases", p.skills?.databases],
    ["Tools", p.skills?.tools],
  ].filter(([, v]) => v?.length);
  if (show.skills && groups.length) {
    heading("Technical Skills");
    const col = Math.max(...groups.map(([l]) => bold.widthOfTextAtSize(`${l}:`, 10))) + 10;
    groups.forEach(([label, list]) => {
      const lines = wrap(list.join(", "), regular, 10, CW - col);
      lines.forEach((ln, i) => {
        need(lh(10));
        if (i === 0) draw(`${label}:`, MX, { font: bold, size: 10 });
        draw(ln, MX + col, { size: 10 });
        y -= lh(10);
      });
    });
  }

  // ---------- Experience ----------
  const internships = p.internships || [];
  if (show.internships && internships.length) {
    heading("Experience");
    internships.forEach((x) => {
      need(46);
      row([x.role, x.company].filter(Boolean).join(", "), range(monthYear(x.startDate), monthYear(x.endDate), true));
      if (x.description) bullets(x.description);
      y -= 4;
    });
  }

  // ---------- Projects ----------
  const projects = p.projects || [];
  if (show.projects && projects.length) {
    heading("Projects");
    projects.forEach((x) => {
      need(58);
      row(x.title || "", "");
      if (x.technologies?.length) para(`Technologies: ${x.technologies.join(", ")}`, { font: italic, size: 9.5, color: SOFT });
      const links = [x.githubRepo && `GitHub: ${stripProto(x.githubRepo)}`, x.liveDemo && `Demo: ${stripProto(x.liveDemo)}`].filter(Boolean).join("   ");
      if (links) para(links, { size: 9.5, color: SOFT });
      if (x.description) bullets(x.description);
      y -= 4;
    });
  }

  // ---------- Certifications ----------
  const certs = (p.certifications || []).filter((c) => c.verificationStatus !== "rejected");
  if (show.certifications && certs.length) {
    heading("Certifications");
    certs.forEach((c) => {
      const label = [c.title, c.issuedBy].filter(Boolean).join(" - ") + (c.verificationStatus === "verified" ? " (Verified)" : "");
      row(label, monthYear(c.issueDate), { leftFont: regular, size: 10 });
    });
  }

  return pdf.save();
}

/** Triggers a browser download of the given PDF bytes. */
export const savePdf = (bytes, fileName) => {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
