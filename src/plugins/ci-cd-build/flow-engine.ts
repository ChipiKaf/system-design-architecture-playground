import type { CiCdBuildState } from "./ciCdBuildSlice";
import { getAdapter } from "./build-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   CI/CD Build Lab — Declarative Flow Engine

   Uses the shared lab-engine for build/execute logic.
   Each build tool delegates to its adapter for flows.
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<CiCdBuildState>;
export type StepDef = GenericStepDef<CiCdBuildState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<CiCdBuildState>;

/* ── Token expansion ─────────────────────────────────── */

export function expandToken(token: string, state: CiCdBuildState): string[] {
  if (token === "$ci-trigger") return ["ci-trigger"];
  if (token === "$build-orchestrator") return ["build-orchestrator"];
  if (token === "$cache-store") return ["cache-store"];
  if (token === "$output-bundle") return ["output-bundle"];

  const result = getAdapter(state.toolType).expandToken(token, state);
  if (result !== null) return result;

  return [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  | "overview"
  | "graph-model"
  | "graph-analysis"
  | "cold-build"
  | "cache-save"
  | "cache-lookup"
  | "warm-build"
  | "tree-shake"
  | "summary";

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "See Project Graph",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.toolType);
      return `${adapter.profile.label} selected. This monorepo has ${s.packages.length} packages. Step through to see how ${adapter.profile.shortLabel} builds them.`;
    },
  },
  {
    key: "graph-model",
    label: "Project Graph",
    phase: "graph-model",
    recalcMetrics: true,
    finalHotZones: (s) => s.packages.map((p) => p.id),
    explain: (s) => {
      const adapter = getAdapter(s.toolType);
      return `${adapter.profile.shortLabel} models your workspace as a directed acyclic graph (DAG). ${adapter.profile.graphModel} Each node is a package; edges are imports/dependencies. This graph drives everything — affected detection, parallelism, and build order.`;
    },
  },
  {
    key: "graph-analysis",
    label: "Affected Analysis",
    phase: "affected",
    processingText: "Analyzing dependency graph...",
    flow: (s) => getAdapter(s.toolType).getAnalysisFlows(s),
    recalcMetrics: true,
    explain: (s) => getAdapter(s.toolType).getAnalysisExplanation(s),
  },
  {
    key: "cold-build",
    label: "Cold Build (No Cache)",
    phase: "cold-build",
    processingText: "Building from scratch...",
    flow: (s) => getAdapter(s.toolType).getColdBuildFlows(s),
    recalcMetrics: true,
    explain: (s) => getAdapter(s.toolType).getColdBuildExplanation(s),
  },
  {
    key: "cache-save",
    label: "Cache Artifacts",
    phase: "cache-save",
    delay: 300,
    finalHotZones: ["cache-store"],
    flow: [
      {
        from: "$affected-packages",
        to: "$cache-store",
        duration: 600,
        explain: "Build outputs are hashed and saved to the cache store.",
      },
    ],
    explain: (s) => {
      const adapter = getAdapter(s.toolType);
      return `${adapter.profile.shortLabel} hashes each task's inputs (source files, dependencies, config) → creates a cache key. The output artifacts (dist/, .next/, compiled JS) are stored under that key. On the next CI run, if inputs haven't changed, the cached output is restored instead of rebuilding.`;
    },
  },
  {
    key: "cache-lookup",
    label: "Cache Lookup (Second Build)",
    phase: "cache-lookup",
    processingText: "Checking cache...",
    flow: (s) => getAdapter(s.toolType).getCacheLookupFlows(s),
    explain: (s) => getAdapter(s.toolType).getCacheLookupExplanation(s),
  },
  {
    key: "warm-build",
    label: "Warm Build (Cache Hit)",
    phase: "warm-build",
    processingText: "Restoring from cache...",
    flow: (s) => getAdapter(s.toolType).getWarmBuildFlows(s),
    recalcMetrics: true,
    explain: (s) => getAdapter(s.toolType).getWarmBuildExplanation(s),
  },
  {
    key: "tree-shake",
    label: "Tree-Shaking & Bundling",
    phase: "tree-shake",
    processingText: "Eliminating dead code...",
    flow: (s) => getAdapter(s.toolType).getTreeShakeFlows(s),
    recalcMetrics: true,
    explain: (s) => getAdapter(s.toolType).getTreeShakeExplanation(s),
  },
  {
    key: "summary",
    label: "Build Summary",
    phase: "summary",
    explain: (s) => {
      const adapter = getAdapter(s.toolType);
      const r = s.result;
      const savings =
        r.coldBuildMs > 0
          ? Math.round((1 - r.warmBuildMs / r.coldBuildMs) * 100)
          : 0;
      return `${adapter.profile.label}: Cold build ${r.coldBuildMs}ms → warm build ${r.warmBuildMs}ms (${savings}% faster with cache). ${r.cacheHitRate}% cache hit rate across ${r.affectedCount}/${r.totalPackages} affected packages. ${r.treeShakenKb}KB eliminated by tree-shaking. Max parallelism: ${r.parallelism} concurrent tasks.`;
    },
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: CiCdBuildState): TaggedStep[] {
  return genericBuildSteps(STEPS, state, {
    reorder: (steps, s) => getAdapter(s.toolType).reorderSteps(steps, s),
  });
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
