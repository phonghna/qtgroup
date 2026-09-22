// Thin persistence layer backing the QT Group front-end's window.claude
// "db" polyfill (see public/index.html's inline polyfill script and
// docs/window-claude-polyfill.js for the exact API contract this must
// satisfy: collection(name).add/doc(id).set/update/delete, .get(),
// .orderBy().limit().onSnapshot() — the front-end code itself is the
// original Claude Artifact file, completely unmodified).
//
// Storage model: one Postgres table, one row per document, with the
// document's own fields kept as a single JSONB blob. This mirrors the
// original db capability's schemaless per-collection documents closely
// enough that no data-model redesign was needed to port the app across —
// every collection (orders/inventory/staff/logs/announcements/messages)
// shares this same table, distinguished by the `collection` column.
//
// Requires a `DATABASE_URL` env var pointing at a Postgres connection
// string (Vercel's Neon Postgres storage integration sets this
// automatically once attached to the project — see the deploy guide).

import { neon } from "@neondatabase/serverless";

let sqlClient = null;
function sql() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set — attach a Postgres database to this Vercel project (Storage tab -> Create Database -> Postgres) and redeploy."
    );
  }
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

let tableReadyPromise = null;
// Every route handler awaits this before touching the table. neon()'s http
// driver has no connection pool to warm up, so this is cheap to call on
// every cold start; Postgres itself makes CREATE TABLE IF NOT EXISTS a
// no-op after the first real run.
export function ensureTable() {
  if (!tableReadyPromise) {
    const db = sql();
    tableReadyPromise = db`
      CREATE TABLE IF NOT EXISTS documents (
        collection text NOT NULL,
        id text NOT NULL,
        data jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (collection, id)
      )
    `;
  }
  return tableReadyPromise;
}

function newId() {
  // Same shape as the original app's own uid() helper (Math.random-based
  // base36 string) — not cryptographically meaningful, just a short
  // unique-enough document id, consistent with what the front-end already
  // expects to see in `o.id` etc.
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

const ORDERABLE = new Set(["order_date", "at", "created_at"]);

export async function listDocs(collection, { orderBy, dir, limit } = {}) {
  await ensureTable();
  const db = sql();
  // orderBy is always one of a small fixed set the front-end actually asks
  // for (see the grep in the build notes) — allow-list it rather than
  // interpolating, since this value ultimately comes from a URL query
  // param.
  const field = ORDERABLE.has(orderBy) ? orderBy : null;
  const descending = dir !== "asc";
  const cappedLimit = Math.min(Math.max(parseInt(limit, 10) || 1000, 1), 2000);

  let rows;
  if (field) {
    rows = descending
      ? await db`
          SELECT id, data FROM documents
          WHERE collection = ${collection}
          ORDER BY (data->>${field}) DESC NULLS LAST
          LIMIT ${cappedLimit}
        `
      : await db`
          SELECT id, data FROM documents
          WHERE collection = ${collection}
          ORDER BY (data->>${field}) ASC NULLS LAST
          LIMIT ${cappedLimit}
        `;
  } else {
    rows = await db`
      SELECT id, data FROM documents
      WHERE collection = ${collection}
      LIMIT ${cappedLimit}
    `;
  }
  return rows.map((r) => ({ id: r.id, ...r.data }));
}

export async function addDoc(collection, data) {
  await ensureTable();
  const db = sql();
  const id = newId();
  await db`
    INSERT INTO documents (collection, id, data, updated_at)
    VALUES (${collection}, ${id}, ${JSON.stringify(data)}::jsonb, now())
  `;
  return id;
}

export async function setDoc(collection, id, data) {
  await ensureTable();
  const db = sql();
  await db`
    INSERT INTO documents (collection, id, data, updated_at)
    VALUES (${collection}, ${id}, ${JSON.stringify(data)}::jsonb, now())
    ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;
}

export async function updateDoc(collection, id, partial) {
  await ensureTable();
  const db = sql();
  // Shallow-merge, matching Firestore's .update() semantics that the
  // front-end code relies on (it only ever passes flat top-level fields,
  // e.g. {status, status_history}) — jsonb `||` overwrites matching keys
  // and keeps the rest of the document as-is.
  const result = await db`
    UPDATE documents
    SET data = data || ${JSON.stringify(partial)}::jsonb, updated_at = now()
    WHERE collection = ${collection} AND id = ${id}
    RETURNING id
  `;
  if (result.length === 0) {
    throw new Error(`No document ${collection}/${id} to update`);
  }
}

export async function deleteDoc(collection, id) {
  await ensureTable();
  const db = sql();
  await db`DELETE FROM documents WHERE collection = ${collection} AND id = ${id}`;
}
