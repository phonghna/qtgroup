// Real authentication for the standalone QT Group website: bcrypt password
// hashing + a signed, httpOnly session cookie. This is server-only code
// (imported from app/api/auth/* route handlers and from the collections API
// as a session gate) — never imported by public/index.html or
// public/claude-polyfill.js, which only ever talk to the /api/auth/* HTTP
// endpoints below.

import bcrypt from "bcryptjs";
import crypto from "crypto";

export const SESSION_COOKIE = "qt_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const SESSION_MAX_AGE = SESSION_MAX_AGE_SECONDS;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    throw new Error(
      "AUTH_SECRET is not set — add a random secret string as an environment variable in Vercel (Settings -> Environment Variables) and redeploy. See HUONG-DAN-DEPLOY.md."
    );
  }
  return s;
}

export async function hashPassword(password) {
  return bcrypt.hash(String(password), 10);
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  try {
    return await bcrypt.compare(String(password), hash);
  } catch {
    return false;
  }
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlToBuffer(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

// Small hand-rolled signed token (HMAC-SHA256) instead of pulling in a JWT
// library — the payload is just {staffId, exp}, nothing that needs the rest
// of the JWT spec (headers, alg negotiation, etc).
export function signSession(payload) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS };
  const encoded = base64url(JSON.stringify(body));
  const sig = base64url(crypto.createHmac("sha256", secret()).update(encoded).digest());
  return encoded + "." + sig;
}

export function verifySession(token) {
  if (!token || token.indexOf(".") === -1) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  let expected;
  try {
    expected = base64url(crypto.createHmac("sha256", secret()).update(encoded).digest());
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(base64urlToBuffer(encoded).toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// request is a Next.js Request (App Router) — has .cookies.get(name).
export function getSessionFromRequest(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}
