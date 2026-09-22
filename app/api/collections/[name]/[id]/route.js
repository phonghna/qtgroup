import { NextResponse } from "next/server";
import { setDoc, updateDoc, deleteDoc } from "../../../../../lib/db";
import { getSessionFromRequest } from "../../../../../lib/auth";

const ALLOWED = new Set(["orders", "inventory", "logs", "announcements", "messages", "staff"]);

function checkName(name) {
  return ALLOWED.has(name);
}

function requireSession(request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  return null;
}

// PUT = Firestore .doc(id).set(data) — full replace / upsert.
export async function PUT(request, { params }) {
  const authError = requireSession(request);
  if (authError) return authError;
  const { name, id } = await params;
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
    await setDoc(name, id, body || {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

// PATCH = Firestore .doc(id).update(partial) — shallow merge.
export async function PATCH(request, { params }) {
  const authError = requireSession(request);
  if (authError) return authError;
  const { name, id } = await params;
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
    await updateDoc(name, id, body || {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const authError = requireSession(request);
  if (authError) return authError;
  const { name, id } = await params;
  if (!checkName(name)) {
    return NextResponse.json({ error: "unknown collection" }, { status: 404 });
  }
  try {
    await deleteDoc(name, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
