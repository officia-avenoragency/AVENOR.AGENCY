const { safeEqual, createSession, sessionCookie } = require("../../lib/master-auth");

module.exports = function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const username = process.env.MASTER_ADMIN_USERNAME;
  const password = process.env.MASTER_ADMIN_PASSWORD;
  const secret = process.env.MASTER_SESSION_SECRET;
  if (!username || !password || !secret) {
    return res.status(503).json({ error: "Master dashboard login is not configured." });
  }

  const body = req.body || {};
  if (!safeEqual(body.username, username) || !safeEqual(body.password, password)) {
    return res.status(401).json({ error: "Invalid admin ID or password." });
  }

  const token = createSession(secret, username);
  res.setHeader("Set-Cookie", sessionCookie(token));
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true });
};
