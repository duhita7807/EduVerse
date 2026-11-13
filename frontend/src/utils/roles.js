/** Landing page for each account type after login. */
export const homeForRole = (role) =>
  ({ admin: "/admin", tpo: "/tpo", recruiter: "/recruiter" }[role] || "/dashboard");
