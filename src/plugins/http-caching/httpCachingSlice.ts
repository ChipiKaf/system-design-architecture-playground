import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/* ── Togglable caching layers ────────────────────────── */
export interface CacheComponents {
  browserCache: boolean;
  cdn: boolean;
}

export type ComponentName = keyof CacheComponents;

/** Prerequisites: CDN has no prereqs; browser cache has no prereqs. */
const PREREQUISITES: Partial<Record<ComponentName, ComponentName[]>> = {};

/** No cascades needed — layers are independent. */
const CASCADE_REMOVE: Partial<Record<ComponentName, ComponentName[]>> = {};

/* ── Client model ────────────────────────────────────── */
export interface ClientNode {
  id: string;
  type: "desktop" | "mobile";
}

/* ── Cache control settings ──────────────────────────── */
export type CachePolicy = "max-age" | "no-cache" | "no-store";

/* ── State shape ─────────────────────────────────────── */
export interface HttpCachingState {
  components: CacheComponents;
  clients: ClientNode[];

  /** HTTP cache policy in effect */
  cachePolicy: CachePolicy;
  /** TTL in seconds for max-age policy */
  cacheTtlSeconds: number;
  /** seconds elapsed since last cache population */
  cacheAgeSeconds: number;
  /** true once cacheAgeSeconds >= cacheTtlSeconds */
  cacheExpired: boolean;

  /* derived metrics */
  latencyMs: number;
  browserHitRate: number;
  cdnHitRate: number;
  originRequests: number;
  totalRequests: number;

  /* ui */
  hotZones: string[];
  explanation: string;
  phase: string;
}

const defaultClients: ClientNode[] = [
  { id: "client-1", type: "desktop" },
  { id: "client-2", type: "mobile" },
  { id: "client-3", type: "desktop" },
];

/* ── Latency & metrics model ─────────────────────────── */
function computeLatency(
  c: CacheComponents,
  policy: CachePolicy,
  cacheExpired: boolean,
): number {
  // Base origin round-trip
  const originLatency = 200;
  const cdnLatency = 40;
  const browserLatency = 5;

  if (policy === "no-store") return originLatency;
  if (policy === "no-cache") {
    // Must validate — 304 is fast but still a round-trip
    if (c.cdn) return cdnLatency + 10; // validation at CDN edge
    return originLatency - 50; // validation at origin (still needs round-trip)
  }
  // max-age — served from closest cache (only if not expired)
  if (c.browserCache && !cacheExpired) return browserLatency;
  if (c.cdn) return cdnLatency;
  return originLatency;
}

export function computeMetrics(state: HttpCachingState) {
  const { components: c, cachePolicy, clients, cacheExpired } = state;
  const total = clients.length;
  state.totalRequests = total;

  if (cachePolicy === "no-store") {
    // No caching at all
    state.browserHitRate = 0;
    state.cdnHitRate = 0;
    state.originRequests = total;
  } else if (cachePolicy === "no-cache") {
    // Must validate — conditional requests
    state.browserHitRate = 0; // always validates
    state.cdnHitRate = c.cdn ? 0.7 : 0; // CDN can serve 304
    const cdnServed = c.cdn ? Math.round(total * 0.7) : 0;
    state.originRequests = total - cdnServed;
  } else {
    // max-age — browser cache only serves if not expired
    const freshBrowserCache = c.browserCache && !cacheExpired;
    const browserHits = freshBrowserCache ? Math.round(total * 0.6) : 0;
    const remaining = total - browserHits;
    const cdnHits = c.cdn ? Math.round(remaining * 0.8) : 0;
    const originHits = remaining - cdnHits;

    state.browserHitRate = freshBrowserCache ? 0.6 : 0;
    state.cdnHitRate = c.cdn && remaining > 0 ? cdnHits / remaining : 0;
    state.originRequests = originHits;
  }

  state.latencyMs = computeLatency(c, cachePolicy, cacheExpired);
}

function describeArch(c: CacheComponents): string {
  const parts: string[] = [];
  if (c.browserCache) parts.push("Browser Cache");
  if (c.cdn) parts.push("CDN");
  parts.push("Origin Server");
  return parts.join(" → ");
}

export const initialState: HttpCachingState = {
  components: {
    browserCache: false,
    cdn: false,
  },
  clients: defaultClients,

  cachePolicy: "max-age",
  cacheTtlSeconds: 30,
  cacheAgeSeconds: 0,
  cacheExpired: false,

  latencyMs: 200,
  browserHitRate: 0,
  cdnHitRate: 0,
  originRequests: 3,
  totalRequests: 3,

  hotZones: [],
  explanation:
    "No caching layers. Every request goes directly to the origin server (~200ms latency).",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const httpCachingSlice = createSlice({
  name: "httpCaching",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState, clients: [...initialState.clients] };
      computeMetrics(s);
      return s;
    },
    patchState(state, action: PayloadAction<Partial<HttpCachingState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },

    /* ── Component toggles ─────────────────────────── */
    addComponent(state, action: PayloadAction<ComponentName>) {
      const name = action.payload;
      const prereqs = PREREQUISITES[name];
      if (prereqs?.some((p) => !state.components[p])) return;
      if (state.components[name]) return;
      (state.components[name] as boolean) = true;

      state.cacheAgeSeconds = 0;
      state.cacheExpired = false;
      computeMetrics(state);
      state.explanation = `Added! Path: ${describeArch(state.components)}. Avg latency: ~${state.latencyMs}ms.`;
    },

    removeComponent(state, action: PayloadAction<ComponentName>) {
      const name = action.payload;
      if (!state.components[name]) return;
      (state.components[name] as boolean) = false;

      const cascades = CASCADE_REMOVE[name];
      if (cascades) {
        for (const dep of cascades) {
          (state.components[dep] as boolean) = false;
        }
      }

      state.cacheAgeSeconds = 0;
      state.cacheExpired = false;
      computeMetrics(state);
      state.explanation = `Removed. Path: ${describeArch(state.components)}. Avg latency: ~${state.latencyMs}ms.`;
    },

    /* ── Cache age / expiry ────────────────────────── */
    tickCacheAge(state) {
      if (state.cacheExpired || state.cachePolicy !== "max-age") return;
      state.cacheAgeSeconds += 1;
      if (state.cacheAgeSeconds >= state.cacheTtlSeconds) {
        state.cacheExpired = true;
        computeMetrics(state);
      }
    },
    setTtl(state, action: PayloadAction<number>) {
      state.cacheTtlSeconds = action.payload;
      state.cacheAgeSeconds = 0;
      state.cacheExpired = false;
      computeMetrics(state);
    },

    /* ── Cache policy ──────────────────────────────── */
    setCachePolicy(state, action: PayloadAction<CachePolicy>) {
      state.cachePolicy = action.payload;
      state.cacheAgeSeconds = 0;
      state.cacheExpired = false;
      computeMetrics(state);
    },

    /* ── Client controls ───────────────────────────── */
    addClient(state) {
      if (state.clients.length >= 12) return;
      const id = `client-${Date.now()}`;
      const type = state.clients.length % 2 === 0 ? "desktop" : "mobile";
      state.clients.push({ id, type });
      computeMetrics(state);
    },
    removeClient(state) {
      if (state.clients.length <= 1) return;
      state.clients.pop();
      computeMetrics(state);
    },
  },
});

export const {
  reset,
  patchState,
  recalcMetrics,
  addComponent,
  removeComponent,
  setCachePolicy,
  tickCacheAge,
  setTtl,
  addClient,
  removeClient,
} = httpCachingSlice.actions;
export default httpCachingSlice.reducer;
