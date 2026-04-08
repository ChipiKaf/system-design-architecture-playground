import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";

/* ── Variant identifiers ─────────────────────────────── */
export type VariantKey = "variant-a" | "variant-b";
// TODO: add more variant keys as needed

/* ── Per-variant profile ─────────────────────────────── */
export interface VariantProfile {
  key: VariantKey;
  label: string;
  color: string;
  description: string;
}

export const VARIANT_PROFILES: Record<VariantKey, VariantProfile> = {
  "variant-a": {
    key: "variant-a",
    label: "Variant A",
    color: "#3b82f6",
    description: "Describe variant A's approach.",
  },
  "variant-b": {
    key: "variant-b",
    label: "Variant B",
    color: "#22c55e",
    description: "Describe variant B's approach.",
  },
};

/* ── State shape ─────────────────────────────────────── */
export interface GraphqlApiState extends LabState {
  variant: VariantKey;

  /* derived metrics (recomputed by computeMetrics) */
  latencyMs: number;
  throughput: number;
}

/* ── Metrics model ───────────────────────────────────── */
export function computeMetrics(state: GraphqlApiState) {
  // TODO: compute metrics based on active variant
  if (state.variant === "variant-a") {
    state.latencyMs = 50;
    state.throughput = 1000;
  } else {
    state.latencyMs = 120;
    state.throughput = 2000;
  }
}

export const initialState: GraphqlApiState = {
  variant: "variant-a",
  latencyMs: 50,
  throughput: 1000,

  hotZones: [],
  explanation: "Welcome — select a variant and step through to compare.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const graphqlApiSlice = createSlice({
  name: "graphqlApi",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState };
      computeMetrics(s);
      return s;
    },
    softResetRun: (state) => {
      state.hotZones = [];
      state.explanation = VARIANT_PROFILES[state.variant].description;
      state.phase = "overview";
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<GraphqlApiState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setVariant(state, action: PayloadAction<VariantKey>) {
      state.variant = action.payload;
      state.hotZones = [];
      state.explanation = VARIANT_PROFILES[action.payload].description;
      state.phase = "overview";
      computeMetrics(state);
    },
  },
});

export const { reset, softResetRun, patchState, recalcMetrics, setVariant } =
  graphqlApiSlice.actions;
export default graphqlApiSlice.reducer;
