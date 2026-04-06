import type { DbTradeoffState } from "./dbTradeoffSlice";
import { isTargetedOp, WORKLOAD_PROFILES } from "./dbTradeoffSlice";

/* ── helpers ───────────────────────────────────────────── */

const isReadOp = (op: string) =>
  op === "point-read" ||
  op === "join-query" ||
  op === "aggregate" ||
  op === "read-after-write";

/* ── Token expansion ───────────────────────────────────── */

export function expandToken(token: string, state: DbTradeoffState): string[] {
  if (token === "$clients") return ["client-app"];

  /* ── MongoDB shard tokens ──────────────────────────── */
  if (token === "$targetShardPrimary") {
    const id = `shard-${state.targetShardIdx}-primary`;
    const n = state.nodes.find((nd) => nd.id === id && nd.status !== "down");
    return n ? [n.id] : [`shard-0-primary`];
  }
  if (token === "$targetShardSecondary") {
    const sec = state.nodes.find(
      (n) =>
        n.shardIdx === state.targetShardIdx &&
        n.role === "secondary" &&
        n.status !== "down",
    );
    return sec ? [sec.id] : expandToken("$targetShardPrimary", state);
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
  color?: string | ((s: DbTradeoffState) => string);
  duration?: number;
  explain?: string;
}

/* ── Step definitions ──────────────────────────────────── */

export type StepKey =
  | "overview"
  | "data-model"
  | "send-request"
  | "db-route"
  | "replica-ack"
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
  finalHotZones?: string[] | ((s: DbTradeoffState) => string[]);
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
      //  → reads with readPreference "secondary" go to a secondary node instead
      {
        from: "query-layer",
        to: "$targetShardPrimary",
        when: (s) =>
          s.dbType === "mongodb" &&
          isTargetedOp(s.selectedOp) &&
          !(isReadOp(s.selectedOp) && s.readPreference === "secondary"),
        duration: 700,
        explain: "mongos routes by shard key to the target shard's primary.",
      },
      {
        from: "query-layer",
        to: "$targetShardSecondary",
        when: (s) =>
          s.dbType === "mongodb" &&
          isTargetedOp(s.selectedOp) &&
          isReadOp(s.selectedOp) &&
          s.readPreference === "secondary",
        duration: 700,
        explain:
          "readPreference:secondary — mongos routes the read to a secondary to offload the primary.",
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
        const readSec =
          isReadOp(s.selectedOp) && s.readPreference === "secondary";
        if (targeted && readSec)
          return `readPreference:secondary — read sent to a secondary in Shard ${s.targetShardIdx + 1}. May return stale data.`;
        return targeted
          ? `Targeted query: mongos routes to Shard ${s.targetShardIdx + 1} only. Shards touched: 1/${s.nodeCount}.`
          : `Scatter-gather: mongos fans out to all ${s.nodeCount} shard(s). Shards touched: ${s.nodeCount}/${s.nodeCount}.`;
      }
      if (s.dbType === "cassandra")
        return `Partition-key routing: request hits ${s.result.nodesTouched} replica node(s).`;
      return `Request routed to primary. Write latency: ~${s.result.writeLatencyMs}ms.`;
    },
  },
  /* ── Replica-ack snapshot (majority reads only) ──────── */
  {
    key: "replica-ack",
    label: "Replica State",
    phase: "replica-ack",
    when: (s) =>
      s.dbType === "mongodb" &&
      s.readPreference === "majority" &&
      isReadOp(s.selectedOp) &&
      isTargetedOp(s.selectedOp),
    finalHotZones: (s) =>
      s.nodes.filter((n) => n.shardIdx === s.targetShardIdx).map((n) => n.id),
    explain: (s) => {
      const ack = s.replicaAckCount;
      return ack >= 2
        ? `${ack}/3 replicas have the latest write — that IS a majority. readConcern:majority → will return NEW value.`
        : `Only 1/3 replicas (the Primary) has the new write — no majority yet. readConcern:majority → will return OLD value (last safe committed snapshot).`;
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
      // MongoDB targeted — response from primary (majority read: color by ack count)
      {
        from: "$targetShardPrimary",
        to: "query-layer",
        when: (s) =>
          s.dbType === "mongodb" &&
          isTargetedOp(s.selectedOp) &&
          !(isReadOp(s.selectedOp) && s.readPreference === "secondary"),
        color: (s) =>
          s.dbType === "mongodb" &&
          isReadOp(s.selectedOp) &&
          s.readPreference === "majority"
            ? s.replicaAckCount >= 2
              ? "#22c55e"
              : "#f59e0b"
            : "",
        duration: 600,
      },
      // MongoDB targeted — response from secondary (read pref)
      {
        from: "$targetShardSecondary",
        to: "query-layer",
        when: (s) =>
          s.dbType === "mongodb" &&
          isTargetedOp(s.selectedOp) &&
          isReadOp(s.selectedOp) &&
          s.readPreference === "secondary",
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
    explain: (s) => {
      if (
        s.dbType === "mongodb" &&
        s.writeConcern === "wmajority" &&
        !isReadOp(s.selectedOp)
      ) {
        return `w:majority — response returned AFTER majority of replica set confirmed the write. Safer but slower (~${s.result.writeLatencyMs}ms).`;
      }
      if (
        s.dbType === "mongodb" &&
        s.writeConcern === "w1" &&
        !isReadOp(s.selectedOp)
      ) {
        return `w:1 — response returned IMMEDIATELY from primary. Fast (~${s.result.writeLatencyMs}ms) but replicas may not have the data yet.`;
      }
      if (
        s.dbType === "mongodb" &&
        s.readPreference === "majority" &&
        isReadOp(s.selectedOp)
      ) {
        const gotNew = s.replicaAckCount >= 2;
        return gotNew
          ? `readConcern:majority → NEW value returned ✓  (${s.replicaAckCount}/3 nodes confirmed — majority snapshot is current).`
          : `readConcern:majority → OLD value returned  (new write is on 1/3 nodes only — not majority-committed yet, so the safe old snapshot is served).`;
      }
      return `Response returned. Read: ~${s.result.readLatencyMs}ms, Write: ~${s.result.writeLatencyMs}ms.`;
    },
  },

  {
    key: "replication",
    label: "Replication",
    when: (s) => {
      if (isReadOp(s.selectedOp)) return false; // reads don't generate replication
      if (s.dbType === "mongodb") return true;
      return s.nodeCount >= 2;
    },
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
      if (s.dbType === "mongodb") {
        if (s.writeConcern === "wmajority")
          return `w:majority — Shard ${s.targetShardIdx + 1}'s primary waited for majority ack from secondaries BEFORE responding. Data is durable.`;
        return `w:1 — Shard ${s.targetShardIdx + 1}'s primary replicates AFTER the response was sent. If primary crashes now, the write could be lost.`;
      }
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
      const dbLabel =
        s.dbType === "relational"
          ? "PostgreSQL"
          : s.dbType === "mongodb"
            ? "MongoDB"
            : "Cassandra";
      const profile = WORKLOAD_PROFILES[s.workload];
      const needsList = profile.needs.join(", ");
      return `${profile.label} needs: ${needsList}. ${dbLabel} is a ${grade} fit (${fit}/100) — ${s.whyThisDb} Read ~${s.result.readLatencyMs}ms, Write ~${s.result.writeLatencyMs}ms, Throughput ~${s.result.throughputRps.toLocaleString()} rps.`;
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
  let active = STEPS.filter((s) => !s.when || s.when(state));

  // w:majority → replication happens BEFORE db-response (write must spread first)
  // w:1       → replication happens AFTER db-response (current default order)
  if (
    state.dbType === "mongodb" &&
    state.writeConcern === "wmajority" &&
    !isReadOp(state.selectedOp)
  ) {
    const repIdx = active.findIndex((s) => s.key === "replication");
    const respIdx = active.findIndex((s) => s.key === "db-response");
    if (repIdx > respIdx && repIdx >= 0 && respIdx >= 0) {
      const [rep] = active.splice(repIdx, 1);
      active.splice(respIdx, 0, rep);
    }
  }

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
    color?: string,
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

    const beatColor =
      typeof beat.color === "function" ? beat.color(state) : beat.color;
    await deps.animateParallel(pairs, beat.duration ?? 650, beatColor);
  }
}
