import { NextResponse } from "next/server";
import { listDocs, addDoc } from "../../../../lib/db";
import { getSessionFromRequest } from "../../../../lib/auth";

// Only the collections the QT Group front-end actually uses (see
// initDb() in public/index.html) — anything else 404s rather than
// silently creating a new arbitrary table partition. Login credentials
// live in a separate "credentials" collection that is deliberately NOT in
// this list, so it's never reachable through this generic route — only
// the /api/auth/* handlers touch it, via lib/db.js directly.
const ALLOWED = new Set(["orders", "inventory", "logs", "announcements", "messages", "staff", "channels"]);

function checkName(name) {
  return ALLOWED.has(name);
}

// All of this data is internal company data — every route below requires a
// signed-in session (see app/api/auth/login). Unauthenticated requests are
// rejected before touching the database.
function requireSession(request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  return null;
}

export async function GET(request, { params }) {
  const authError = requireSession(request);
  if (authError) return authError;
  const { name } = await params;
  if (!checkName(name)) {
    return NextResponse.json({ error: "unknown collection" }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const orderBy = searchParams.get("orderBy") || undefined;
  const dir = searchParams.get("dir") || undefined;
  const limit = searchParams.get("limit") || undefined;
  try {
    const docs = await listDocs(name, { orderBy, dir, limit });
    return NextResponse.json({ docs });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const authError = requireSession(request);
  if (authError) return authError;
  const { name } = await params;
  if (!checkName(name)) {
    return NextResponse.json({ error: "unknown collection" }, { status: 404 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  try {
    const id = await addDoc(name, body || {});
    return NextResponse.json({ id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
