import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Users, Plus, RotateCcw } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import StudentDetailPanel from "../../components/StudentDetailPanel.jsx";
import { SkeletonLine } from "../../components/LoadingSkeleton.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { tpoApi } from "../../services/placementApi.js";
import { getErrorMessage } from "../../utils/apiError.js";
import { assetUrl } from "../../utils/assetUrl.js";
import "../../styles/students.css";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const HAS_OPTIONS = [
  ["projects", "Has projects"],
  ["internships", "Has internships"],
  ["certifications", "Has certifications"],
  ["github", "Has GitHub"],
  ["linkedin", "Has LinkedIn"],
];
const SORT_OPTIONS = [
  ["name", "Name (A–Z)"],
  ["rollNo", "Roll no."],
  ["cgpa", "CGPA (high → low)"],
  ["completion", "Profile completion"],
  ["newest", "Recently registered"],
  ["oldest", "Earliest registered"],
];
const PAGE_SIZES = [20, 50, 100];

const EMPTY_FILTERS = { branch: "", college: "", year: "", status: "", minCgpa: "", minCompletion: "", skills: [], has: [] };

const norm = (v) => String(v || "").trim().toLowerCase();

const Meter = ({ value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div className="st-meter" style={{ flex: 1 }}><span style={{ width: `${Math.min(100, value)}%` }} /></div>
    <span className="st-num st-sub" style={{ width: 34, textAlign: "right" }}>{value}%</span>
  </div>
);

const Count = ({ n, label }) => (
  <span className={n ? "" : "st-dim"} title={`${n} ${label}`}>
    <span className="st-num" style={{ fontWeight: n ? 600 : 400 }}>{n}</span> <span className="st-sub">{label}</span>
  </span>
);

const TpoStudents = () => {
  const toast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showMore, setShowMore] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const [facets, setFacets] = useState(null);
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const requestRef = useRef(0);

  // Dropdown values come from what students actually submitted.
  useEffect(() => {
    tpoApi.studentFacets().then((r) => setFacets(r.data)).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce the free-text box so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = useMemo(() => {
    const p = { sort, page, limit };
    if (search) p.search = search;
    ["branch", "college", "year", "status", "minCgpa", "minCompletion"].forEach((k) => filters[k] !== "" && (p[k] = filters[k]));
    if (filters.skills.length) p.skills = filters.skills.join(",");
    if (filters.has.length) p.has = filters.has.join(",");
    return p;
  }, [search, filters, sort, page, limit]);

  useEffect(() => {
    const id = ++requestRef.current;
    setLoading(true);
    tpoApi
      .listStudents(params)
      .then((r) => {
        if (id !== requestRef.current) return; // a newer request superseded this one
        setStudents(r.data.students);
        setPagination(r.data.pagination);
      })
      .catch((err) => id === requestRef.current && toast.error(getErrorMessage(err)))
      .finally(() => id === requestRef.current && setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const setFilter = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); };
  const toggleIn = (key, value) => {
    setFilters((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));
    setPage(1);
  };

  const addSkill = (raw) => {
    const value = String(raw || "").trim();
    if (!value) return;
    // Use the canonical spelling from the data when there is one.
    const known = facets?.skills.find((s) => norm(s.value) === norm(value));
    const skill = known ? known.value : value;
    setFilters((f) => (f.skills.some((x) => norm(x) === norm(skill)) ? f : { ...f, skills: [...f.skills, skill] }));
    setSkillInput("");
    setPage(1);
  };

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const activeCount =
    ["branch", "college", "year", "status", "minCgpa", "minCompletion"].filter((k) => filters[k] !== "").length + filters.skills.length + filters.has.length;
  const anyActive = activeCount > 0 || search !== "";

  const closePanel = useCallback(() => setSelectedId(null), []);
  const ids = useMemo(() => students.map((s) => s._id), [students]);

  const total = pagination.total;
  const from = total === 0 ? 0 : (pagination.page - 1) * limit + 1;
  const to = Math.min(total, pagination.page * limit);
  const registered = facets?.totals.students;
  const multipleColleges = (facets?.colleges.length || 0) > 1;
  const quickSkills = (facets?.skills || []).slice(0, 8);
  const wantedSkills = filters.skills.map(norm);

  return (
    <DashboardLayout>
      <PageHeader
        title="Students"
        subtitle={
          registered === undefined
            ? "Everything students have submitted, straight from the database."
            : `${total.toLocaleString()} ${anyActive ? "matching" : "registered"} student${total === 1 ? "" : "s"}${anyActive ? ` of ${registered.toLocaleString()}` : ""} · click a row for their full profile`
        }
      />

      {/* ---------- Search & filters ---------- */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "2 1 280px" }}>
            <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--slate)" }} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, roll no, email, skill, project, company…"
              aria-label="Search students"
              style={{ width: "100%", paddingLeft: 34 }}
            />
          </div>
          <select value={filters.branch} onChange={(e) => setFilter("branch", e.target.value)} aria-label="Branch" style={{ flex: "1 1 190px", minWidth: 0 }}>
            <option value="">All branches</option>
            {(facets?.branches || []).map((b) => <option key={b.value} value={b.value}>{b.value} ({b.count})</option>)}
          </select>
          <select value={filters.year} onChange={(e) => setFilter("year", e.target.value)} aria-label="Year" style={{ flex: "0 1 140px" }}>
            <option value="">All years</option>
            {YEARS.map((y) => {
              const c = facets?.years.find((f) => f.value === y)?.count;
              return <option key={y} value={y}>{y}{c !== undefined ? ` (${c})` : ""}</option>;
            })}
          </select>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sort by" style={{ flex: "0 1 190px" }}>
            {SORT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="btn secondary" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore}>
            <SlidersHorizontal size={14} /> Filters{activeCount > 0 && ` (${activeCount})`}
          </button>
        </div>

        {/* Skills: pick from the data or type your own; every skill added must match. */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="st-sub" style={{ marginRight: 2 }}>Skills (all must match):</span>
            {filters.skills.map((s) => (
              <span className="st-chip" key={s}>
                {s}
                <button onClick={() => toggleIn("skills", s)} aria-label={`Remove ${s}`}><X size={13} /></button>
              </span>
            ))}
            <div style={{ display: "flex", gap: 6 }}>
              <input
                list="st-skill-options"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
                placeholder="Add a skill…"
                aria-label="Add skill filter"
                style={{ width: 170, padding: "6px 10px", fontSize: 13 }}
              />
              <button className="btn secondary" style={{ padding: "6px 10px" }} onClick={() => addSkill(skillInput)} disabled={!skillInput.trim()} aria-label="Add skill"><Plus size={14} /></button>
            </div>
            <datalist id="st-skill-options">
              {(facets?.skills || []).map((s) => <option key={s.value} value={s.value}>{s.count} students</option>)}
            </datalist>
          </div>
          {quickSkills.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              <span className="st-sub" style={{ alignSelf: "center" }}>Popular:</span>
              {quickSkills.map((s) => (
                <button key={s.value} className={`st-quick ${wantedSkills.includes(norm(s.value)) ? "on" : ""}`} onClick={() => (wantedSkills.includes(norm(s.value)) ? toggleIn("skills", filters.skills.find((x) => norm(x) === norm(s.value))) : addSkill(s.value))}>
                  {s.value} <span style={{ opacity: 0.6 }}>{s.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {showMore && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div className="st-filters">
              {multipleColleges && (
                <div>
                  <label className="st-label" htmlFor="f-college">College</label>
                  <select id="f-college" value={filters.college} onChange={(e) => setFilter("college", e.target.value)} style={{ width: "100%" }}>
                    <option value="">All colleges</option>
                    {facets.colleges.map((c) => <option key={c.value} value={c.value}>{c.value} ({c.count})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="st-label" htmlFor="f-cgpa">Minimum CGPA</label>
                <input id="f-cgpa" type="number" min="0" max="10" step="0.1" value={filters.minCgpa} onChange={(e) => setFilter("minCgpa", e.target.value)} placeholder="e.g. 7.0" style={{ width: "100%" }} />
                {facets && <div className="st-sub" style={{ marginTop: 4 }}>{facets.totals.withCgpa.toLocaleString()} of {facets.totals.students.toLocaleString()} students have a CGPA on file</div>}
              </div>
              <div>
                <label className="st-label" htmlFor="f-comp">Profile completion</label>
                <select id="f-comp" value={filters.minCompletion} onChange={(e) => setFilter("minCompletion", e.target.value)} style={{ width: "100%" }}>
                  <option value="">Any</option>
                  {[25, 50, 75, 100].map((n) => <option key={n} value={n}>{n}% or more</option>)}
                </select>
              </div>
              <div>
                <label className="st-label" htmlFor="f-status">Account</label>
                <select id="f-status" value={filters.status} onChange={(e) => setFilter("status", e.target.value)} style={{ width: "100%" }}>
                  <option value="">Active and deactivated</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Deactivated only</option>
                </select>
              </div>
            </div>
            <div className="st-checks" style={{ marginTop: 14 }}>
              {HAS_OPTIONS.map(([key, label]) => (
                <label key={key}>
                  <input type="checkbox" checked={filters.has.includes(key)} onChange={() => toggleIn("has", key)} /> {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {anyActive && (
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn secondary" style={{ fontSize: 12.5, padding: "6px 12px" }} onClick={clearAll}><RotateCcw size={13} /> Clear all filters</button>
          </div>
        )}
      </div>

      {/* ---------- Results ---------- */}
      {loading && students.length === 0 ? (
        <div className="card" style={{ display: "grid", gap: 6 }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonLine key={i} height={38} />)}
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students match"
          description={anyActive ? "Try removing a filter or searching for something broader." : "No student accounts have been registered yet."}
          actionLabel={anyActive ? "Clear all filters" : undefined}
          onAction={anyActive ? clearAll : undefined}
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden", opacity: loading ? 0.6 : 1, transition: "opacity 0.15s" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="st-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Branch / year</th>
                  <th>CGPA</th>
                  <th>Skills</th>
                  <th>Submitted</th>
                  <th style={{ minWidth: 120 }}>Profile</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  // Show skills the TPO is filtering on first so a match is always visible.
                  const ordered = [...s.skills].sort((a, b) => Number(wantedSkills.includes(norm(b))) - Number(wantedSkills.includes(norm(a))));
                  return (
                    <tr key={s._id} className="st-row" tabIndex={0} onClick={() => setSelectedId(s._id)} onKeyDown={(e) => e.key === "Enter" && setSelectedId(s._id)}>
                      <td>
                        <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
                          <div className="st-avatar">{s.profilePhoto ? <img src={assetUrl(s.profilePhoto)} alt="" /> : (s.name || "?").charAt(0).toUpperCase()}</div>
                          <div style={{ minWidth: 0 }}>
                            <div className="st-name">
                              {s.name}
                              {!s.isActive && <span className="badge danger" style={{ marginLeft: 8, fontSize: 11 }}>Deactivated</span>}
                            </div>
                            <div className="st-sub">{s.email}</div>
                            <div className="st-mono">{s.rollNo}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{s.branch}</div>
                        <div className="st-sub">{s.year}</div>
                      </td>
                      <td className="st-num">{s.cgpa != null ? s.cgpa : <span className="st-dim">—</span>}</td>
                      <td style={{ maxWidth: 280 }}>
                        {s.skills.length === 0 ? (
                          <span className="st-dim">—</span>
                        ) : (
                          <>
                            {ordered.slice(0, 4).map((sk) => <span key={sk} className={`st-pill ${wantedSkills.includes(norm(sk)) ? "hit" : ""}`}>{sk}</span>)}
                            {s.skillCount > 4 && <span className="st-pill more">+{s.skillCount - Math.min(4, s.skills.length)}</span>}
                          </>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "grid", gap: 2 }}>
                          <Count n={s.projectCount} label="projects" />
                          <Count n={s.internshipCount} label="internships" />
                          <Count n={s.certificationCount} label="certs" />
                        </div>
                      </td>
                      <td><Meter value={s.profileCompletion} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
            <span className="st-sub">Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} aria-label="Rows per page" style={{ padding: "5px 8px", fontSize: 12.5 }}>
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} per page</option>)}
              </select>
              <button className="btn secondary" style={{ padding: "6px 10px" }} disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
              <span className="st-sub">Page {pagination.page} of {pagination.pages}</span>
              <button className="btn secondary" style={{ padding: "6px 10px" }} disabled={page >= pagination.pages || loading} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      )}

      {selectedId && <StudentDetailPanel studentId={selectedId} ids={ids} onNavigate={setSelectedId} onClose={closePanel} />}
    </DashboardLayout>
  );
};

export default TpoStudents;
