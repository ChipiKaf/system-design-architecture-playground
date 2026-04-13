import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter, TOPICS, type TopicKey } from "./aurora-postgres-adapters";

/* ── Variant identifiers ─────────────────────────────── */
export type VariantKey =
  | "acid-guarantees"
  | "complex-queries"
  | "jsonb-flexibility"
  | "extensions-ecosystem"
  | "storage-architecture"
  | "read-replicas"
  | "claims-pipeline"
  | "policy-lifecycle";

export { type TopicKey };

/* ── State shape ─────────────────────────────────────── */
export interface AuroraPostgresState extends LabState {
  topic: TopicKey;
  variant: VariantKey;

  /* Q1 — Why Relational */
  transactionGuarantee: "none" | "acid" | "eventual";
  queryComplexity: "none" | "simple" | "complex";

  /* Q2 — Why PostgreSQL */
  schemaMode: "none" | "relational" | "jsonb" | "hybrid";
  extensionsActive: boolean;

  /* Q3 — Why Aurora */
  storageReplication: "none" | "active" | "quorum";
  replicaCount: number;

  /* Q4 — Insurance Schema */
  pipelineStage: string;
  auditTrail: boolean;
}

/* ── Metrics model (delegates to adapter) ────────────── */
export function computeMetrics(state: AuroraPostgresState) {
  const adapter = getAdapter(state.variant);
  adapter.computeMetrics(state);
}

function resetFlags(state: AuroraPostgresState) {
  state.transactionGuarantee = "none";
  state.queryComplexity = "none";
  state.schemaMode = "none";
  state.extensionsActive = false;
  state.storageReplication = "none";
  state.replicaCount = 0;
  state.pipelineStage = "none";
  state.auditTrail = false;
}

export const initialState: AuroraPostgresState = {
  topic: TOPICS[0].id,
  variant: TOPICS[0].defaultVariant as VariantKey,

  transactionGuarantee: "none",
  queryComplexity: "none",
  schemaMode: "none",
  extensionsActive: false,
  storageReplication: "none",
  replicaCount: 0,
  pipelineStage: "none",
  auditTrail: false,

  hotZones: [],
  explanation:
    "Select a topic and variant above, then step through to explore.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const auroraPostgresSlice = createSlice({
  name: "auroraPostgres",
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
    patchState(state, action: PayloadAction<Partial<AuroraPostgresState>>) {
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
} = auroraPostgresSlice.actions;

export default auroraPostgresSlice.reducer;
