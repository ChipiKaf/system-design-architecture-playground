import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter, TOPICS, type TopicKey } from "./postgresql-adapters";

/* ── Variant identifiers ─────────────────────────────── */
export type VariantKey = "btree" | "gin" | "gist" | "brin" | "hash";

export { type TopicKey };

/* ── State shape ─────────────────────────────────────── */
export interface PostgresqlState extends LabState {
  topic: TopicKey;
  variant: VariantKey;

  workloadFocus: string;
  operatorCoverage: string;
  maintenanceCost: string;
  tableAffinity: string;
}

/* ── Metrics model (delegates to adapter) ────────────── */
export function computeMetrics(state: PostgresqlState) {
  const adapter = getAdapter(state.variant);
  adapter.computeMetrics(state);
}

function resetFlags(state: PostgresqlState) {
  state.workloadFocus = "none";
  state.operatorCoverage = "none";
  state.maintenanceCost = "none";
  state.tableAffinity = "none";
}

export const initialState: PostgresqlState = {
  topic: TOPICS[0].id,
  variant: TOPICS[0].defaultVariant as VariantKey,

  workloadFocus: "none",
  operatorCoverage: "none",
  maintenanceCost: "none",
  tableAffinity: "none",

  hotZones: [],
  explanation:
    "Start from real query patterns, then match PostgreSQL index types to operators, workload shape, and maintenance cost.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const postgresqlSlice = createSlice({
  name: "postgresql",
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
    patchState(state, action: PayloadAction<Partial<PostgresqlState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setVariant(state, action: PayloadAction<VariantKey>) {
      const adapter = getAdapter(action.payload);
      resetFlags(state);
      state.variant = action.payload;
      state.hotZones = [];
      state.explanation = adapter.profile.description;
      state.phase = "overview";
      computeMetrics(state);
    },
    setTopic(state, action: PayloadAction<TopicKey>) {
      const topic = TOPICS.find((t) => t.id === action.payload)!;
      const adapter = getAdapter(topic.defaultVariant as VariantKey);
      resetFlags(state);
      state.topic = topic.id;
      state.variant = topic.defaultVariant as VariantKey;
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
  setTopic,
} = postgresqlSlice.actions;
export default postgresqlSlice.reducer;
