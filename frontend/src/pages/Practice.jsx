import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, Code2, Cpu, Users, ArrowLeft, RotateCcw, Trash2, CheckCircle2, XCircle, Loader2, MessageSquareText, Eye, Play } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import PageHeader from "../components/PageHeader.jsx";
import SectionCard from "../components/SectionCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import { useToast } from "../context/ToastContext.jsx";
import careerAssistantApi from "../services/careerAssistantApi.js";
import { getErrorMessage } from "../utils/apiError.js";
import { fmtDateTime } from "../utils/format.js";

const TYPES = [
  { id: "aptitude", label: "Aptitude test", icon: Calculator, desc: "Quantitative, logical and verbal MCQs. Auto-graded.", count: "10 questions", needsAi: false },
  { id: "coding", label: "Coding assessment", icon: Code2, desc: "Write solutions in any language. AI reviews correctness and approach.", count: "2 problems", needsAi: false },
  { id: "technical", label: "Technical interview", icon: Cpu, desc: "Questions for your branch, skills and projects.", count: "5 questions", needsAi: false },
  { id: "hr", label: "HR interview", icon: Users, desc: "Behavioural questions. Practise STAR-structured answers.", count: "5 questions", needsAi: false },
];
const TYPE = Object.fromEntries(TYPES.map((t) => [t.id, t]));
const LEVELS = ["beginner", "intermediate", "advanced"];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const scoreTone = (s) => (s == null ? "neutral" : s >= 75 ? "success" : s >= 50 ? "warning" : "danger");

// Multiple-choice rounds: graded exactly, results show the correct option.
const isMcq = (a) => a.type === "aptitude" || a.type === "series";
const SERIES_TRACKS = [
  { id: "aptitude", label: "Aptitude", desc: "quantitative aptitude, logical reasoning and verbal ability" },
  { id: "coding", label: "Coding", desc: "predict the output, find the bug and time complexity, on short Python snippets" },
  { id: "technical", label: "Technical", desc: "core subject questions and numericals for your branch" },
  { id: "hr", label: "HR", desc: "choose the best response to real HR and behavioural situations" },
];
const trackOf = (a) => a.track || "aptitude"; // attempts made before tracks existed are aptitude
const roundLabel = (a) => (a.type === "series" ? `${SERIES_TRACKS.find((t) => t.id === trackOf(a))?.label} series · Test ${a.testNo}` : TYPE[a.type]?.label);
const SERIES_TESTS = Array.from({ length: 10 }, (_, i) => i + 1);

/* ---------------- Test series: 3 stages x 10 tests x 10 questions ---------------- */
const TestSeries = ({ history, onStart, onOpen, starting }) => {
  const [track, setTrack] = useState("aptitude");
  const [stage, setStage] = useState("beginner");
  const attempts = (n) => history.filter((h) => h.type === "series" && trackOf(h) === track && h.level === stage && h.testNo === n); // newest first
  const done = SERIES_TESTS.filter((n) => attempts(n).some((h) => h.status === "completed")).length;

  return (
    <SectionCard title="Placement test series" action={<span className="muted-p">{done} of 10 {cap(stage)} tests completed</span>}>
      <p className="muted-p" style={{ marginBottom: 14 }}>
        Four rounds, three stages each, ten tests per stage and ten questions per test. {cap(SERIES_TRACKS.find((t) => t.id === track).desc)}.
        After you submit, you see your score and every question with the correct answer and an explanation.
      </p>
      <div className="pr-levels" role="tablist" aria-label="Round" style={{ marginBottom: 10 }}>
        {SERIES_TRACKS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={track === t.id} className={`pr-level ${track === t.id ? "on" : ""}`} style={{ border: 0 }} onClick={() => setTrack(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="pr-levels" role="tablist" aria-label="Stage" style={{ marginBottom: 16 }}>
        {LEVELS.map((l) => (
          <button key={l} type="button" role="tab" aria-selected={stage === l} className={`pr-level ${stage === l ? "on" : ""}`} style={{ border: 0 }} onClick={() => setStage(l)}>
            {cap(l)}
          </button>
        ))}
      </div>
      <ol className="ts-grid">
        {SERIES_TESTS.map((n) => {
          const list = attempts(n);
          const inProgress = list.find((h) => h.status === "in_progress");
          const completed = list.filter((h) => h.status === "completed");
          const best = completed.length ? Math.max(...completed.map((h) => h.score ?? 0)) : null;
          return (
            <li key={n} className={`ts-card ${best != null ? "done" : ""}`}>
              <div className="ts-top">
                <span className="ts-name">Test {n}</span>
                {best != null ? <span className={`badge ${scoreTone(best)}`}>Best {best}%</span> : <span className="badge neutral">Not attempted</span>}
              </div>
              <div className="ts-meta">10 questions{completed.length ? ` · ${completed.length} attempt${completed.length > 1 ? "s" : ""}` : ""}</div>
              <div className="ts-actions">
                {inProgress ? (
                  <button className="btn brass" onClick={() => onOpen(inProgress._id)}><Play size={14} />Resume</button>
                ) : (
                  <button className="btn brass" disabled={starting} onClick={() => onStart("series", stage, n, track)}>
                    <Play size={14} />{completed.length ? "Retake" : "Start"}
                  </button>
                )}
                {completed[0] && (
                  <button className="btn secondary" onClick={() => onOpen(completed[0]._id)} aria-label={`View last result of test ${n}`}>
                    <Eye size={14} />Result
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
};

/* ---------------- Home: start + history ---------------- */
const Home = ({ aiEnabled, history, onStart, starting, onOpen, onDelete }) => {
  const [type, setType] = useState("aptitude");
  const [level, setLevel] = useState("beginner");
  const blocked = !aiEnabled && TYPE[type].needsAi;

  return (
    <>
      {!aiEnabled && (
        <div className="alert info" role="status">
          Practice sessions are using EduVerse's built-in question bank. Aptitude is auto-graded; coding, technical and HR answers are scored by
          the key points they cover, with a model answer to compare against. The test series above is not affected.
        </div>
      )}

      <SectionCard title="Start a practice session">
        <fieldset className="pr-fieldset">
          <legend>Round</legend>
          <div className="pr-types">
            {TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <label key={t.id} className={`pr-type ${type === t.id ? "on" : ""}`}>
                  <input type="radio" name="type" value={t.id} checked={type === t.id} onChange={() => setType(t.id)} />
                  <span className="pr-type-icon"><Icon size={18} /></span>
                  <span className="pr-type-name">{t.label}</span>
                  <span className="pr-type-desc">{t.desc}</span>
                  <span className="pr-type-count">{t.count}{t.needsAi && !aiEnabled ? " · needs AI" : ""}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="pr-fieldset">
          <legend>Level</legend>
          <div className="pr-levels" role="radiogroup">
            {LEVELS.map((l) => (
              <label key={l} className={`pr-level ${level === l ? "on" : ""}`}>
                <input type="radio" name="level" value={l} checked={level === l} onChange={() => setLevel(l)} />
                {cap(l)}
              </label>
            ))}
          </div>
        </fieldset>

        <button className="btn brass" disabled={starting || blocked} onClick={() => onStart(type, level)}>
          {starting ? <><Loader2 size={15} className="spin" />Preparing questions…</> : `Start ${TYPE[type].label.toLowerCase()}`}
        </button>
        {blocked && <p className="muted-p" style={{ marginTop: 8 }}>This round needs the AI service. Try an aptitude test or HR round for now.</p>}
      </SectionCard>

      <SectionCard title="Your attempts">
        {history.length === 0 ? (
          <EmptyState title="No attempts yet" description="Your scores and feedback will appear here." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="sl-table">
              <thead>
                <tr><th>Round</th><th>Level</th><th>Score</th><th>Date</th><th /></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h._id}>
                    <td style={{ fontWeight: 600, color: "var(--ink)" }}>{roundLabel(h)}</td>
                    <td>{cap(h.level)}</td>
                    <td>
                      {h.status !== "completed" ? (
                        <span className="badge neutral">In progress</span>
                      ) : (
                        <span className={`badge ${scoreTone(h.score)}`}>{h.score == null ? "Not scored" : `${h.score} / 100`}</span>
                      )}
                    </td>
                    <td className="tabular">{fmtDateTime(h.completedAt || h.createdAt)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn secondary" style={{ fontSize: 12.5, padding: "5px 10px", marginRight: 6 }} onClick={() => onOpen(h._id)}>
                        {h.status === "completed" ? "View" : "Resume"}
                      </button>
                      <button className="icon-btn danger" style={{ width: 30, height: 30, verticalAlign: "middle" }} aria-label="Delete attempt" onClick={() => onDelete(h)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
};

/* ---------------- Taking a test ---------------- */
const TestView = ({ a, answers, setAnswers, onSubmit, submitting, onBack }) => {
  const [confirm, setConfirm] = useState(false);
  const answered = answers.filter((x) => String(x).trim() !== "").length;
  const set = (i, v) => setAnswers(answers.map((x, j) => (j === i ? v : x)));

  return (
    <>
      <div className="pr-bar">
        <button className="btn secondary" onClick={onBack}><ArrowLeft size={15} />Save &amp; exit</button>
        <span className="muted-p" aria-live="polite">{answered} of {a.questions.length} answered</span>
      </div>
      <ProgressBar value={(answered / a.questions.length) * 100} height={6} />

      <ol className="pr-questions">
        {a.questions.map((q, i) => (
          <li key={i} className="card pr-q">
            <div className="pr-q-head">
              <span className="pr-q-n">Q{i + 1}</span>
              {q.topic && <span className="badge neutral">{q.topic}</span>}
            </div>
            <p className="pr-q-prompt" id={`q${i}`}>{q.prompt}</p>
            {q.code && <pre className="pr-answer mono">{q.code}</pre>}
            {isMcq(a) ? (
              <div role="radiogroup" aria-labelledby={`q${i}`} className="pr-options">
                {q.options.map((opt, k) => (
                  <label key={k} className={`pr-option ${String(answers[i]) === String(k) ? "on" : ""}`}>
                    <input type="radio" name={`q${i}`} checked={String(answers[i]) === String(k)} onChange={() => set(i, String(k))} />
                    <span className="pr-option-key">{String.fromCharCode(65 + k)}</span>
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor={`a${i}`}>{a.type === "coding" ? "Your solution (any language) and a short explanation" : "Your answer"}</label>
                <textarea
                  id={`a${i}`}
                  rows={a.type === "coding" ? 12 : 6}
                  className={a.type === "coding" ? "mono" : ""}
                  value={answers[i]}
                  onChange={(e) => set(i, e.target.value)}
                  maxLength={6000}
                  spellCheck={a.type !== "coding"}
                />
              </div>
            )}
          </li>
        ))}
      </ol>

      <button className="btn brass big" disabled={submitting || answered === 0} onClick={() => (answered < a.questions.length ? setConfirm(true) : onSubmit())}>
        {submitting ? <><Loader2 size={15} className="spin" />{isMcq(a) ? "Grading…" : "AI is reviewing your answers…"}</> : "Submit for feedback"}
      </button>

      <ConfirmDialog
        open={confirm}
        danger={false}
        title="Submit with unanswered questions?"
        description={`${a.questions.length - answered} question(s) are blank and will score 0.`}
        confirmLabel="Submit"
        onConfirm={() => { setConfirm(false); onSubmit(); }}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
};

/* ---------------- Results ---------------- */
const ResultView = ({ a, onRetake, onBack, starting }) => (
  <>
    <div className="pr-bar">
      <button className="btn secondary" onClick={onBack}><ArrowLeft size={15} />All practice</button>
      <button className="btn brass" disabled={starting} onClick={onRetake}><RotateCcw size={15} />{starting ? "Preparing…" : "New set, same round"}</button>
    </div>

    <div className="card ai-glow pr-score">
      <div>
        <div className="pr-score-n tabular">{a.score == null ? "—" : a.score}<span>/ 100</span></div>
        <span className={`badge ${scoreTone(a.score)}`}>{a.score == null ? "Not scored" : a.score >= 75 ? "Strong" : a.score >= 50 ? "Getting there" : "Needs practice"}</span>
      </div>
      <div className="pr-score-body">
        <h2 style={{ fontSize: 18 }}>{roundLabel(a)} · {cap(a.level)}</h2>
        {a.score != null && <ProgressBar value={a.score} height={6} />}
        <p style={{ margin: "10px 0 0" }}>{a.summary}</p>
        <p className="muted-p" style={{ marginTop: 6 }}>{a.aiReviewed ? "Feedback by AI. Use it as guidance, not a guarantee of interview outcomes." : "Graded without AI review."}</p>
      </div>
    </div>

    {(a.strengths.length > 0 || a.weaknesses.length > 0) && (
      <div className="two-col-grid" style={{ marginBottom: 20 }}>
        <SectionCard title="Strengths" style={{ marginBottom: 0 }}>
          <ul className="pr-list ok">{a.strengths.map((s) => <li key={s}><CheckCircle2 size={15} />{s}</li>)}</ul>
        </SectionCard>
        <SectionCard title="To improve" style={{ marginBottom: 0 }}>
          <ul className="pr-list bad">{a.weaknesses.map((s) => <li key={s}><XCircle size={15} />{s}</li>)}</ul>
        </SectionCard>
      </div>
    )}

    {a.improvementPlan.length > 0 && (
      <SectionCard title="Your improvement plan">
        <ol className="pr-plan">
          {a.improvementPlan.map((p, i) => (
            <li key={i}><b>{p.title}</b><span>{p.description}</span></li>
          ))}
        </ol>
        <Link to="/career-assistant" className="link-quiet" style={{ marginTop: 6 }}><MessageSquareText size={13} />Ask the AI Career Assistant about this plan</Link>
      </SectionCard>
    )}

    <SectionCard title="Question review">
      {a.questions.map((q, i) => {
        const r = a.results[i] || {};
        const yours = a.answers[i];
        return (
          <details key={i} className="pr-review" open={isMcq(a) || i === 0}>
            <summary>
              <span className="pr-q-n">Q{i + 1}</span>
              <span className="pr-review-title">{q.topic || q.prompt.slice(0, 60)}</span>
              {r.score != null && <span className={`badge ${r.score >= 7 ? "success" : r.score >= 4 ? "warning" : "danger"}`}>{isMcq(a) ? (r.score === 10 ? "Correct" : "Incorrect") : `${r.score} / 10`}</span>}
            </summary>
            <p className="pr-q-prompt">{q.prompt}</p>
            {q.code && <pre className="pr-answer mono">{q.code}</pre>}
            {isMcq(a) ? (
              <ul className="pr-mcq-review">
                {q.options.map((opt, k) => (
                  <li key={k} className={k === q.correctIndex ? "correct" : String(yours) === String(k) ? "wrong" : ""}>
                    <span className="pr-option-key">{String.fromCharCode(65 + k)}</span>{opt}
                    {k === q.correctIndex && <em>Correct answer</em>}
                    {String(yours) === String(k) && k !== q.correctIndex && <em>Your answer</em>}
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <div className="pr-label">Your answer</div>
                <pre className={`pr-answer ${a.type === "coding" ? "mono" : ""}`}>{yours?.trim() ? yours : "(no answer)"}</pre>
              </>
            )}
            {r.feedback && a.type !== "aptitude" && <><div className="pr-label">Feedback</div><p>{r.feedback}</p></>}
            {r.idealAnswer && <><div className="pr-label">{isMcq(a) ? "Explanation" : "Model answer"}</div><pre className={`pr-answer ${a.type === "coding" ? "mono" : ""}`}>{r.idealAnswer}</pre></>}
          </details>
        );
      })}
    </SectionCard>
  </>
);

/* ---------------- Page ---------------- */
const Practice = () => {
  const toast = useToast();
  const [data, setData] = useState({ aiEnabled: true, items: [] });
  const [current, setCurrent] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const loadHistory = () => careerAssistantApi.listAssessments().then((r) => setData(r.data)).catch((e) => toast.error(getErrorMessage(e)));
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (a) => {
    setCurrent(a);
    setAnswers(a.status === "completed" ? a.answers : a.questions.map((_, i) => draftFor(a._id)[i] ?? ""));
    window.scrollTo({ top: 0 });
  };

  // Unsent answers survive a refresh / "Save & exit" (form-autosave).
  const draftKey = (id) => `eduverse_practice_${id}`;
  const draftFor = (id) => { try { return JSON.parse(localStorage.getItem(draftKey(id))) || []; } catch { return []; } };
  useEffect(() => {
    if (current?.status === "in_progress") {
      try { localStorage.setItem(draftKey(current._id), JSON.stringify(answers)); } catch { /* storage unavailable */ }
    }
  }, [answers, current]);

  const start = async (type, level, testNo, track) => {
    setStarting(true);
    try {
      open((await careerAssistantApi.startAssessment(type, level, testNo, track)).data);
      loadHistory();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setStarting(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await careerAssistantApi.submitAssessment(current._id, answers);
      try { localStorage.removeItem(draftKey(current._id)); } catch { /* ignore */ }
      open(res.data);
      loadHistory();
      toast.success("Feedback ready.");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    try {
      await careerAssistantApi.deleteAssessment(toDelete._id);
      setData((d) => ({ ...d, items: d.items.filter((x) => x._id !== toDelete._id) }));
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setToDelete(null);
    }
  };

  const back = () => { setCurrent(null); loadHistory(); };

  return (
    <DashboardLayout>
      <PageHeader
        title="Interview & test prep"
        subtitle="A placement test series in aptitude, coding, technical and HR rounds from beginner to advanced, plus mock interviews, coding assessments and HR rounds, with scores, correct answers and a plan to improve."
      />

      {!current && (
        <TestSeries
          history={data.items}
          onStart={start}
          starting={starting}
          onOpen={async (id) => { try { open((await careerAssistantApi.getAssessment(id)).data); } catch (e) { toast.error(getErrorMessage(e)); } }}
        />
      )}
      {!current && (
        <Home
          aiEnabled={data.aiEnabled}
          history={data.items}
          onStart={start}
          starting={starting}
          onOpen={async (id) => { try { open((await careerAssistantApi.getAssessment(id)).data); } catch (e) { toast.error(getErrorMessage(e)); } }}
          onDelete={setToDelete}
        />
      )}
      {current?.status === "in_progress" && (
        <TestView a={current} answers={answers} setAnswers={setAnswers} onSubmit={submit} submitting={submitting} onBack={back} />
      )}
      {current?.status === "completed" && <ResultView a={current} onBack={back} onRetake={() => start(current.type, current.level, current.testNo, current.track)} starting={starting} />}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this attempt?"
        description="Its answers, score and feedback will be removed."
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </DashboardLayout>
  );
};

export default Practice;
