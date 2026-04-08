import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";

/* ── Decomposition strategy (the "variant") ─────────── */
export type VariantKey = "business-capability" | "subdomain-ddd" | "size-based";

/* ── A single extracted service ─────────────────────── */
export interface ServiceNode {
  id: string;
  label: string;
  dbType: string;
  color: string;
  extracted: boolean; // has it been spun out yet?
}

/* ── Per-variant profile ─────────────────────────────── */
export interface VariantProfile {
  key: VariantKey;
  label: string;
  color: string;
  tagline: string;
  description: string;
  /** The ordered list of services/boundaries for this strategy */
  services: ServiceNode[];
  /** Short coupling score label */
  couplingLabel: string;
  /** Short team autonomy label */
  autonomyLabel: string;
  /** Short complexity label */
  complexityLabel: string;
}

/** Shared service list — each strategy extracts these but the order / rationale differs */
const BASE_SERVICES: Omit<ServiceNode, "extracted">[] = [
  {
    id: "svc-catalog",
    label: "Catalog",
    dbType: "NoSQL Document",
    color: "#818cf8",
  },
  {
    id: "svc-basket",
    label: "Basket",
    dbType: "NoSQL Key-Value",
    color: "#34d399",
  },
  {
    id: "svc-ordering",
    label: "Ordering",
    dbType: "Relational",
    color: "#fb923c",
  },
  {
    id: "svc-identity",
    label: "Identity",
    dbType: "Relational",
    color: "#f472b6",
  },
];

function makeServices(): ServiceNode[] {
  return BASE_SERVICES.map((s) => ({ ...s, extracted: false }));
}

export const VARIANT_PROFILES: Record<VariantKey, VariantProfile> = {
  "business-capability": {
    key: "business-capability",
    label: "Business Capability",
    color: "#818cf8",
    tagline: "Split by what the business does",
    description:
      "Each service maps to a stable business capability (Catalog, Basket, Ordering, Identity). Capabilities change less often than processes, giving you stable service boundaries.",
    services: makeServices(),
    couplingLabel: "Low",
    autonomyLabel: "High",
    complexityLabel: "Medium",
  },
  "subdomain-ddd": {
    key: "subdomain-ddd",
    label: "Subdomain / DDD",
    color: "#38bdf8",
    tagline: "Split by bounded context",
    description:
      "Domain-Driven Design maps each Bounded Context to a service. Each subdomain has its own ubiquitous language and model, minimising concept leakage across service boundaries.",
    services: makeServices(),
    couplingLabel: "Very Low",
    autonomyLabel: "Very High",
    complexityLabel: "High",
  },
  "size-based": {
    key: "size-based",
    label: "Size-Based",
    color: "#fb923c",
    tagline: "Split by team / deployment unit size",
    description:
      "Services are sized to fit a team (the 'two-pizza rule'). No single team owns too large a codebase, but service boundaries may not align perfectly with domain concepts.",
    services: makeServices(),
    couplingLabel: "Medium",
    autonomyLabel: "Medium",
    complexityLabel: "Low",
  },
};

/* ── State shape ─────────────────────────────────────── */
export interface DecompositionState extends LabState {
  variant: VariantKey;
  services: ServiceNode[];
  /** how many services have been extracted so far */
  extractedCount: number;
  /** score 1-10 for coupling (lower = better) */
  couplingScore: number;
  /** score 1-10 for team autonomy (higher = better) */
  autonomyScore: number;
  /** score 1-10 for boundary clarity (higher = better) */
  clarityScore: number;
}

/* ── Metrics ─────────────────────────────────────────── */
const METRICS: Record<
  VariantKey,
  { coupling: number; autonomy: number; clarity: number }
> = {
  "business-capability": { coupling: 3, autonomy: 8, clarity: 8 },
  "subdomain-ddd": { coupling: 2, autonomy: 9, clarity: 9 },
  "size-based": { coupling: 5, autonomy: 6, clarity: 5 },
};

export function computeMetrics(state: DecompositionState) {
  const m = METRICS[state.variant];
  state.couplingScore = m.coupling;
  state.autonomyScore = m.autonomy;
  state.clarityScore = m.clarity;
  state.extractedCount = state.services.filter((s) => s.extracted).length;
}

export const initialState: DecompositionState = {
  variant: "business-capability",
  services: makeServices(),
  extractedCount: 0,
  couplingScore: 3,
  autonomyScore: 8,
  clarityScore: 8,
  hotZones: [],
  explanation:
    "Select a decomposition strategy and step through to see how each approach slices the monolith.",
  phase: "overview",
};

/* ── Slice ───────────────────────────────────────────── */
const decompositionSlice = createSlice({
  name: "decomposition",
  initialState,
  reducers: {
    reset: () => {
      const s: DecompositionState = {
        ...initialState,
        services: makeServices(),
      };
      computeMetrics(s);
      return s;
    },
    softResetRun: (state) => {
      state.services = makeServices();
      state.hotZones = [];
      state.explanation = VARIANT_PROFILES[state.variant].description;
      state.phase = "overview";
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<DecompositionState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    /** Extract the next unextracted service */
    extractNextService(state) {
      const next = state.services.find((s) => !s.extracted);
      if (next) {
        next.extracted = true;
        computeMetrics(state);
      }
    },
    setVariant(state, action: PayloadAction<VariantKey>) {
      state.variant = action.payload;
      state.services = makeServices();
      state.hotZones = [];
      state.explanation = VARIANT_PROFILES[action.payload].description;
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
  extractNextService,
  setVariant,
} = decompositionSlice.actions;
export default decompositionSlice.reducer;
