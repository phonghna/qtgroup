import { NextResponse } from "next/server";
import { getDoc } from "../../../../lib/db";
import { getSessionFromRequest } from "../../../../lib/auth";
import { ensureStaffSeeded } from "../../../../lib/seed";

export async function GET(request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  try {
    await ensureStaffSeeded();
    const staff = await getDoc("staff", session.staffId);
    if (!staff || staff.active === false) {
      return NextResponse.json({ error: "account no longer exists" }, { status: 401 });
    }
    return NextResponse.json({ user: staff });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
