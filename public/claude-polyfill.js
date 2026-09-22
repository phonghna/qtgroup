/*
 * Stand-in for window.claude on a real, standalone deployment of the QT
 * Group demo (outside claude.ai, where window.claude doesn't exist at
 * all). The app's own code (index.html) was written against two Claude
 * Artifact runtime capabilities:
 *
 *   - db        : window.claude.use("db") -> a small Firestore-shaped
 *                 document store (collection/doc/add/set/update/delete/
 *                 get/orderBy/limit/onSnapshot).
 *   - downloads : window.claude.use("downloads") -> save({filename,data})
 *                 to hand the visitor a generated file (used for the
 *                 7-Eleven/FamilyMart .xlsx exports and the T-Cat CSV).
 *
 * This file implements both against ordinary web platform APIs so the
 * app's business logic (index.html) runs completely unmodified:
 *   - db is backed by the /api/collections/* routes (a real Postgres
 *     table on the server, see lib/db.js) instead of Claude's managed
 *     store, so data is now genuinely shared across every visitor.
 *   - downloads triggers a normal browser file download (Blob + a
 *     temporary <a download> click) instead of Claude's save-confirmation
 *     UI.
 *
 * IMPORTANT — this is polling-based sync, not push/websocket realtime.
 * Firestore-style onSnapshot() pushes changes the instant they happen;
 * here each onSnapshot() subscription instead re-fetches its collection
 * on a timer (POLL_MS below) and only re-invokes the callback when the
 * fetched data actually changed. That means two visitors can be out of
 * sync with each other for up to POLL_MS after either of them writes —
 * fine for an internal demo, not true realtime. Bumping POLL_MS trades
 * freshness for fewer requests; see the deploy notes for details.
 */
(function () {
  "use strict";

  var POLL_MS = 3000;

  function apiUrl(collection, id) {
    var base = "/api/collections/" + encodeURIComponent(collection);
    return id != null ? base + "/" + encodeURIComponent(id) : base;
  }

  async function fetchJson(url, opts) {
    var res = await fetch(url, opts);
    if (!res.ok) {
      var body = await res.text().catch(function () { return ""; });
      throw new Error("Request failed (" + res.status + "): " + body);
    }
    return res.json();
  }

  function makeDocRef(collection, id) {
    return {
      id: id,
      set: function (data) {
        return fetchJson(apiUrl(collection, id), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      },
      update: function (partial) {
        return fetchJson(apiUrl(collection, id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partial),
        });
      },
      delete: function () {
        return fetchJson(apiUrl(collection, id), { method: "DELETE" });
      },
    };
  }

  function makeCollectionRef(collection, query) {
    query = query || {};

    function listUrl() {
      var url = apiUrl(collection);
      var params = [];
      if (query.orderBy) params.push("orderBy=" + encodeURIComponent(query.orderBy));
      if (query.dir) params.push("dir=" + encodeURIComponent(query.dir));
      if (query.limit != null) params.push("limit=" + encodeURIComponent(query.limit));
      if (params.length) url += "?" + params.join("&");
      return url;
    }

    async function fetchDocs() {
      var json = await fetchJson(listUrl());
      return (json.docs || []).map(function (d) {
        var copy = Object.assign({}, d);
        var docId = copy.id;
        delete copy.id;
        return { id: docId, data: function () { return copy; } };
      });
    }

    return {
      add: function (data) {
        return fetchJson(apiUrl(collection), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      },
      doc: function (id) {
        return makeDocRef(collection, id);
      },
      get: function () {
        return fetchDocs().then(function (docs) { return { docs: docs }; });
      },
      orderBy: function (field, dir) {
        return makeCollectionRef(collection, Object.assign({}, query, { orderBy: field, dir: dir }));
      },
      limit: function (n) {
        return makeCollectionRef(collection, Object.assign({}, query, { limit: n }));
      },
      onSnapshot: function (onNext, onError) {
        var stopped = false;
        var lastSerialized = null;

        async function tick() {
          if (stopped) return;
          try {
            var docs = await fetchDocs();
            // Cheap change detection so the callback only fires when the
            // collection actually changed, matching onSnapshot's "fires on
            // change" contract closely enough for this app (which re-renders
            // its whole view on every callback).
            var serialized = JSON.stringify(docs.map(function (d) { return [d.id, d.data()]; }));
            if (serialized !== lastSerialized) {
              lastSerialized = serialized;
              onNext({ docs: docs });
            }
          } catch (e) {
            if (onError) onError(e);
          } finally {
            if (!stopped) setTimeout(tick, POLL_MS);
          }
        }
        tick();

        return function unsubscribe() { stopped = true; };
      },
    };
  }

  function makeDb() {
    return {
      collection: function (name) { return makeCollectionRef(name); },
    };
  }

  function triggerBrowserDownload(filename, data) {
    var blob;
    if (data instanceof Blob) {
      blob = data;
    } else if (typeof data === "string") {
      blob = new Blob([data], { type: "text/plain" });
    } else if (data instanceof ArrayBuffer) {
      blob = new Blob([data]);
    } else if (ArrayBuffer.isView(data)) {
      // Covers the Uint8Array our hand-rolled XLSX writer produces.
      blob = new Blob([data]);
    } else {
      throw new Error("Unsupported download data type");
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  window.claude = {
    use: async function (name) {
      if (name === "db") return makeDb();
      if (name === "downloads") {
        return {
          save: async function (req) {
            triggerBrowserDownload(req.filename, req.data);
            return { status: "saved" };
          },
        };
      }
      return null;
    },
  };
})();
