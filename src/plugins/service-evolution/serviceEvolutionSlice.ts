import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";

/* ═══════════════════════════════════════════════════════════
 *  Service Evolution — from Monolith to Nanoservices
 *
 *  Four architectural styles, each with distinct trade-offs
 *  around deployability, scalability, complexity and cost.
 * ═══════════════════════════════════════════════════════════ */

/* ── Variant identifiers ─────────────────────────────── */
export type VariantKey =
  | "monolith"
  | "macroservices"
  | "microservices"
  | "serverless";

/* ── Trait names shown in comparison table ───────────────── */
export type TraitKey =
  | "deployUnit"
  | "scalability"
  | "teamCoupling"
  | "operationalCost"
  | "startupSpeed"
  | "faultIsolation";

/* ── Per-variant profile ─────────────────────────────── */
export interface VariantProfile {
  key: VariantKey;
  label: string;
  color: string;
  accentText: string;
  description: string;
  /** Short trait ratings 1–5 */
  traits: Record<TraitKey, number>;
  /** Human-readable labels for each trait rating */
  traitLabels: Record<TraitKey, string>;
  /** Number of service "boxes" shown in the scene */
  serviceCount: number;
  /** Number of databases shown (one per service for micro/nano) */
  dbCount: number;
}

export const VARIANT_PROFILES: Record<VariantKey, VariantProfile> = {
  monolith: {
    key: "monolith",
    label: "Monolith",
    color: "#94a3b8",
    accentText: "Single unit",
    description:
      "One codebase, one binary, one database. Simple to develop but hard to scale or change independently.",
    serviceCount: 1,
    dbCount: 1,
    traits: {
      deployUnit: 1,
      scalability: 1,
      teamCoupling: 1,
      operationalCost: 5,
      startupSpeed: 5,
      faultIsolation: 1,
    },
    traitLabels: {
      deployUnit: "Whole app",
      scalability: "Vertical only",
      teamCoupling: "Tight",
      operationalCost: "Very low",
      startupSpeed: "Fast",
      faultIsolation: "None",
    },
  },
  macroservices: {
    key: "macroservices",
    label: "Macroservices",
    color: "#60a5fa",
    accentText: "Coarse modules",
    description:
      "A handful of large services, each owning a domain. Easier to reason about than microservices but still chunky deploys.",
    serviceCount: 3,
    dbCount: 2,
    traits: {
      deployUnit: 2,
      scalability: 3,
      teamCoupling: 2,
      operationalCost: 3,
      startupSpeed: 4,
      faultIsolation: 2,
    },
    traitLabels: {
      deployUnit: "Per service",
      scalability: "Per service",
      teamCoupling: "Moderate",
      operationalCost: "Moderate",
      startupSpeed: "Good",
      faultIsolation: "Partial",
    },
  },
  microservices: {
    key: "microservices",
    label: "Microservices",
    color: "#a78bfa",
    accentText: "Fine-grained",
    description:
      "Many small, independently deployable services each with their own DB. Independent scaling & fault isolation — but high ops overhead.",
    serviceCount: 6,
    dbCount: 6,
    traits: {
      deployUnit: 5,
      scalability: 5,
      teamCoupling: 4,
      operationalCost: 2,
      startupSpeed: 2,
      faultIsolation: 5,
    },
    traitLabels: {
      deployUnit: "Individual",
      scalability: "Per service",
      teamCoupling: "Decoupled",
      operationalCost: "High",
      startupSpeed: "Slow",
      faultIsolation: "Strong",
    },
  },
  serverless: {
    key: "serverless",
    label: "Serverless",
    color: "#34d399",
    accentText: "Function per task",
    description:
      "Individual functions triggered on demand. Zero idle cost and infinite scale — but cold starts, vendor lock-in, and tracing complexity.",
    serviceCount: 12,
    dbCount: 0,
    traits: {
      deployUnit: 5,
      scalability: 5,
      teamCoupling: 5,
      operationalCost: 5,
      startupSpeed: 1,
      faultIsolation: 5,
    },
    traitLabels: {
      deployUnit: "Per function",
      scalability: "Auto-infinite",
      teamCoupling: "Fully decoupled",
      operationalCost: "Pay-per-call",
      startupSpeed: "Cold start risk",
      faultIsolation: "Total",
    },
  },
};

/* ── Trait metadata for display ─────────────────────── */
export const TRAIT_META: Record<
  TraitKey,
  { label: string; higherIsBetter: boolean }
> = {
  deployUnit: { label: "Deploy granularity", higherIsBetter: true },
  scalability: { label: "Scalability", higherIsBetter: true },
  teamCoupling: { label: "Team autonomy", higherIsBetter: true },
  operationalCost: { label: "Ops simplicity", higherIsBetter: true },
  startupSpeed: { label: "Dev speed", higherIsBetter: true },
  faultIsolation: { label: "Fault isolation", higherIsBetter: true },
};

/* ── Traffic simulation state ────────────────────────── */
export type TrafficPhase =
  | "overview"
  | "traffic"
  | "scale-event"
  | "fault"
  | "recovery"
  | "summary";

/* ── State shape ─────────────────────────────────────── */
export interface ServiceEvolutionState extends LabState {
  variant: VariantKey;
  phase: TrafficPhase;

  /** Whether we're simulating a fault to show isolation */
  faultActive: boolean;
  /** Which service node id is "faulted" (empty = none) */
  faultedNode: string;

  /* derived metrics */
  deployTimeS: number; // seconds to redeploy after a change
  scaleLatencyS: number; // seconds to scale out under load
  blastRadius: number; // % of service surface area affected by one fault
}

/* ── Metrics model ───────────────────────────────────── */
export function computeMetrics(state: ServiceEvolutionState) {
  switch (state.variant) {
    case "monolith":
      state.deployTimeS = 120;
      state.scaleLatencyS = 60;
      state.blastRadius = 100;
      break;
    case "macroservices":
      state.deployTimeS = 45;
      state.scaleLatencyS = 30;
      state.blastRadius = 35;
      break;
    case "microservices":
      state.deployTimeS = 8;
      state.scaleLatencyS = 10;
      state.blastRadius = 5;
      break;
    case "serverless":
      state.deployTimeS = 2;
      state.scaleLatencyS = 3;
      state.blastRadius = 1;
      break;
  }
}

export const initialState: ServiceEvolutionState = {
  variant: "monolith",
  phase: "overview",
  faultActive: false,
  faultedNode: "",

  hotZones: [],
  explanation: VARIANT_PROFILES["monolith"].description,

  deployTimeS: 120,
  scaleLatencyS: 60,
  blastRadius: 100,
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const serviceEvolutionSlice = createSlice({
  name: "serviceEvolution",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState };
      computeMetrics(s);
      return s;
    },
    softResetRun: (state) => {
      state.hotZones = [];
      state.faultActive = false;
      state.faultedNode = "";
      state.explanation = VARIANT_PROFILES[state.variant].description;
      state.phase = "overview";
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<ServiceEvolutionState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setVariant(state, action: PayloadAction<VariantKey>) {
      state.variant = action.payload;
      state.hotZones = [];
      state.faultActive = false;
      state.faultedNode = "";
      state.explanation = VARIANT_PROFILES[action.payload].description;
      state.phase = "overview";
      computeMetrics(state);
    },
    triggerFault(state, action: PayloadAction<string>) {
      state.faultActive = true;
      state.faultedNode = action.payload;
    },
    clearFault(state) {
      state.faultActive = false;
      state.faultedNode = "";
    },
  },
});

export const {
  reset,
  softResetRun,
  patchState,
  recalcMetrics,
  setVariant,
  triggerFault,
  clearFault,
} = serviceEvolutionSlice.actions;
export default serviceEvolutionSlice.reducer;
