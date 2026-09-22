import { NextResponse } from "next/server";
import { getDoc, listDocs, setDoc } from "../../../../lib/db";
import { getSessionFromRequest, hashPassword } from "../../../../lib/auth";

// Sets (or resets) the password for an account. Anyone signed in may change
// their OWN password (targetStaffId omitted or equal to their own id);
// changing someone else's password requires the caller to be an Admin.
// `username` is required the first time a login is created for a staffId
// (i.e. when adding a new account from Users & Roles); for an existing
// account it's looked up from the credentials collection so the login name
// never silently changes on a password reset.
export async function POST(request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const targetStaffId = String(body.targetStaffId || session.staffId);
  const newPassword = String(body.newPassword || "");
  const requestedUsername = body.username ? String(body.username).trim().toLowerCase() : null;

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }
  if (requestedUsername && !/^[a-z0-9_.]{3,32}$/.test(requestedUsername)) {
    return NextResponse.json(
      { error: "Username must be 3-32 characters: lowercase letters, numbers, underscore or dot" },
      { status: 400 }
    );
  }

  try {
    const caller = await getDoc("staff", session.staffId);
    if (!caller || caller.active === false) {
      return NextResponse.json({ error: "account no longer exists" }, { status: 401 });
    }
    if (targetStaffId !== session.staffId && caller.role !== "Admin") {
      return NextResponse.json({ error: "Only an Admin can change another account's password" }, { status: 403 });
    }

    const allCreds = await listDocs("credentials");
    const existing = allCreds.find((c) => c.staffId === targetStaffId);

    let username = existing ? existing.id : requestedUsername;
    if (!username) {
      return NextResponse.json({ error: "Missing username for this new account" }, { status: 400 });
    }
    if (!existing && requestedUsername) {
      const taken = allCreds.some((c) => c.id === requestedUsername);
      if (taken) {
        return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
      }
      username = requestedUsername;
    }

    const passwordHash = await hashPassword(newPassword);
    await setDoc("credentials", username, { staffId: targetStaffId, passwordHash });
    return NextResponse.json({ ok: true, username });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
