import type { CacheComponents, HttpCachingState } from "./httpCachingSlice";

/* ══════════════════════════════════════════════════════════
   Declarative Flow Engine — HTTP Caching Sandbox

   Three scenarios modelled:
     A) Browser cache hit  (browserCache ON, max-age fresh)
     B) Browser miss → CDN hit  (cdn ON)
     C) Full miss → Origin

   Each step owns a unique signal path.
   ══════════════════════════════════════════════════════════ */

/* ── Token expansion ─────────────────────────────────── */

export function expandToken(token: string, state: HttpCachingState): string[] {
  if (token === "$clients") return state.clients.map((c) => c.id);
  return [token];
}

/* ── Flow Beat ───────────────────────────────────────── */

export interface FlowBeat {
  from: string;
  to: string;
  when?: (s: HttpCachingState) => boolean;
  duration?: number;
  explain?: string;
}

/* ── Step Definition ─────────────────────────────────── */

export type StepKey =
  | "overview"
  | "send-request"
  | "browser-cache-check"
  | "cdn-cache-check"
  | "origin-fetch"
  | "response-headers"
  | "summary";

export interface StepDef {
  key: StepKey;
  label: string;
  when?: (s: HttpCachingState) => boolean;
  nextButton?: string | ((c: CacheComponents) => string);
  nextButtonColor?: string;
  processingText?: string;
  phase?: string | ((s: HttpCachingState) => string);
  flow?: FlowBeat[];
  delay?: number;
  recalcMetrics?: boolean;
  finalHotZones?: string[];
  explain?: string | ((s: HttpCachingState) => string);
  action?: "reset";
}

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  /* ─── 1. Overview ─────────────────────────────────── */
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Send Request",
    action: "reset",
  },

  /* ─── 2. Send Request — clients → internet / browser-cache ── */
  {
    key: "send-request",
    label: "Browser Sends Request",
    processingText: "Requesting…",
    nextButtonColor: "#3b82f6",
    phase: "request",
    flow: [
      {
        // Fresh max-age + browser cache ON: request goes straight to local cache
        from: "$clients",
        to: "browser-cache",
        when: (s) =>
          s.components.browserCache &&
          !s.cacheExpired &&
          s.cachePolicy === "max-age",
        duration: 300,
        explain:
          "Browser checks local cache first — the request never needs to touch the network!",
      },
      {
        // All other cases: request goes out to the network
        from: "$clients",
        to: "internet",
        when: (s) =>
          !(
            s.components.browserCache &&
            !s.cacheExpired &&
            s.cachePolicy === "max-age"
          ),
        duration: 600,
        explain:
          "Browser sends GET /app.js over HTTPS. The TLS handshake secures the connection.",
      },
    ],
    explain: (s) =>
      s.components.browserCache &&
      !s.cacheExpired &&
      s.cachePolicy === "max-age"
        ? "Cache is still fresh — the request went straight to browser cache. No network!"
        : "Request sent. Now checking the caching layers…",
  },

  /* ─── 3. Browser Cache Check ──────────────────────────────── */
  {
    key: "browser-cache-check",
    label: "Browser Cache Check",
    when: (s) => s.components.browserCache,
    processingText: "Checking…",
    nextButtonColor: "#22c55e",
    phase: (s) =>
      !s.cacheExpired && s.cachePolicy === "max-age"
        ? "browser-hit"
        : "browser-validate",
    flow: [
      {
        // Fresh max-age: cache hit — response returns from browser cache directly
        from: "browser-cache",
        to: "$clients",
        when: (s) => !s.cacheExpired && s.cachePolicy === "max-age",
        duration: 400,
        explain:
          "CACHE HIT — browser serves from local memory in ~5ms. The request never left the browser!",
      },
      {
        // Expired max-age: shows the miss — browser hits the network
        from: "internet",
        to: "browser-cache",
        when: (s) => s.cacheExpired,
        duration: 500,
        explain:
          "Cache EXPIRED — browser now sends a request to the network for fresh content.",
      },
      {
        // no-cache: validation round-trip (If-None-Match → 304)
        from: "internet",
        to: "browser-cache",
        when: (s) => s.cachePolicy === "no-cache" && !s.cacheExpired,
        duration: 500,
        explain:
          "no-cache: browser sends If-None-Match to validate. Server replies 304 Not Modified.",
      },
      {
        from: "browser-cache",
        to: "$clients",
        when: (s) => s.cachePolicy === "no-cache" && !s.cacheExpired,
        duration: 350,
        explain:
          "304 Not Modified — cached content confirmed valid. Served with minimal bandwidth.",
      },
    ],
    recalcMetrics: true,
    finalHotZones: ["browser-cache"],
    explain: (s) =>
      !s.cacheExpired && s.cachePolicy === "max-age"
        ? `Browser cache HIT — served in ~${s.latencyMs}ms. Zero network requests.`
        : s.cacheExpired
          ? "Browser cache EXPIRED — the max-age limit was hit. Browser must fetch fresh content."
          : s.cachePolicy === "no-cache"
            ? "Browser validated with server (If-None-Match). Got 304 — no body downloaded."
            : "Cache policy is no-store — browser skips cache entirely.",
  },

  /* ─── 4. CDN Cache Check — unique: internet → cdn ──── */
  {
    key: "cdn-cache-check",
    label: "CDN Edge Cache",
    when: (s) => s.components.cdn,
    processingText: "Checking edge…",
    nextButtonColor: "#8b5cf6",
    phase: (s) => (s.cachePolicy === "no-store" ? "cdn-miss" : "cdn-hit"),
    flow: [
      {
        from: "internet",
        to: "cdn",
        duration: 500,
        explain:
          "Request reaches the nearest CDN edge server. It checks its cache.",
      },
      {
        from: "cdn",
        to: "internet",
        duration: 400,
        explain:
          "CDN cache HIT — response returns from the edge. No origin needed.",
        when: (c) => c.components.cdn,
      },
    ],
    recalcMetrics: true,
    finalHotZones: ["cdn"],
    explain: (s) =>
      s.cachePolicy === "no-store"
        ? "Cache policy is no-store — CDN passes through to origin."
        : `CDN cache HIT — served from edge in ~${s.latencyMs}ms. Origin not contacted.`,
  },

  /* ─── 5. Origin Fetch — unique: internet → origin ──── */
  {
    key: "origin-fetch",
    label: "Origin Server",
    processingText: "Fetching…",
    nextButtonColor: "#ef4444",
    // Show origin whenever the browser ISN'T serving a fresh max-age hit AND there's no CDN
    when: (s) => {
      const browserServesFresh =
        s.components.browserCache &&
        !s.cacheExpired &&
        s.cachePolicy === "max-age";
      return !browserServesFresh && !s.components.cdn;
    },
    phase: "origin",
    flow: [
      {
        from: "internet",
        to: "origin",
        duration: 700,
        explain:
          "Cache miss everywhere — request travels to the origin server.",
      },
      {
        from: "origin",
        to: "internet",
        duration: 700,
        explain:
          "Origin responds with the resource + Cache-Control and ETag headers.",
      },
    ],
    recalcMetrics: true,
    finalHotZones: ["origin"],
    explain: (s) =>
      `Origin responded in ~${s.latencyMs}ms. Response includes caching headers for future requests.`,
  },

  /* ─── 6. Response Headers — no animation, explanation ── */
  {
    key: "response-headers",
    label: "Caching Headers",
    nextButtonColor: "#f59e0b",
    phase: "headers",
    delay: 500,
    recalcMetrics: true,
    finalHotZones: ["browser-cache", "cdn"],
    explain: (s) => {
      if (s.cachePolicy === "max-age")
        return `Cache-Control: max-age=${s.cacheTtlSeconds}. Browser and CDN will serve from cache for ${s.cacheTtlSeconds}s. Next request is instant.`;
      if (s.cachePolicy === "no-cache")
        return "Cache-Control: no-cache. Browser & CDN must validate every request (If-None-Match → 304 Not Modified).";
      return "Cache-Control: no-store. Nothing is cached anywhere. Every request goes to origin.";
    },
  },

  /* ─── 7. Summary ──────────────────────────────────── */
  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    explain: (s) => {
      const layers: string[] = [];
      if (s.components.browserCache) layers.push("Browser Cache");
      if (s.components.cdn) layers.push("CDN");
      layers.push("Origin");
      const hitRate = Math.round(
        (1 - s.originRequests / Math.max(1, s.totalRequests)) * 100,
      );
      return `Path: ${layers.join(" → ")}. Cache hit rate: ${hitRate}%. Avg latency: ~${s.latencyMs}ms. Try toggling layers and policies.`;
    },
  },
];

/* ── Build active steps from config ──────────────────── */

export interface TaggedStep {
  key: StepKey;
  label: string;
  autoAdvance?: boolean;
  nextButtonText?: string;
  nextButtonColor?: string;
  processingText?: string;
}

export function buildSteps(state: HttpCachingState): TaggedStep[] {
  const { components: c } = state;
  const active = STEPS.filter((s) => !s.when || s.when(state));

  return active.map((step, i) => {
    const nextStep = active[i + 1];
    let nextButtonText: string | undefined;
    if (typeof step.nextButton === "function") {
      nextButtonText = step.nextButton(c);
    } else if (typeof step.nextButton === "string") {
      nextButtonText = step.nextButton;
    } else if (nextStep) {
      nextButtonText = nextStep.label;
    }

    return {
      key: step.key,
      label: step.label,
      autoAdvance: false,
      nextButtonText,
      nextButtonColor: step.nextButtonColor,
      processingText: step.processingText,
    };
  });
}

/* ── Flow Executor ───────────────────────────────────── */

export interface FlowExecutorDeps {
  animateParallel: (
    pairs: { from: string; to: string }[],
    duration: number,
  ) => Promise<void>;
  patch: (p: Partial<HttpCachingState>) => void;
  getState: () => HttpCachingState;
  cancelled: () => boolean;
}

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  const state = deps.getState();
  const activeBeats = beats.filter((b) => !b.when || b.when(state));

  for (const beat of activeBeats) {
    if (deps.cancelled()) return;

    const state = deps.getState();
    const froms = expandToken(beat.from, state);
    const tos = expandToken(beat.to, state);

    const pairs: { from: string; to: string }[] = [];
    for (const f of froms) {
      for (const t of tos) {
        pairs.push({ from: f, to: t });
      }
    }

    const hotZones = [...new Set([...froms, ...tos])];
    const update: Partial<HttpCachingState> = { hotZones };
    if (beat.explain) update.explanation = beat.explain;
    deps.patch(update);

    await deps.animateParallel(pairs, beat.duration ?? 600);
  }
}
