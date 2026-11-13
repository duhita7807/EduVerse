const axios = require("axios");
const { GITHUB_USERNAME_REGEX } = require("../utils/validators");

const GITHUB_API = "https://api.github.com";

/**
 * Builds headers for GitHub API requests. Adding a token (even without any
 * scopes) raises the rate limit from 60/hr to 5000/hr per GitHub's docs.
 */
const githubHeaders = () => {
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
};

/**
 * Fetches a GitHub user's public profile + public repositories and shapes
 * them into the format stored on Student.githubData.
 * Throws a descriptive, user-facing error for every known failure mode
 * (bad format, not found, rate limited, network failure) so the
 * controller never has to guess what went wrong.
 */
const fetchGithubProfile = async (username) => {
  if (!username || !GITHUB_USERNAME_REGEX.test(username.trim())) {
    throw new Error("Please enter a valid GitHub username.");
  }

  let userRes;
  try {
    userRes = await axios.get(`${GITHUB_API}/users/${encodeURIComponent(username)}`, {
      headers: githubHeaders(),
      timeout: 10000,
    });
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw new Error("GitHub profile not found. Please check the username.");
    }
    if (err.response && err.response.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Please try again later.");
    }
    if (err.code === "ECONNABORTED" || !err.response) {
      throw new Error("Could not reach GitHub right now. Please check your connection and try again.");
    }
    throw new Error("Failed to fetch GitHub profile. Please try again.");
  }

  const reposRes = await axios.get(`${GITHUB_API}/users/${encodeURIComponent(username)}/repos`, {
    headers: githubHeaders(),
    params: { per_page: 100, sort: "updated" },
    timeout: 10000,
  });

  const repositories = reposRes.data
    .filter((repo) => !repo.fork) // skip forked repos, keep original work
    .map((repo) => ({
      name: repo.name,
      description: repo.description || "",
      language: repo.language || "N/A",
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      url: repo.html_url,
      updatedAt: repo.updated_at,
    }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return {
    username: userRes.data.login,
    profileUrl: userRes.data.html_url,
    avatarUrl: userRes.data.avatar_url,
    publicRepos: userRes.data.public_repos,
    followers: userRes.data.followers,
    following: userRes.data.following,
    repositories,
    lastSyncedAt: new Date(),
  };
};

module.exports = { fetchGithubProfile };
