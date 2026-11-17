const crypto = require("crypto");

const COOKIE_NAME = "avenor_master_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSession(secret, username) {
  const payload = Buffer.from(JSON.stringify({
    sub: username,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000
  })).toString("base64url");
  return payload + "." + sign(payload, secret);
}

function readCookie(header, name) {
  const parts = String(header || "").split(";");
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return "";
}

function verifySession(req) {
  const secret = process.env.MASTER_SESSION_SECRET;
  if (!secret) return false;
  const token = readCookie(req.headers.cookie, COOKIE_NAME);
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Boolean(data.sub && Number(data.exp) > Date.now());
  } catch {
    return false;
  }
}

function sessionCookie(token) {
  return COOKIE_NAME + "=" + encodeURIComponent(token) +
    "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + SESSION_TTL_SECONDS;
}

function clearSessionCookie() {
  return COOKIE_NAME + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

module.exports = { safeEqual, createSession, verifySession, sessionCookie, clearSessionCookie };
