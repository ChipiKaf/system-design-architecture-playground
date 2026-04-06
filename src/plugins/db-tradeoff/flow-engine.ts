import type { DbTradeoffState } from "./dbTradeoffSlice";
import { isTargetedOp } from "./dbTradeoffSlice";

/* ── Token expansion ───────────────────────────────────── */

export function expandToken(token: string, state: DbTradeoffState): string[] {
  if (token === "$clients") return ["client-app"];

  /* ── MongoDB shard tokens ──────────────────────────── */
  if (token === "$targetShardPrimary") {
    const id = `shard-${state.targetShardIdx}-primary`;
    const n = state.nodes.find((nd) => nd.id === id && nd.status !== "down");
    return n ? [n.id] : [`shard-0-primary`];
  }
  if (token === "$shardPrimaries") {
    return state.nodes
      .filter((n) => n.role === "primary" && n.status !== "down")
      .map((n) => n.id);
  }
  if (token === "$targetShardReplicas") {
    return state.nodes
      .filter(
        (n) =>
          n.shardIdx === state.targetShardIdx &&
          n.role === "secondary" &&
          n.status !== "down",
      )
      .map((n) => n.id);
  }
  // $shard0Replicas, $shard1Replicas, $shard2Replicas
  const shardRepMatch = token.match(/^\$shard(\d)Replicas$/);
  if (shardRepMatch) {
    const sIdx = Number(shardRepMatch[1]);
    return state.nodes
      .filter(
        (n) =>
          n.shardIdx === sIdx && n.role === "secondary" && n.status !== "down",
      )
      .map((n) => n.id);
  }

  /* ── Generic tokens (relational / cassandra) ───────── */
  if (token === "$primary") {
    const p = state.nodes.find((n) => n.role === "primary");
    return p ? [p.id] : [state.nodes[0]?.id ?? "db-node-0"];
  }
  if (token === "$replicas") {
    const r = state.nodes.filter(
      (n) => n.role !== "primary" && n.status !== "down",
    );
    return r.length ? r.map((n) => n.id) : [state.nodes[0]?.id ?? "db-node-0"];
  }
  if (token === "$allNodes") {
    return state.nodes.filter((n) => n.status !== "down").map((n) => n.id);
  }
  if (token === "$lagging") {
    const l = state.nodes.find((n) => n.status === "lagging");
    return l ? [l.id] : [];
  }
  return [token];
}

/* ── FlowBeat ──────────────────────────────────────────── */

export interface FlowBeat {
  from: string;
  to: string;
  when?: (s: DbTradeoffState) => boolean;
  duration?: number;
  explain?: string;
}

/* ── Step definitions ──────────────────────────────────── */

export type StepKey =
  | "overview"
  | "data-model"
  | "send-request"
  | "db-route"
  | "db-response"
  | "replication"
  | "consistency-check"
  | "summary";

export interface StepDef {
  key: StepKey;
  label: string;
  when?: (s: DbTradeoffState) => boolean;
  nextButton?: string | ((s: DbTradeoffState) => string);
  nextButtonColor?: string;
  processingText?: string;
  phase?: string | ((s: DbTradeoffState) => string);
  flow?: FlowBeat[];
  delay?: number;
  recalcMetrics?: boolean;
  finalHotZones?: string[];
  explain?: string | ((s: DbTradeoffState) => string);
  action?: "resetRun";
}

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "See Data Model",
    action: "resetRun",
  },
  {
    key: "data-model",
    label: "Data Model",
    phase: "data-model",
    recalcMetrics: true,
    finalHotZones: [],
    explain: (s) => s.dataModel,
  },
  {
    key: "send-request",
    label: "Send Request",
    phase: "request",
    processingText: "Sending request...",
    flow: [
      {
        from: "$clients",
        to: "query-layer",
        duration: 600,
        explain: "Client sends the request to the app/query layer.",
      },
    ],
    finalHotZones: ["query-layer"],
  },
  {
    key: "db-route",
    label: "Route to DB",
    phase: (s) =>
      s.dbType === "cassandra" ? "partition-route" : "primary-route",
    processingText: "Routing to database...",
    flow: [
      // Relational: always routes to the single primary
      {
        from: "query-layer",
        to: "$primary",
        when: (s) => s.dbType === "relational",
        duration: 700,
        explain: "Query routes to the primary DB node.",
      },
      // MongoDB targeted (write, point-read, read-after-write): one shard
      {
        from: "query-layer",
        to: "$targetShardPrimary",
        when: (s) => s.dbType === "mongodb" && isTargetedOp(s.selectedOp),
        duration: 700,
        explain: "mongos routes by shard key to the target shard's primary.",
      },
      // MongoDB scatter-gather (join, aggregate, burst): all shard primaries
      {
        from: "query-layer",
        to: "$shardPrimaries",
        when: (s) => s.dbType === "mongodb" && !isTargetedOp(s.selectedOp),
        duration: 700,
        explain: "Scatter-gather: mongos fans out to ALL shard primaries.",
      },
      // Cassandra: partition router → replica nodes
      {
        from: "query-layer",
        to: "$allNodes",
        when: (s) => s.dbType === "cassandra",
        duration: 700,
        explain: "Cassandra routes by partition key to replica nodes.",
      },
    ],
    recalcMetrics: true,
    explain: (s) => {
      if (s.dbType === "mongodb") {
        const targeted = isTargetedOp(s.selectedOp);
        return targeted
          ? `Targeted query: mongos routes to Shard ${s.targetShardIdx + 1} only. Shards touched: 1/${s.nodeCount}.`
          : `Scatter-gather: mongos fans out to all ${s.nodeCount} shard(s). Shards touched: ${s.nodeCount}/${s.nodeCount}.`;
      }
      if (s.dbType === "cassandra")
        return `Partition-key routing: request hits ${s.result.nodesTouched} replica node(s).`;
      return `Request routed to primary. Write latency: ~${s.result.writeLatencyMs}ms.`;
    },
  },
  {
    key: "db-response",
    label: "DB Response",
    phase: "response",
    flow: [
      // Relational
      {
        from: "$primary",
        to: "query-layer",
        when: (s) => s.dbType === "relational",
        duration: 600,
      },
      // MongoDB targeted
      {
        from: "$targetShardPrimary",
        to: "query-layer",
        when: (s) => s.dbType === "mongodb" && isTargetedOp(s.selectedOp),
        duration: 600,
      },
      // MongoDB scatter-gather
      {
        from: "$shardPrimaries",
        to: "query-layer",
        when: (s) => s.dbType === "mongodb" && !isTargetedOp(s.selectedOp),
        duration: 600,
      },
      // Cassandra
      {
        from: "$allNodes",
        to: "query-layer",
        when: (s) => s.dbType === "cassandra",
        duration: 600,
      },
    ],
    finalHotZones: ["query-layer", "client-app"],
    explain: (s) =>
      `Response returned. Read: ~${s.result.readLatencyMs}ms, Write: ~${s.result.writeLatencyMs}ms.`,
  },
  {
    key: "replication",
    label: "Replication",
    when: (s) => (s.dbType === "mongodb" ? true : s.nodeCount >= 2),
    phase: "replication",
    nextButtonColor: "#8b5cf6",
    flow: [
      // Relational: primary → all secondaries
      {
        from: "$primary",
        to: "$replicas",
        when: (s) => s.dbType === "relational" && s.nodeCount >= 2,
        duration: 800,
        explain: "Primary replicates the write to secondary nodes.",
      },
      // MongoDB: only replicate within the targeted shard
      {
        from: "$targetShardPrimary",
        to: "$targetShardReplicas",
        when: (s) => s.dbType === "mongodb",
        duration: 800,
        explain: `Shard primary replicates the write to its 2 secondaries.`,
      },
      // Cassandra: peer-to-peer
      {
        from: "$allNodes",
        to: "$allNodes",
        when: (s) =>
          s.dbType === "cassandra" &&
          s.nodes.filter((n) => n.status !== "down").length >= 2,
        duration: 800,
        explain: "Cassandra replicates across peer nodes (no single primary).",
      },
    ],
    explain: (s) => {
      if (s.dbType === "mongodb")
        return `Shard ${s.targetShardIdx + 1}'s primary replicates to its 2 secondaries within its replica set.`;
      if (s.dbType === "cassandra")
        return "Peer-to-peer replication: all replicas exchange data. Tunable consistency decides how many must confirm.";
      return `Write replicated to ${Math.max(0, s.nodeCount - 1)} secondary node(s). Lag depends on replication mode.`;
    },
  },
  {
    key: "consistency-check",
    label: "Consistency Check",
    when: (s) =>
      s.selectedOp === "read-after-write" && s.consistencyLevel !== "strong",
    phase: (s) => (s.result.staleReadRisk ? "stale" : "consistent"),
    nextButtonColor: "#ef4444",
    delay: 600,
    finalHotZones: ["client-app"],
    explain: (s) =>
      s.result.staleReadRisk
        ? "Stale read detected! A secondary hasn't caught up yet. With eventual consistency, reads from lagging replicas return outdated data."
        : "No stale read. Quorum read+write overlap ensures the latest value is returned.",
  },
  {
    key: "summary",
    label: "Tradeoff Summary",
    phase: "summary",
    explain: (s) => {
      const fit = s.result.fitScore;
      const grade = fit >= 80 ? "strong" : fit >= 50 ? "decent" : "poor";
      return `${s.dbType === "relational" ? "PostgreSQL" : s.dbType === "mongodb" ? "MongoDB" : "Cassandra"} is a ${grade} fit (${fit}/100) for ${s.workload}. Read ~${s.result.readLatencyMs}ms, Write ~${s.result.writeLatencyMs}ms, Throughput ~${s.result.throughputRps} rps. Availability ${s.result.availability}%.`;
    },
  },
];

/* ── buildSteps + TaggedStep ───────────────────────────── */

export interface TaggedStep {
  key: StepKey;
  label: string;
  autoAdvance?: boolean;
  nextButtonText?: string;
  nextButtonColor?: string;
  processingText?: string;
}

export function buildSteps(state: DbTradeoffState): TaggedStep[] {
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

/* ── Flow executor ─────────────────────────────────────── */

export interface FlowExecutorDeps {
  animateParallel: (
    pairs: { from: string; to: string }[],
    duration: number,
  ) => Promise<void>;
  patch: (p: Partial<DbTradeoffState>) => void;
  getState: () => DbTradeoffState;
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

    // Skip self-referential pairs in all→all expansion
    const pairs: { from: string; to: string }[] = [];
    for (const f of froms) {
      for (const t of tos) {
        if (f !== t) pairs.push({ from: f, to: t });
      }
    }
    if (pairs.length === 0) continue;

    const hotZones = [...new Set([...froms, ...tos])];
    const update: Partial<DbTradeoffState> = { hotZones };
    if (beat.explain) update.explanation = beat.explain;
    deps.patch(update);

    await deps.animateParallel(pairs, beat.duration ?? 650);
  }
}
