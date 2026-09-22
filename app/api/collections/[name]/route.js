import { NextResponse } from "next/server";
import { listDocs, addDoc } from "../../../../lib/db";

// Only the collections the QT Group front-end actually uses (see
// initDb() in public/index.html) — anything else 404s rather than
// silently creating a new arbitrary table partition.
const ALLOWED = new Set(["orders", "inventory", "logs", "announcements", "messages", "staff"]);

function checkName(name) {
  return ALLOWED.has(name);
}

export async function GET(request, { params }) {
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
