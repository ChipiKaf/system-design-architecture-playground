/**
 * BuildAdapter — the behavioural contract each build tool must implement.
 *
 * Instead of scattering `if (tool === "nx") ... else if (tool === "turborepo") ...`
 * throughout the slice, flow-engine, and main.tsx, we define one per-tool
 * object that owns all the behaviour.  Consumers just call `getAdapter(toolType)`.
 */

import type {
  CiCdBuildState,
  ToolType,
  ScenarioId,
  PackageNode,
} from "../ciCdBuildSlice";
import type { FlowBeat, StepDef } from "../flow-engine";

/* ── Static metadata ───────────────────────────────────── */

export interface ToolProfile {
  label: string;
  shortLabel: string;
  graphModel: string;
  cacheStrategy: string;
  strengths: string[];
  weaknesses: string[];
}

export interface ToolColors {
  fill: string;
  stroke: string;
}

/* ── Metrics-related ───────────────────────────────────── */

export interface BuildMetrics {
  coldBuildMs: number;
  warmBuildMs: number;
  cacheHitRate: number;
  parallelism: number;
  treeShakenKb: number;
}

/* ── Scene rendering ───────────────────────────────────── */

export interface SceneHelpers {
  hot: (zone: string) => boolean;
  openConcept: (key: string) => void;
  phase: string;
}

/* ── Stat badge ────────────────────────────────────────── */

export interface StatBadgeConfig {
  label: string;
  value: string | number;
  color: string;
}

/* ── The adapter interface ─────────────────────────────── */

export interface BuildAdapter {
  /** Unique key matching ToolType */
  id: ToolType;

  /** Static display metadata */
  profile: ToolProfile;
  colors: ToolColors;

  /* ── Graph ─────────────────────────────────────────── */

  /** Build a package/project graph for the given scenario */
  buildGraph(scenario: ScenarioId, packageCount: number): PackageNode[];

  /* ── Metrics ───────────────────────────────────────── */

  /** Compute build metrics based on state */
  computeMetrics(state: CiCdBuildState): BuildMetrics;

  /* ── Token expansion (flow engine) ─────────────────── */

  /** Expand a $token into concrete node IDs */
  expandToken(token: string, state: CiCdBuildState): string[] | null;

  /* ── Flow engine ───────────────────────────────────── */

  /** Flow beats for the graph analysis step */
  getAnalysisFlows(state: CiCdBuildState): FlowBeat[];

  /** Flow beats for the cold build execution */
  getColdBuildFlows(state: CiCdBuildState): FlowBeat[];

  /** Flow beats for caching / warm build */
  getCacheLookupFlows(state: CiCdBuildState): FlowBeat[];

  /** Flow beats for the warm build after cache restore */
  getWarmBuildFlows(state: CiCdBuildState): FlowBeat[];

  /** Flow beats for the tree-shaking step */
  getTreeShakeFlows(state: CiCdBuildState): FlowBeat[];

  /** Explanation text for each step */
  getAnalysisExplanation(state: CiCdBuildState): string;
  getColdBuildExplanation(state: CiCdBuildState): string;
  getCacheLookupExplanation(state: CiCdBuildState): string;
  getWarmBuildExplanation(state: CiCdBuildState): string;
  getTreeShakeExplanation(state: CiCdBuildState): string;

  /** Reorder steps based on tool-specific rules */
  reorderSteps(steps: StepDef[], state: CiCdBuildState): StepDef[];

  /* ── Scene (VizCraft topology) ─────────────────────── */

  /** Build the graph/topology portion of the VizCraft scene */
  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    state: CiCdBuildState,
    helpers: SceneHelpers,
  ): void;

  /** Build annotation overlays (cache status, timings, etc.) */
  buildAnnotationOverlays(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    state: CiCdBuildState,
    helpers: SceneHelpers,
    viewW: number,
  ): void;

  /** Tool-specific stat badges for the header */
  getStatBadges(state: CiCdBuildState): StatBadgeConfig[];

  /* ── Soft reset per animation pass ─────────────────── */

  softReset(state: CiCdBuildState): void;
}
