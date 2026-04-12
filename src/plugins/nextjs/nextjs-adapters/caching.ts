import type { NextjsAdapter } from "./types";
import type { NextjsState } from "../nextjsSlice";

const POS = {
  request1: { x: 80, y: 80 },
  cache: { x: 340, y: 80 },
  origin: { x: 340, y: 260 },
  result: { x: 600, y: 80 },
  request2: { x: 80, y: 400 },
  cacheHit: { x: 340, y: 400 },
  instant: { x: 600, y: 400 },
};

export const cachingAdapter: NextjsAdapter = {
  id: "caching",

  profile: {
    label: "Caching & Revalidation",
    description:
      "Cache = meal prep. Static = made ahead, dynamic = made when ordered, revalidated = refreshed when stale. Next.js decides based on your fetch config.",
  },

  colors: { fill: "#14532d", stroke: "#4ade80" },

  computeMetrics(state: NextjsState) {
    const active = state.phase === "processing" || state.phase === "summary";
    state.cacheHit = state.phase === "summary";
    state.dataFetched = active;
    state.revalidated = state.phase === "summary";
  },

  expandToken(): string[] | null {
    return null;
  },

  getFlowBeats() {
    return [
      {
        from: "request-1",
        to: "cache",
        duration: 500,
        color: "#60a5fa",
        explain:
          "First request arrives. Next.js checks: is there a cached result for this route + data combination?",
      },
      {
        from: "cache",
        to: "origin",
        duration: 600,
        color: "#f87171",
        explain:
          "Cache MISS — nothing stored yet. The server fetches data from the origin (database, API).",
      },
      {
        from: "origin",
        to: "cache",
        duration: 500,
        color: "#f59e0b",
        explain:
          "Data returns. Next.js stores the rendered result in the cache for future requests.",
      },
      {
        from: "cache",
        to: "result",
        duration: 400,
        color: "#4ade80",
        explain:
          "First response served. The cache is now warm — like pre-prepared food ready to reheat.",
      },
      {
        from: "request-2",
        to: "cache-hit",
        duration: 400,
        color: "#22d3ee",
        explain:
          "Second request for the same route. This time the cache has a stored result.",
      },
      {
        from: "cache-hit",
        to: "instant",
        duration: 300,
        color: "#4ade80",
        explain:
          "Cache HIT — the result is served instantly. No database call, no server rendering. Revalidation can refresh it later.",
      },
    ];
  },

  getStepLabels() {
    return [
      "1st Request → Cache",
      "Cache MISS → Origin",
      "Store in Cache",
      "Return Result",
      "2nd Request → Cache",
      "Cache HIT → Instant",
    ];
  },

  buildTopology(builder: any, state: NextjsState, helpers) {
    const hot = helpers.hot;
    const hit = state.cacheHit;

    builder
      .node("request-1")
      .at(POS.request1.x, POS.request1.y)
      .rect(160, 52, 12)
      .fill(hot("request-1") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("request-1") ? "#60a5fa" : "#334155", 2)
      .label("1st Request", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
      });

    builder
      .node("cache")
      .at(POS.cache.x, POS.cache.y)
      .rect(180, 52, 12)
      .fill(hot("cache") ? "#7f1d1d" : "#0f172a")
      .stroke(hot("cache") ? "#f87171" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Cache");
          l.newline();
          l.color("MISS — nothing stored", "#fca5a5", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("origin")
      .at(POS.origin.x, POS.origin.y)
      .rect(180, 52, 12)
      .fill(hot("origin") ? "#78350f" : "#0f172a")
      .stroke(hot("origin") ? "#f59e0b" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Origin (DB / API)");
          l.newline();
          l.color("fetch + store in cache", "#fde68a", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("result")
      .at(POS.result.x, POS.result.y)
      .rect(160, 52, 12)
      .fill(hot("result") ? "#14532d" : "#0f172a")
      .stroke(hot("result") ? "#4ade80" : "#334155", 2)
      .label("Response (slow)", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
      });

    /* second row — cache hit */
    builder
      .node("request-2")
      .at(POS.request2.x, POS.request2.y)
      .rect(160, 52, 12)
      .fill(hot("request-2") ? "#164e63" : "#0f172a")
      .stroke(hot("request-2") ? "#22d3ee" : "#334155", 2)
      .label("2nd Request", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
      });

    builder
      .node("cache-hit")
      .at(POS.cacheHit.x, POS.cacheHit.y)
      .rect(180, 52, 12)
      .fill(hot("cache-hit") ? "#14532d" : "#0f172a")
      .stroke(hot("cache-hit") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Cache");
          l.newline();
          l.color(
            hit ? "HIT ✓ — instant" : "checking…",
            hit ? "#86efac" : "#94a3b8",
            {
              fontSize: 9,
            },
          );
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    builder
      .node("instant")
      .at(POS.instant.x, POS.instant.y)
      .rect(160, 52, 12)
      .fill(hot("instant") ? "#14532d" : "#0f172a")
      .stroke(hot("instant") ? "#4ade80" : "#334155", 2)
      .richLabel(
        (l: any) => {
          l.bold("Response (instant)");
          l.newline();
          l.color("no DB call needed", "#86efac", { fontSize: 9 });
        },
        { fill: "#fff", fontSize: 11, dy: -4, lineHeight: 1.6 },
      );

    /* edges row 1 */
    builder.edge("request-1", "cache", "e-r1-cache").stroke("#60a5fa", 1.4);
    builder.edge("cache", "origin", "e-cache-origin").stroke("#f87171", 1.4);
    builder
      .edge("origin", "cache", "e-origin-cache")
      .stroke("#f59e0b", 1.2)
      .dashed();
    builder.edge("cache", "result", "e-cache-result").stroke("#4ade80", 1.4);

    /* edges row 2 */
    builder.edge("request-2", "cache-hit", "e-r2-cache").stroke("#22d3ee", 1.4);
    builder
      .edge("cache-hit", "instant", "e-hit-instant")
      .stroke("#4ade80", 1.4);
  },

  getStatBadges(state: NextjsState) {
    return [
      { label: "Pattern", value: "Caching", color: "#4ade80" },
      {
        label: "Cache",
        value: state.cacheHit ? "HIT" : "MISS",
        color: state.cacheHit ? "#4ade80" : "#f87171",
      },
      {
        label: "Revalidated",
        value: state.revalidated ? "Yes" : "—",
        color: "#f59e0b",
      },
    ];
  },

  softReset(state: NextjsState) {
    state.cacheHit = false;
    state.dataFetched = false;
    state.revalidated = false;
  },
};
