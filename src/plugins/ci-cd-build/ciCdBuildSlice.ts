import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter } from "./build-adapters";

/* ── Types ─────────────────────────────────────────────── */

export type ToolType = "nx" | "turborepo";

export type ScenarioId = "monorepo-web" | "fullstack" | "design-system";

export interface PackageNode {
  id: string;
  label: string;
  role: "app" | "lib" | "shared";
  cached: boolean;
  affected: boolean;
  sizeKb: number;
}

/* ── Scenario profiles ─────────────────────────────────── */

export interface ScenarioProfile {
  label: string;
  description: string;
  defaultPackages: number;
}

export const SCENARIO_PROFILES: Record<ScenarioId, ScenarioProfile> = {
  "monorepo-web": {
    label: "Monorepo Web Apps",
    description:
      "Multiple frontend apps sharing UI libraries — typifies a React/Next.js monorepo.",
    defaultPackages: 6,
  },
  fullstack: {
    label: "Fullstack (FE + BE + Shared)",
    description:
      "Frontend, backend, and shared libs in one repo — common for startup monorepos.",
    defaultPackages: 5,
  },
  "design-system": {
    label: "Design System",
    description:
      "Core tokens, component library, docs site, and storybook — publish-heavy.",
    defaultPackages: 5,
  },
};

/* ── Build result ──────────────────────────────────────── */

export interface BuildResult {
  coldBuildMs: number;
  warmBuildMs: number;
  cacheHitRate: number;
  parallelism: number;
  treeShakenKb: number;
  affectedCount: number;
  totalPackages: number;
}

/* ── State shape ─────────────────────────────────────── */

export interface CiCdBuildState extends LabState {
  toolType: ToolType;
  scenario: ScenarioId;
  packageCount: number;
  packages: PackageNode[];
  result: BuildResult;
  buildRun: number; // 1 = first (cold), 2 = second (warm)

  hotZones: string[];
  explanation: string;
  phase: string;
}

/* ── Metrics computation (adapter-based) ───────────────── */

export function computeMetrics(state: CiCdBuildState) {
  const adapter = getAdapter(state.toolType);

  state.packages = adapter.buildGraph(state.scenario, state.packageCount);

  const metrics = adapter.computeMetrics(state);
  state.result = {
    coldBuildMs: metrics.coldBuildMs,
    warmBuildMs: metrics.warmBuildMs,
    cacheHitRate: metrics.cacheHitRate,
    parallelism: metrics.parallelism,
    treeShakenKb: metrics.treeShakenKb,
    affectedCount: state.packages.filter((p) => p.affected).length,
    totalPackages: state.packages.length,
  };
}

export const initialState: CiCdBuildState = {
  toolType: "nx",
  scenario: "monorepo-web",
  packageCount: 6,
  packages: [],
  result: {
    coldBuildMs: 0,
    warmBuildMs: 0,
    cacheHitRate: 0,
    parallelism: 1,
    treeShakenKb: 0,
    affectedCount: 0,
    totalPackages: 0,
  },
  buildRun: 1,

  hotZones: [],
  explanation:
    "Welcome — pick a build tool and scenario, then step through to compare.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */

const ciCdBuildSlice = createSlice({
  name: "ciCdBuild",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState };
      computeMetrics(s);
      return s;
    },
    softResetRun: (state) => {
      state.hotZones = [];
      state.explanation =
        "Architecture overview — step through to see the build pipeline.";
      state.phase = "overview";
      state.buildRun = 1;
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<CiCdBuildState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setToolType(state, action: PayloadAction<ToolType>) {
      state.toolType = action.payload;
      state.hotZones = [];
      state.explanation =
        "Architecture overview — step through to see the build pipeline.";
      state.phase = "overview";
      state.buildRun = 1;
      computeMetrics(state);
    },
    setScenario(state, action: PayloadAction<ScenarioId>) {
      state.scenario = action.payload;
      state.hotZones = [];
      state.phase = "overview";
      state.buildRun = 1;
      computeMetrics(state);
    },
    setPackageCount(state, action: PayloadAction<number>) {
      state.packageCount = action.payload;
      computeMetrics(state);
    },
  },
});

export const {
  reset,
  softResetRun,
  patchState,
  recalcMetrics,
  setToolType,
  setScenario,
  setPackageCount,
} = ciCdBuildSlice.actions;
export default ciCdBuildSlice.reducer;
