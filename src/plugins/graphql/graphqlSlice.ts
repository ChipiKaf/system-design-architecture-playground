import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter, TOPICS, type TopicKey } from "./graphql-adapters";

/* ── Variant identifiers ─────────────────────────────── */
export type VariantKey = "graphql-approach" | "rest-approach"
  | "query-op"
  | "mutation-op"
  | "subscription-op";

export { type TopicKey };

/* ── State shape ─────────────────────────────────────── */
export interface GraphqlState extends LabState {
  topic: TopicKey;
  variant: VariantKey;

  /* Q1 — GraphQL vs REST */
  endpoints: "none" | "single" | "multiple";
  fetchStrategy: "none" | "exact" | "over" | "under";
  schemaVisible: boolean;
  responseFields: number;
  roundTrips: number;
}

/* ── Metrics model (delegates to adapter) ────────────── */
export function computeMetrics(state: GraphqlState) {
  const adapter = getAdapter(state.variant);
  adapter.computeMetrics(state);
}

function resetFlags(state: GraphqlState) {
  state.endpoints = "none";
  state.fetchStrategy = "none";
  state.schemaVisible = false;
  state.responseFields = 0;
  state.roundTrips = 0;
}

export const initialState: GraphqlState = {
  topic: TOPICS[0].id,
  variant: TOPICS[0].defaultVariant as VariantKey,

  endpoints: "none",
  fetchStrategy: "none",
  schemaVisible: false,
  responseFields: 0,
  roundTrips: 0,

  hotZones: [],
  explanation:
    "Select a topic and variant above, then step through to explore.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const graphqlSlice = createSlice({
  name: "graphql",
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
    patchState(state, action: PayloadAction<Partial<GraphqlState>>) {
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
      resetFlags(state);
      state.topic = topic.id;
      state.variant = topic.defaultVariant as VariantKey;
      state.hotZones = [];
      state.explanation = "Topic switched — step through to explore.";
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
} = graphqlSlice.actions;
export default graphqlSlice.reducer;
