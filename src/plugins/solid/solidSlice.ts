import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter } from "./solid-adapters";

/* ── Variant identifiers ─────────────────────────────── */
export type VariantKey = "srp" | "ocp" | "lsp" | "isp" | "dip";

/* ── State shape ─────────────────────────────────────── */
export interface SolidState extends LabState {
  variant: VariantKey;

  /* derived metrics */
  coupling: number; // 0–10 scale
  flexibility: number; // 0–10 scale
  classCount: number;
}

/* ── Metrics model (delegates to adapter) ────────────── */
export function computeMetrics(state: SolidState) {
  const adapter = getAdapter(state.variant);
  adapter.computeMetrics(state);
}

export const initialState: SolidState = {
  variant: "srp",
  coupling: 8,
  flexibility: 2,
  classCount: 1,

  hotZones: [],
  explanation:
    "Welcome — pick a SOLID principle and step through to see the before / after.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const solidSlice = createSlice({
  name: "solid",
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
    patchState(state, action: PayloadAction<Partial<SolidState>>) {
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

export const { reset, softResetRun, patchState, recalcMetrics, setVariant } =
  solidSlice.actions;
export default solidSlice.reducer;
