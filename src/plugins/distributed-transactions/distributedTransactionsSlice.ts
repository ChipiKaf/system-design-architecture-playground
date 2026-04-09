import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter } from "./distributed-transactions-adapters";
import type { PatternProfile } from "./distributed-transactions-adapters";

export type PatternKey = "saga" | "outbox";

export interface DistributedTransactionsState extends LabState {
  pattern: PatternKey;
  coordinationModel: string;
  atomicBoundary: string;
  deliverySemantics: string;
  failureStrategy: string;
  consistencyStory: string;
}

export const PATTERN_PROFILES: Record<PatternKey, PatternProfile> = {
  saga: getAdapter("saga").profile,
  outbox: getAdapter("outbox").profile,
};

export function computeMetrics(state: DistributedTransactionsState) {
  const adapter = getAdapter(state.pattern);
  adapter.computeMetrics(state);
}

function primeState(
  state: DistributedTransactionsState,
  pattern: PatternKey,
) {
  state.pattern = pattern;
  state.phase = "overview";
  computeMetrics(state);
  state.hotZones = getAdapter(pattern).getOverviewHotZones(state);
  state.explanation = getAdapter(pattern).getOverviewExplanation(state);
}

function makeInitialState(pattern: PatternKey): DistributedTransactionsState {
  const state: DistributedTransactionsState = {
    pattern,
    coordinationModel: "",
    atomicBoundary: "",
    deliverySemantics: "",
    failureStrategy: "",
    consistencyStory: "",
    hotZones: [],
    explanation: "",
    phase: "overview",
  };

  primeState(state, pattern);
  return state;
}

export const initialState: DistributedTransactionsState =
  makeInitialState("saga");

const distributedTransactionsSlice = createSlice({
  name: "distributedTransactions",
  initialState,
  reducers: {
    reset() {
      return makeInitialState("saga");
    },
    softResetRun(state) {
      const adapter = getAdapter(state.pattern);
      state.phase = "overview";
      adapter.softReset(state);
      computeMetrics(state);
      state.hotZones = adapter.getOverviewHotZones(state);
      state.explanation = adapter.getOverviewExplanation(state);
    },
    patchState(state, action: PayloadAction<Partial<DistributedTransactionsState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setPattern(state, action: PayloadAction<PatternKey>) {
      const adapter = getAdapter(action.payload);
      state.pattern = action.payload;
      state.phase = "overview";
      computeMetrics(state);
      state.hotZones = adapter.getOverviewHotZones(state);
      state.explanation = adapter.getOverviewExplanation(state);
    },
  },
});

export const {
  reset,
  softResetRun,
  patchState,
  recalcMetrics,
  setPattern,
} = distributedTransactionsSlice.actions;
export default distributedTransactionsSlice.reducer;
