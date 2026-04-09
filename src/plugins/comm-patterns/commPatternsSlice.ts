import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   Communication Patterns Lab — Redux Slice

   Patterns covered (extensible — add a key + profile):
     • direct        — Client calls each service directly
     • gateway-route — API Gateway routes to one service
     • gateway-agg   — API Gateway aggregates responses
     • gateway-offload — Gateway handles cross-cutting concerns
     • bff           — Dedicated backend per frontend experience
   ══════════════════════════════════════════════════════════ */

/* ── Pattern (variant) identifiers ───────────────────── */
export type PatternKey =
  | "direct"
  | "gateway-route"
  | "gateway-agg"
  | "gateway-offload"
  | "bff";

/* ── Per-pattern profile ─────────────────────────────── */
export interface PatternProfile {
  key: PatternKey;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
  clientCalls: number;
  latencyLabel: string;
  coupling: "high" | "medium" | "low";
  complexity: "low" | "medium" | "high";
  strengths: string[];
  weaknesses: string[];
}

export const PATTERN_PROFILES: Record<PatternKey, PatternProfile> = {
  direct: {
    key: "direct",
    label: "Direct Client-to-Service",
    shortLabel: "Direct",
    color: "#ef4444",
    description:
      "The client knows every service address and fans out requests itself. Simple to start, but couples the client to service topology.",
    clientCalls: 4,
    latencyLabel: "Sum of all calls",
    coupling: "high",
    complexity: "low",
    strengths: [
      "No extra infrastructure required",
      "Easy to reason about for small systems",
    ],
    weaknesses: [
      "Client must know every service address",
      "N round-trips from client to backend",
      "Cross-cutting concerns duplicated per service",
      "Hard to version or migrate services independently",
    ],
  },
  "gateway-route": {
    key: "gateway-route",
    label: "Gateway Routing",
    shortLabel: "Routing",
    color: "#3b82f6",
    description:
      "An API Gateway acts as a reverse proxy, routing each request to the correct downstream service based on path, headers, or method. Clients call a single endpoint.",
    clientCalls: 1,
    latencyLabel: "Client → GW → Service",
    coupling: "low",
    complexity: "medium",
    strengths: [
      "Single client endpoint — services hidden",
      "Layer 7 routing by path/header/method",
      "Enables API versioning & blue/green deploys",
      "Decouples client from service topology",
    ],
    weaknesses: [
      "Gateway is a single point of failure",
      "Adds one network hop of latency",
      "Routing rules must be maintained",
    ],
  },
  "gateway-agg": {
    key: "gateway-agg",
    label: "Gateway Aggregation",
    shortLabel: "Aggregation",
    color: "#22c55e",
    description:
      "The gateway dispatches a single client request to multiple backend services in parallel, aggregates their responses, and returns one consolidated payload.",
    clientCalls: 1,
    latencyLabel: "Max of parallel calls",
    coupling: "low",
    complexity: "high",
    strengths: [
      "Single round-trip for the client",
      "Parallel fan-out reduces total latency",
      "Backend composition hidden from client",
      "Ideal for dashboards and composite pages",
    ],
    weaknesses: [
      "Gateway must understand response schemas",
      "Partial failure handling is complex",
      "Aggregation logic can become a bottleneck",
    ],
  },
  "gateway-offload": {
    key: "gateway-offload",
    label: "Gateway Offloading",
    shortLabel: "Offloading",
    color: "#f59e0b",
    description:
      "The gateway handles cross-cutting concerns — SSL termination, authentication, rate limiting, logging — so individual services stay focused on business logic.",
    clientCalls: 1,
    latencyLabel: "Client → GW (+ concerns) → Service",
    coupling: "low",
    complexity: "medium",
    strengths: [
      "SSL termination at one place",
      "Centralised auth, rate limiting, logging",
      "Services don't duplicate cross-cutting code",
      "Easier to enforce security policies uniformly",
    ],
    weaknesses: [
      "Gateway becomes a critical dependency",
      "Added processing time for each concern",
      "Configuration sprawl if too many concerns",
    ],
  },
  bff: {
    key: "bff",
    label: "Backends for Frontends (BFF)",
    shortLabel: "BFF",
    color: "#ec4899",
    description:
      "Each frontend gets its own dedicated backend or specialized API gateway, optimized for its UI and data needs instead of forcing every client through one generic API.",
    clientCalls: 1,
    latencyLabel: "Client → BFF → Services",
    coupling: "low",
    complexity: "high",
    strengths: [
      "Tailored APIs per frontend experience",
      "Moves aggregation and shaping out of the client",
      "Web and mobile can evolve independently",
      "Avoids a one-size-fits-all 'God' gateway",
    ],
    weaknesses: [
      "More BFF services to deploy and own",
      "Some orchestration logic can be duplicated",
      "Cross-client consistency needs coordination",
    ],
  },
};

export const PATTERN_KEYS = Object.keys(PATTERN_PROFILES) as PatternKey[];

/* ── Service list (shared topology) ──────────────────── */
export const SERVICES = ["Catalog", "ShoppingCart", "Discount", "Order"] as const;
export type ServiceName = (typeof SERVICES)[number];

/* ── State shape ─────────────────────────────────────── */
export interface CommPatternsState extends LabState {
  pattern: PatternKey;

  /* derived metrics */
  clientRoundTrips: number;
  totalLatencyMs: number;
  backendCalls: number;
}

/* ── Metrics model ───────────────────────────────────── */
export function computeMetrics(state: CommPatternsState) {
  const p = PATTERN_PROFILES[state.pattern];
  state.clientRoundTrips = p.clientCalls;
  state.backendCalls = SERVICES.length;

  switch (state.pattern) {
    case "direct":
      // 4 sequential calls at ~80ms each
      state.totalLatencyMs = SERVICES.length * 80;
      break;
    case "gateway-route":
      // Client→GW (20ms) + GW→Service (80ms)
      state.totalLatencyMs = 100;
      break;
    case "gateway-agg":
      // Client→GW (20ms) + max(parallel 80ms each) ≈ 100ms
      state.totalLatencyMs = 100;
      break;
    case "gateway-offload":
      // Client→GW (20ms) + concerns (30ms) + GW→Service (80ms)
      state.totalLatencyMs = 130;
      break;
    case "bff":
      // Client→BFF (20ms) + tailored composition over 3 services (~95ms max)
      state.totalLatencyMs = 115;
      state.backendCalls = 3;
      break;
  }
}

export const initialState: CommPatternsState = {
  pattern: "gateway-route",
  clientRoundTrips: 1,
  totalLatencyMs: 100,
  backendCalls: 4,

  hotZones: [],
  explanation:
    "Choose a communication pattern and step through to see how requests flow from client to backend services.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const commPatternsSlice = createSlice({
  name: "commPatterns",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState };
      computeMetrics(s);
      return s;
    },
    softResetRun: (state) => {
      state.hotZones = [];
      state.explanation = PATTERN_PROFILES[state.pattern].description;
      state.phase = "overview";
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<CommPatternsState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setPattern(state, action: PayloadAction<PatternKey>) {
      state.pattern = action.payload;
      state.hotZones = [];
      state.explanation = PATTERN_PROFILES[action.payload].description;
      state.phase = "overview";
      computeMetrics(state);
    },
  },
});

export const {
  reset,
  softResetRun,
  patchState,
  recalcMetrics,
  setPattern,
} = commPatternsSlice.actions;
export default commPatternsSlice.reducer;
