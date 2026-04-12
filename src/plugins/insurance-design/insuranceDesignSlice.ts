import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter, TOPICS, type TopicKey } from "./insurance-design-adapters";

/* ── Variant identifiers ─────────────────────────────── */
export type VariantKey =
  | "ai-claims-automation"
  | "ai-risk-scoring"
  | "ai-fraud-detection"
  | "ai-llm-platform"
  | "ai-llm-platform-alt";

export { type TopicKey };

/* ── State shape ─────────────────────────────────────── */
export interface InsuranceDesignState extends LabState {
  topic: TopicKey;
  variant: VariantKey;

  /* AI topic state fields */
  dataIngested: boolean;
  orchestratorActive: boolean;
  aiProcessing: boolean;
  aiComplete: boolean;
  resultStored: boolean;
  notificationSent: boolean;

  /* LLM-specific state fields */
  wsConnected: boolean;
  embedded: boolean;
  cacheChecked: boolean;
  responseStreamed: boolean;
}

/* ── Metrics model (delegates to adapter) ────────────── */
export function computeMetrics(state: InsuranceDesignState) {
  const adapter = getAdapter(state.variant);
  adapter.computeMetrics(state);
}

function resetFlags(state: InsuranceDesignState) {
  state.dataIngested = false;
  state.orchestratorActive = false;
  state.aiProcessing = false;
  state.aiComplete = false;
  state.resultStored = false;
  state.notificationSent = false;
  state.wsConnected = false;
  state.embedded = false;
  state.cacheChecked = false;
  state.responseStreamed = false;
}

export const initialState: InsuranceDesignState = {
  topic: TOPICS[0].id,
  variant: TOPICS[0].defaultVariant as VariantKey,

  dataIngested: false,
  orchestratorActive: false,
  aiProcessing: false,
  aiComplete: false,
  resultStored: false,
  notificationSent: false,
  wsConnected: false,
  embedded: false,
  cacheChecked: false,
  responseStreamed: false,

  hotZones: [],
  explanation:
    "Select a topic and variant above, then step through to explore.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const insuranceDesignSlice = createSlice({
  name: "insuranceDesign",
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
    patchState(state, action: PayloadAction<Partial<InsuranceDesignState>>) {
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
} = insuranceDesignSlice.actions;
export default insuranceDesignSlice.reducer;
