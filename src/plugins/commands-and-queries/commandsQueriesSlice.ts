import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter } from "./pattern-adapters";
import type { PatternProfile } from "./pattern-adapters";

export type PatternKey =
  | "materialized-view"
  | "cqrs"
  | "event-sourcing"
  | "instagram";
export type ProjectionState = "caught-up" | "lagging";

export interface CommandsQueriesState extends LabState {
  pattern: PatternKey;
  projectionState: ProjectionState;
  readLatencyMs: number;
  writeLatencyMs: number;
  projectionLagMs: number;
  syncCallsAvoided: number;
  staleRisk: boolean;
  consistencyModel: string;
}

export const PATTERN_PROFILES: Record<PatternKey, PatternProfile> = {
  "materialized-view": getAdapter("materialized-view").profile,
  cqrs: getAdapter("cqrs").profile,
  "event-sourcing": getAdapter("event-sourcing").profile,
  instagram: getAdapter("instagram").profile,
};

export function computeMetrics(state: CommandsQueriesState) {
  getAdapter(state.pattern).computeMetrics(state);
}

function primeState(state: CommandsQueriesState, pattern: PatternKey) {
  state.pattern = pattern;
  state.phase = "overview";
  computeMetrics(state);
  state.hotZones = getAdapter(pattern).getOverviewHotZones(state);
  state.explanation = getAdapter(pattern).getOverviewExplanation(state);
}

function makeInitialState(pattern: PatternKey): CommandsQueriesState {
  const state: CommandsQueriesState = {
    pattern,
    projectionState: "caught-up",
    readLatencyMs: 0,
    writeLatencyMs: 0,
    projectionLagMs: 0,
    syncCallsAvoided: 0,
    staleRisk: false,
    consistencyModel: "",
    hotZones: [],
    explanation: "",
    phase: "overview",
  };

  primeState(state, pattern);
  return state;
}

export const initialState: CommandsQueriesState =
  makeInitialState("materialized-view");

const commandsQueriesSlice = createSlice({
  name: "commandsAndQueries",
  initialState,
  reducers: {
    reset() {
      return makeInitialState("materialized-view");
    },
    softResetRun(state) {
      state.phase = "overview";
      getAdapter(state.pattern).softReset(state);
      computeMetrics(state);
      state.hotZones = getAdapter(state.pattern).getOverviewHotZones(state);
      state.explanation = getAdapter(state.pattern).getOverviewExplanation(
        state,
      );
    },
    patchState(state, action: PayloadAction<Partial<CommandsQueriesState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setPattern(state, action: PayloadAction<PatternKey>) {
      state.projectionState = "caught-up";
      primeState(state, action.payload);
    },
    setProjectionState(state, action: PayloadAction<ProjectionState>) {
      state.projectionState = action.payload;
      state.phase = "overview";
      computeMetrics(state);
      state.hotZones = getAdapter(state.pattern).getOverviewHotZones(state);
      state.explanation = getAdapter(state.pattern).getOverviewExplanation(
        state,
      );
    },
  },
});

export const {
  reset,
  softResetRun,
  patchState,
  recalcMetrics,
  setPattern,
  setProjectionState,
} = commandsQueriesSlice.actions;

export default commandsQueriesSlice.reducer;
