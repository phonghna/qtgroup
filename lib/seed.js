// Server-only seed data + lazy first-run seeding for the `staff` and
// `credentials` collections. Mirrors the STAFF_SEED roster baked into
// public/index.html (same ids/names/roles/markets, so profile data stays
// consistent whether it was written by this seeder or by the client's own
// "Reset demo data" flow), plus the real login credentials that only exist
// server-side — public/index.html never sees a password or a password
// hash, only the profile fields.
//
// IMPORTANT: these are temporary starter passwords, meant to be changed.
// Tell whoever owns each account to sign in once and set a new password
// from the "Users & Roles" tab (Admin can reset anyone's password there).

import { listDocs, setDoc } from "./db";
import { hashPassword } from "./auth";

export const STAFF_SEED = [
  { id: "qt", username: "qtgroup", name: "QT", role: "Admin", markets: "ALL", tempPassword: "quyetthang@123" },
  { id: "sherence", username: "sherence", name: "Sherence", role: "Manager", markets: ["VN", "PH"], tempPassword: "SherenceQuill3391!" },
  { id: "ciara", username: "ciara", name: "Ciara", role: "Manager", markets: ["TL", "IN"], tempPassword: "CiaraNova9694!" },
  { id: "ivy", username: "ivy", name: "Ivy", role: "CS", markets: ["VN"], tempPassword: "IvyMaple9047!" },
  { id: "rhea", username: "rhea", name: "Rhea", role: "CS", markets: ["PH"], tempPassword: "RheaOnyx8280!" },
  { id: "eloisa", username: "eloisa", name: "Eloisa", role: "CS", markets: ["TL", "IN"], tempPassword: "EloisaQuill2717!" },
  { id: "shane", username: "shane", name: "Shane", role: "Packing", markets: "ALL", tempPassword: "ShaneCedar3764!" },
];

let seedingPromise = null;

// Idempotent: only actually writes anything the first time the `staff`
// collection is empty (fresh database). Safe to call at the top of every
// auth-related route — cheap after the first real run (one SELECT).
export function ensureStaffSeeded() {
  if (!seedingPromise) {
    seedingPromise = (async () => {
      const existing = await listDocs("staff");
      if (existing.length > 0) return;
      for (const u of STAFF_SEED) {
        const { id, username, tempPassword, ...profile } = u;
        await setDoc("staff", id, { ...profile, username, active: true });
        const passwordHash = await hashPassword(tempPassword);
        await setDoc("credentials", username, { staffId: id, passwordHash });
      }
    })().catch((e) => {
      // Let the next call retry instead of caching a failed attempt forever.
      seedingPromise = null;
      throw e;
    });
  }
  return seedingPromise;
}
