import React, { useState } from "react";
import { RefreshCw, ExternalLink, Star, GitFork, CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import PageHeader from "../components/PageHeader.jsx";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../api/axios.js";
import { validators, linkedinPostUrn } from "../utils/validators.js";
import { getErrorMessage } from "../utils/apiError.js";
import { safeUrl } from "../utils/safeUrl.js";
import { fmtDateTime } from "../utils/format.js";

// Brand marks (lucide has no brand icons).
const GithubMark = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
  </svg>
);
const LinkedinMark = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);

const Status = ({ on }) =>
  on ? (
    <span className="badge success"><CheckCircle2 size={12} />Connected</span>
  ) : (
    <span className="badge neutral"><Circle size={12} />Not connected</span>
  );

const Integrations = () => {
  const { student, updateStudentInState } = useAuth();
  const toast = useToast();

  const [githubUsername, setGithubUsername] = useState(student?.githubUsername || "");
  const [ghError, setGhError] = useState("");
  const [syncing, setSyncing] = useState(false);

  const [linkedin, setLinkedin] = useState(student?.linkedinProfile || "");
  const [liError, setLiError] = useState("");
  const [savingLi, setSavingLi] = useState(false);

  const handleSync = async (e) => {
    e.preventDefault();
    if (syncing) return;
    const msg = validators.githubUsername(githubUsername) || (!githubUsername.trim() ? "GitHub username is required." : "");
    if (msg) return setGhError(msg);
    setGhError("");
    setSyncing(true);
    try {
      const { data } = await api.post("/github/sync", { username: githubUsername });
      updateStudentInState({ ...student, githubUsername, githubData: data.githubData });
      toast.success("GitHub profile synced.");
    } catch (err) {
      setGhError(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkedin = async (e) => {
    e.preventDefault();
    if (savingLi) return;
    const value = linkedin.trim();
    const msg = value ? validators.linkedinUrl(value) : "";
    if (msg) return setLiError(msg);
    setLiError("");
    setSavingLi(true);
    try {
      const { data } = await api.put("/profile", { linkedinProfile: value });
      updateStudentInState(data.student);
      toast.success(value ? "LinkedIn profile saved." : "LinkedIn profile removed.");
    } catch (err) {
      setLiError(getErrorMessage(err));
    } finally {
      setSavingLi(false);
    }
  };

  const [postInput, setPostInput] = useState("");
  const [postError, setPostError] = useState("");
  const [savingPosts, setSavingPosts] = useState(false);
  const posts = student?.linkedinPosts || [];

  const savePosts = async (next, done) => {
    setSavingPosts(true);
    try {
      const { data } = await api.put("/profile", { linkedinPosts: next });
      updateStudentInState(data.student);
      toast.success(done);
      return true;
    } catch (err) {
      setPostError(getErrorMessage(err));
      return false;
    } finally {
      setSavingPosts(false);
    }
  };

  const addPost = async (e) => {
    e.preventDefault();
    if (savingPosts) return;
    let urn = linkedinPostUrn(postInput);
    if (!urn && /lnkd\.in\//i.test(postInput)) {
      setSavingPosts(true);
      try {
        urn = (await api.post("/profile/linkedin-post/resolve", { url: postInput.trim() })).data.urn;
      } catch (err) {
        return setPostError(getErrorMessage(err));
      } finally {
        setSavingPosts(false);
      }
    }
    if (!urn) return setPostError("That doesn't look like a LinkedIn post link. Use ··· → Copy link to post on LinkedIn.");
    if (posts.includes(urn)) return setPostError("This post is already added.");
    if (posts.length >= 12) return setPostError("You can showcase up to 12 posts.");
    setPostError("");
    if (await savePosts([urn, ...posts], "Post added.")) setPostInput("");
  };

  const gh = student?.githubData;
  const liUrl = safeUrl(student?.linkedinProfile);

  return (
    <DashboardLayout>
      <PageHeader title="Integrations" subtitle="Connect GitHub and LinkedIn. Recruiters see them on your profile, and they count towards your readiness score." />

      <div className="int-grid">
        {/* GitHub */}
        <section className="card int-card">
          <div className="int-head">
            <span className="int-logo int-logo-gh"><GithubMark /></span>
            <div className="int-title">
              <h3>GitHub</h3>
              <p>Public repositories, languages, stars and forks.</p>
            </div>
            <Status on={Boolean(gh?.username)} />
          </div>

          <form onSubmit={handleSync} className="int-form">
            <FormField htmlFor="ghUsername" error={ghError} style={{ flex: 1, marginBottom: 0 }}>
              <input
                id="ghUsername"
                value={githubUsername}
                onChange={(e) => {
                  setGithubUsername(e.target.value);
                  if (ghError) setGhError("");
                }}
                placeholder="GitHub username"
                aria-label="GitHub username"
              />
            </FormField>
            <button type="submit" className="btn brass" disabled={syncing}>
              <RefreshCw size={14} className={syncing ? "spin" : ""} />
              {syncing ? "Syncing…" : gh?.username ? "Re-sync" : "Connect"}
            </button>
          </form>

          {gh?.username && (
            <>
              <div className="int-stats">
                <div><b className="tabular">{gh.publicRepos}</b><span>Repositories</span></div>
                <div><b className="tabular">{gh.followers}</b><span>Followers</span></div>
                <div><b className="tabular">{gh.following}</b><span>Following</span></div>
              </div>
              <div className="int-foot">
                <span>Last synced {gh.lastSyncedAt ? fmtDateTime(gh.lastSyncedAt) : "never"}</span>
                {safeUrl(gh.profileUrl) && (
                  <a href={safeUrl(gh.profileUrl)} target="_blank" rel="noreferrer" className="link-quiet">
                    View on GitHub <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </>
          )}
        </section>

        {/* LinkedIn */}
        <section className="card int-card">
          <div className="int-head">
            <span className="int-logo int-logo-li"><LinkedinMark /></span>
            <div className="int-title">
              <h3>LinkedIn</h3>
              <p>Your professional profile, shown to recruiters.</p>
            </div>
            <Status on={Boolean(liUrl)} />
          </div>

          <form onSubmit={handleLinkedin} className="int-form">
            <FormField htmlFor="liUrl" error={liError} style={{ flex: 1, marginBottom: 0 }}>
              <input
                id="liUrl"
                value={linkedin}
                onChange={(e) => {
                  setLinkedin(e.target.value);
                  if (liError) setLiError("");
                }}
                placeholder="https://linkedin.com/in/yourname"
                aria-label="LinkedIn profile URL"
              />
            </FormField>
            <button type="submit" className="btn brass" disabled={savingLi}>{savingLi ? "Saving…" : "Save"}</button>
          </form>

          {liUrl && (
            <div className="int-foot">
              <span className="int-url">{student.linkedinProfile}</span>
              <a href={liUrl} target="_blank" rel="noreferrer" className="link-quiet">
                Open profile <ExternalLink size={12} />
              </a>
            </div>
          )}
        </section>
      </div>

      <section className="card li-posts">
        <div className="card-head">
          <h3><span className="li-mini"><LinkedinMark /></span>LinkedIn posts</h3>
          <span className="muted-p">{posts.length} / 12</span>
        </div>
        <p className="muted-p" style={{ marginBottom: 14 }}>
          LinkedIn doesn't allow other apps to read your posts automatically, so pick the ones to showcase: on LinkedIn open a post,
          click <b>···</b> → <b>Copy link to post</b>, and paste it here.
        </p>
        <form onSubmit={addPost} className="int-form">
          <FormField htmlFor="liPost" error={postError} style={{ flex: 1, marginBottom: 0 }}>
            <input
              id="liPost"
              value={postInput}
              onChange={(e) => {
                setPostInput(e.target.value);
                if (postError) setPostError("");
              }}
              placeholder="https://www.linkedin.com/posts/…"
              aria-label="LinkedIn post link"
            />
          </FormField>
          <button type="submit" className="btn brass" disabled={savingPosts || !postInput.trim()}><Plus size={14} />Add post</button>
        </form>

        {posts.length > 0 && (
          <div className="li-post-grid">
            {posts.map((urn) => (
              <div key={urn} className="li-post">
                <iframe
                  src={`https://www.linkedin.com/embed/feed/update/${urn}`}
                  title="LinkedIn post"
                  loading="lazy"
                  allowFullScreen
                />
                <button
                  type="button"
                  className="icon-btn danger li-post-remove"
                  aria-label="Remove post"
                  disabled={savingPosts}
                  onClick={() => savePosts(posts.filter((u) => u !== urn), "Post removed.")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {gh?.repositories?.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div className="card-head">
            <h3>Recent repositories</h3>
          </div>
          <div className="repo-grid">
            {gh.repositories.slice(0, 6).map((repo) => (
              <a key={repo.name} href={safeUrl(repo.url) || undefined} target="_blank" rel="noreferrer" className="card repo-card">
                <div className="repo-name">{repo.name}</div>
                <p>{repo.description || "No description"}</p>
                <div className="repo-meta">
                  {repo.language && repo.language !== "N/A" && <span><i className="repo-lang" />{repo.language}</span>}
                  <span><Star size={12} />{repo.stars}</span>
                  <span><GitFork size={12} />{repo.forks}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </DashboardLayout>
  );
};

export default Integrations;
