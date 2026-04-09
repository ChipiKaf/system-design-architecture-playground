import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter, TOPICS, type TopicKey } from "./adapters";

/* ── Variant identifiers ─────────────────────────────── */
export type VariantKey =
  | "constructor"
  | "ngoninit"
  | "emulated"
  | "none"
  | "shadow-dom"
  | "standalone"
  | "ngmodule"
  | "provided-in-root"
  | "component-provider"
  | "default-cd"
  | "onpush-cd"
  | "writable-signal"
  | "behavior-subject";

export { type TopicKey };

/* ── State shape ─────────────────────────────────────── */
export interface AngularState extends LabState {
  topic: TopicKey;
  variant: VariantKey;

  /* Q1 — constructor vs ngOnInit */
  diReady: boolean;
  inputsReady: boolean;
  hookFired: boolean;
  logicResult: "pending" | "success" | "warning";

  /* Q2 — view encapsulation */
  styleScope: "none" | "attribute" | "shadow";
  collisionRisk: "none" | "low" | "high";
  browserCompat: "all" | "modern";

  /* Q3 — standalone vs NgModule */
  moduleStrategy: "none" | "standalone" | "ngmodule";
  treeShaking: "none" | "optimal" | "limited";
  boilerplate: "none" | "minimal" | "heavy";

  /* Q4 — change detection */
  cdStrategy: "none" | "default" | "onpush";
  checksPerCycle: "none" | "all" | "targeted";
  skipCount: number;

  /* Q5 — hierarchical DI */
  providerScope: "none" | "root" | "component" | "lazy";
  instanceCount: "none" | "singleton" | "per-component";
  overrideActive: boolean;

  /* Q9 — signals vs BehaviorSubject */
  reactiveModel: "none" | "signal" | "rxjs";
  subscriptionMgmt: "none" | "auto" | "manual";
  glitchFree: boolean;
}

/* ── Metrics model (delegates to adapter) ────────────── */
export function computeMetrics(state: AngularState) {
  const adapter = getAdapter(state.variant);
  adapter.computeMetrics(state);
}

function resetFlags(state: AngularState) {
  state.diReady = false;
  state.inputsReady = false;
  state.hookFired = false;
  state.logicResult = "pending";
  state.styleScope = "none";
  state.collisionRisk = "none";
  state.browserCompat = "all";
  state.moduleStrategy = "none";
  state.treeShaking = "none";
  state.boilerplate = "none";
  state.cdStrategy = "none";
  state.checksPerCycle = "none";
  state.skipCount = 0;
  state.providerScope = "none";
  state.instanceCount = "none";
  state.overrideActive = false;
  state.reactiveModel = "none";
  state.subscriptionMgmt = "none";
  state.glitchFree = false;
}

export const initialState: AngularState = {
  topic: "constructor-vs-ngoninit",
  variant: "constructor",

  diReady: false,
  inputsReady: false,
  hookFired: false,
  logicResult: "pending",

  styleScope: "none",
  collisionRisk: "none",
  browserCompat: "all",

  moduleStrategy: "none",
  treeShaking: "none",
  boilerplate: "none",

  cdStrategy: "none",
  checksPerCycle: "none",
  skipCount: 0,

  providerScope: "none",
  instanceCount: "none",
  overrideActive: false,

  reactiveModel: "none",
  subscriptionMgmt: "none",
  glitchFree: false,

  hotZones: [],
  explanation:
    "Select a topic and variant above, then step through to explore Angular fundamentals.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const angularSlice = createSlice({
  name: "angular",
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
    patchState(state, action: PayloadAction<Partial<AngularState>>) {
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
      resetFlags(state);
      computeMetrics(state);
    },
    setTopic(state, action: PayloadAction<TopicKey>) {
      const topic = TOPICS.find((t) => t.id === action.payload)!;
      state.topic = action.payload;
      state.variant = topic.defaultVariant;
      const adapter = getAdapter(topic.defaultVariant);
      state.hotZones = [];
      state.explanation = adapter.profile.description;
      state.phase = "overview";
      resetFlags(state);
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
} = angularSlice.actions;
export default angularSlice.reducer;
