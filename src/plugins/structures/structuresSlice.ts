import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter, TOPICS, type TopicKey } from "./structures-adapters";

/* ── Variant identifiers ─────────────────────────────── */
export type VariantKey = "btree-struct" | "gin-struct" | "gist-struct";

export { type TopicKey };

/* ── State shape ─────────────────────────────────────── */
export interface StructuresState extends LabState {
  topic: TopicKey;
  variant: VariantKey;

  pageSize: string;
  entrySize: string;
  treeDepth: string;
  rowCount: string;
}

/* ── Metrics model (delegates to adapter) ────────────── */
export function computeMetrics(state: StructuresState) {
  const adapter = getAdapter(state.variant);
  adapter.computeMetrics(state);
}

function resetFlags(state: StructuresState) {
  state.pageSize = "8 kB";
  state.entrySize = "~1 kB";
  state.treeDepth = "1";
  state.rowCount = "0";
}

export const initialState: StructuresState = {
  topic: TOPICS[0].id,
  variant: TOPICS[0].defaultVariant as VariantKey,

  pageSize: "8 kB",
  entrySize: "~1 kB",
  treeDepth: "1",
  rowCount: "0",

  hotZones: [],
  explanation:
    "Watch a B-tree grow from an empty root page as rows are inserted, pages fill up, and the tree splits and deepens.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const structuresSlice = createSlice({
  name: "structures",
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
    patchState(state, action: PayloadAction<Partial<StructuresState>>) {
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
} = structuresSlice.actions;
export default structuresSlice.reducer;
