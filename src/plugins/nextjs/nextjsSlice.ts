import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter, TOPICS, type TopicKey } from "./nextjs-adapters";

/* ── Variant identifiers ─────────────────────────────── */
export type VariantKey =
  | "static-rendering"
  | "dynamic-rendering"
  | "client-side-rendering"
  | "streaming"
  | "server-components"
  | "client-components"
  | "file-routing"
  | "nested-layouts"
  | "data-fetching"
  | "caching";

export { type TopicKey };

/* ── State shape ─────────────────────────────────────── */
export interface NextjsState extends LabState {
  topic: TopicKey;
  variant: VariantKey;

  /* Q1 — Rendering Strategies */
  renderMode: "none" | "static" | "dynamic" | "client" | "streaming";
  htmlSent: boolean;
  jsLoaded: boolean;

  /* Q2 — Server vs Client Components */
  componentType: "none" | "server" | "client" | "mixed";
  hydrated: boolean;
  bundleSplit: boolean;

  /* Q3 — Routing & Layouts */
  routeResolved: boolean;
  layoutPersisted: boolean;
  segmentSwapped: boolean;

  /* Q4 — Data Fetching & Caching */
  dataFetched: boolean;
  cacheHit: boolean;
  revalidated: boolean;
}

/* ── Metrics model (delegates to adapter) ────────────── */
export function computeMetrics(state: NextjsState) {
  const adapter = getAdapter(state.variant);
  adapter.computeMetrics(state);
}

function resetFlags(state: NextjsState) {
  state.renderMode = "none";
  state.htmlSent = false;
  state.jsLoaded = false;
  state.componentType = "none";
  state.hydrated = false;
  state.bundleSplit = false;
  state.routeResolved = false;
  state.layoutPersisted = false;
  state.segmentSwapped = false;
  state.dataFetched = false;
  state.cacheHit = false;
  state.revalidated = false;
}

export const initialState: NextjsState = {
  topic: TOPICS[0].id,
  variant: TOPICS[0].defaultVariant as VariantKey,

  renderMode: "none",
  htmlSent: false,
  jsLoaded: false,
  componentType: "none",
  hydrated: false,
  bundleSplit: false,
  routeResolved: false,
  layoutPersisted: false,
  segmentSwapped: false,
  dataFetched: false,
  cacheHit: false,
  revalidated: false,

  hotZones: [],
  explanation:
    "Select a topic and variant above, then step through to explore.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const nextjsSlice = createSlice({
  name: "nextjs",
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
    patchState(state, action: PayloadAction<Partial<NextjsState>>) {
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
} = nextjsSlice.actions;
export default nextjsSlice.reducer;
