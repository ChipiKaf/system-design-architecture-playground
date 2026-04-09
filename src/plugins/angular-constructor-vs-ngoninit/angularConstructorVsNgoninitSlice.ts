import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter } from "./angular-constructor-vs-ngoninit-adapters";

/* ── Variant identifiers ─────────────────────────────── */
export type VariantKey = "variant-a" | "variant-b";
// TODO: rename / add variant keys to match your domain

/* ── State shape ─────────────────────────────────────── */
export interface AngularConstructorVsNgoninitState extends LabState {
  variant: VariantKey;

  /* derived metrics (recomputed by computeMetrics) */
  latencyMs: number;
  throughput: number;
}

/* ── Metrics model (delegates to adapter) ────────────── */
export function computeMetrics(state: AngularConstructorVsNgoninitState) {
  const adapter = getAdapter(state.variant);
  adapter.computeMetrics(state);
}

export const initialState: AngularConstructorVsNgoninitState = {
  variant: "variant-a",
  latencyMs: 50,
  throughput: 1000,

  hotZones: [],
  explanation: "Welcome — select a variant and step through to compare.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const angularConstructorVsNgoninitSlice = createSlice({
  name: "angularConstructorVsNgoninit",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState };
      computeMetrics(s);
      return s;
    },
    softResetRun: (state) => {
      const adapter = getAdapter(state.variant);
      adapter.softReset(state);
      state.hotZones = [];
      state.explanation = adapter.profile.description;
      state.phase = "overview";
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<AngularConstructorVsNgoninitState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setVariant(state, action: PayloadAction<VariantKey>) {
      const adapter = getAdapter(action.payload);
      state.variant = action.payload;
      state.hotZones = [];
      state.explanation = adapter.profile.description;
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
  setVariant,
} = angularConstructorVsNgoninitSlice.actions;
export default angularConstructorVsNgoninitSlice.reducer;
