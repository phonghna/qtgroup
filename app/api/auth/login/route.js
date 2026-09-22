import { NextResponse } from "next/server";
import { getDoc } from "../../../../lib/db";
import { verifyPassword, signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "../../../../lib/auth";
import { ensureStaffSeeded } from "../../../../lib/seed";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!username || !password) {
    return NextResponse.json({ error: "Missing username or password" }, { status: 400 });
  }

  try {
    await ensureStaffSeeded();

    const cred = await getDoc("credentials", username);
    if (!cred) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }
    const ok = await verifyPassword(password, cred.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const staff = await getDoc("staff", cred.staffId);
    if (!staff || staff.active === false) {
      return NextResponse.json({ error: "This account is disabled" }, { status: 401 });
    }

    const token = signSession({ staffId: staff.id });
    const res = NextResponse.json({ user: staff });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
