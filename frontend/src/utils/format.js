export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** ISO date -> value for <input type="datetime-local"> in local time. */
export const toLocalInput = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const JOB_TYPE_LABEL = { "full-time": "Full-time", internship: "Internship", "internship-ppo": "Internship + PPO" };

export const eligibilitySummary = (e = {}) => {
  const parts = [];
  parts.push(e.minCgpa > 0 ? `CGPA ≥ ${e.minCgpa}` : "No CGPA cut-off");
  parts.push(e.branches?.length ? e.branches.join(", ") : "All branches");
  parts.push(e.years?.length ? e.years.join(", ") : "All years");
  return parts.join(" · ");
};
