/**
 * Live delivery of chat and notification events over Server-Sent Events.
 * shortcut: connections live in this process's memory, so this works for a single
 * server instance only; use a shared pub/sub (e.g. Redis) before running several.
 */
const clients = new Set(); // { res, userId, role }

const STAFF = ["tpo", "admin"];

const subscribe = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 3000\n\n");
  const client = { res, userId: String(req.student._id), role: req.student.role };
  clients.add(client);
  const ping = setInterval(() => res.write(": ping\n\n"), 25000); // keeps proxies from closing an idle stream
  req.on("close", () => {
    clearInterval(ping);
    clients.delete(client);
  });
};

/** Sends an event to the thread's recruiter and to every connected TPO/admin. */
const publish = (recruiterId, type, data) => {
  const frame = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) {
    if (STAFF.includes(c.role) || c.userId === String(recruiterId)) c.res.write(frame);
  }
};

/** Sends an event to specific users' open connections. */
const sendTo = (userIds, type, data) => {
  const ids = new Set(userIds.map(String));
  const frame = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) if (ids.has(c.userId)) c.res.write(frame);
};

module.exports = { subscribe, publish, sendTo, STAFF };
