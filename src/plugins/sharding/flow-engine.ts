import type { ShardingState } from "./shardingSlice";

export function expandToken(token: string, state: ShardingState): string[] {
  if (token === "$clients") return state.clients.map((c) => c.id);
  if (token === "$targetShards") return state.queryTargetShards;
  if (token === "$hottestShard") return [state.hottestShardId];
  if (token === "$coolestShard") return [state.coolestShardId];
  return [token];
}

export interface FlowBeat {
  from: string;
  to: string;
  when?: (s: ShardingState) => boolean;
  duration?: number;
  explain?: string;
}

export type StepKey =
  | "overview"
  | "why-shard"
  | "route-request"
  | "target-shards"
  | "scatter-gather"
  | "join-merge"
  | "rebalance"
  | "summary";

export interface StepDef {
  key: StepKey;
  label: string;
  when?: (s: ShardingState) => boolean;
  nextButton?: string | ((s: ShardingState) => string);
  nextButtonColor?: string;
  processingText?: string;
  phase?: string | ((s: ShardingState) => string);
  flow?: FlowBeat[];
  delay?: number;
  recalcMetrics?: boolean;
  finalHotZones?: string[];
  explain?: string | ((s: ShardingState) => string);
  action?: "resetRun";
}

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Why Sharding?",
    action: "resetRun",
  },
  {
    key: "why-shard",
    label: "Why Shard",
    phase: "baseline",
    finalHotZones: ["router"],
    explain:
      "One database eventually hits CPU, IOPS, and storage limits. Sharding partitions data so reads/writes scale horizontally.",
  },
  {
    key: "route-request",
    label: "Route Request",
    phase: "routing",
    processingText: "Computing shard route...",
    flow: [{ from: "$clients", to: "router", duration: 700 }],
    finalHotZones: ["router"],
    explain: (s) =>
      `Router extracts ${s.routingTrace.keyLabel}=${s.routingTrace.keyValue}, hashes it to ${s.routingTrace.hashValue}, then routes by modulo ${s.shardCount} = ${s.routingTrace.moduloResult}.`,
  },
  {
    key: "target-shards",
    label: "Target Shards",
    phase: "execute",
    processingText: "Dispatching to shard(s)...",
    flow: [{ from: "router", to: "$targetShards", duration: 850 }],
    recalcMetrics: true,
    explain: (s) =>
      s.queryMetrics.shardsTouched === 1
        ? "Single-shard execution: fast local query path."
        : `Scatter query: this request fans out to ${s.queryMetrics.shardsTouched} shards.`,
  },
  {
    key: "scatter-gather",
    label: "Scatter Gather",
    when: (s) => s.queryMetrics.shardsTouched > 1,
    phase: "merge",
    nextButtonColor: "#f59e0b",
    flow: [{ from: "$targetShards", to: "aggregator", duration: 900 }],
    finalHotZones: ["aggregator", "router"],
    explain:
      "Cross-shard queries need merge/aggregation work before returning results to the app.",
  },
  {
    key: "join-merge",
    label: "Join Cost",
    when: (s) =>
      s.selectedQuery === "join-user-orders" && !s.queryMetrics.joinColocated,
    phase: "join",
    nextButtonColor: "#ef4444",
    flow: [
      { from: "$targetShards", to: "aggregator", duration: 750 },
      { from: "aggregator", to: "router", duration: 700 },
    ],
    finalHotZones: ["aggregator"],
    explain:
      "This is a cross-shard join: fan out, fetch, then merge. Data model choices decide whether joins stay local or become expensive.",
  },
  {
    key: "rebalance",
    label: "Rebalance Preview",
    phase: "rebalance",
    nextButtonColor: "#7c3aed",
    flow: [{ from: "$hottestShard", to: "$coolestShard", duration: 1000 }],
    explain: (s) =>
      `Adding/removing shards triggers data movement. Estimated movement for this setup: ~${s.dataMovedMb} MB.`,
  },
  {
    key: "summary",
    label: "Tradeoff Summary",
    phase: "summary",
    explain: (s) =>
      `This query contacted ${s.queryMetrics.shardsTouched} shard(s) and should return in about ${s.queryMetrics.latencyMs}ms. Balance ${s.balanceScore}/100 means how evenly traffic is spread across shards (higher is better). Complexity ${s.complexityScore}/10 estimates how hard this setup is to run and maintain. Best results come when data used together lives on the same shard.`,
  },
];

export interface TaggedStep {
  key: StepKey;
  label: string;
  autoAdvance?: boolean;
  nextButtonText?: string;
  nextButtonColor?: string;
  processingText?: string;
}

export function buildSteps(state: ShardingState): TaggedStep[] {
  const active = STEPS.filter((s) => !s.when || s.when(state));

  return active.map((step, i) => {
    const nextStep = active[i + 1];
    let nextButtonText: string | undefined;
    if (typeof step.nextButton === "function") {
      nextButtonText = step.nextButton(state);
    } else if (typeof step.nextButton === "string") {
      nextButtonText = step.nextButton;
    } else if (nextStep) {
      nextButtonText = nextStep.label;
    }

    return {
      key: step.key,
      label: step.label,
      autoAdvance: false,
      nextButtonText,
      nextButtonColor: step.nextButtonColor,
      processingText: step.processingText,
    };
  });
}

export interface FlowExecutorDeps {
  animateParallel: (
    pairs: { from: string; to: string }[],
    duration: number,
  ) => Promise<void>;
  patch: (p: Partial<ShardingState>) => void;
  getState: () => ShardingState;
  cancelled: () => boolean;
}

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  for (const beat of beats) {
    if (deps.cancelled()) return;

    const state = deps.getState();
    if (beat.when && !beat.when(state)) continue;

    const froms = expandToken(beat.from, state);
    const tos = expandToken(beat.to, state);

    const pairs: { from: string; to: string }[] = [];
    for (const f of froms) {
      for (const t of tos) {
        pairs.push({ from: f, to: t });
      }
    }

    const hotZones = [...new Set([...froms, ...tos])];
    const update: Partial<ShardingState> = { hotZones };
    if (beat.explain) update.explanation = beat.explain;
    deps.patch(update);

    await deps.animateParallel(pairs, beat.duration ?? 650);
  }
}
