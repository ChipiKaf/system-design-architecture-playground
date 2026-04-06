import type { DbTradeoffState } from "./dbTradeoffSlice";
import { isTargetedOp, WORKLOAD_PROFILES } from "./dbTradeoffSlice";
import { getAdapter } from "./db-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ── helpers ───────────────────────────────────────────── */

const isReadOp = (op: string) =>
  op === "point-read" ||
  op === "join-query" ||
  op === "aggregate" ||
  op === "read-after-write";

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<DbTradeoffState>;
export type StepDef = GenericStepDef<DbTradeoffState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<DbTradeoffState>;

/* ── Token expansion ───────────────────────────────────── */

export function expandToken(token: string, state: DbTradeoffState): string[] {
  // Shared tokens (same for all DBs)
  if (token === "$clients") return ["client-app"];
  if (token === "$lagging") {
    const l = state.nodes.find((n) => n.status === "lagging");
    return l ? [l.id] : [];
  }

  // Delegate to adapter for DB-specific tokens
  const result = getAdapter(state.dbType).expandToken(token, state);
  if (result !== null) return result;

  // Unknown token — return as literal
  return [token];
}

/* ── Step definitions ──────────────────────────────────── */

export type StepKey =
  | "overview"
  | "data-model"
  | "send-request"
  | "db-route"
  | "replica-ack"
  | "db-response"
  | "join-merge"
  | "replication"
  | "consistency-check"
  | "summary";

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
    flow: (s) => getAdapter(s.dbType).getRouteFlows(s),
    recalcMetrics: true,
    explain: (s) => getAdapter(s.dbType).getRouteExplanation(s),
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
    flow: (s) => getAdapter(s.dbType).getResponseFlows(s),
    finalHotZones: ["query-layer", "client-app"],
    explain: (s) => getAdapter(s.dbType).getResponseExplanation(s),
  },

  {
    key: "join-merge",
    label: "Merge in App",
    when: (s) =>
      s.dbType === "mongodb" &&
      s.selectedOp === "join-query" &&
      s.joinMode === "app-join",
    phase: "join-merge",
    finalHotZones: ["query-layer"],
    delay: 300,
    explain:
      "Application code stitches the two result sets together in memory. This is the N+1 query cost: 2 round trips + O(n) merge loop. Latency adds up as dataset size grows.",
  },
  {
    key: "replication",
    label: "Replication",
    when: (s) => {
      if (isReadOp(s.selectedOp)) return false;
      if (s.dbType === "mongodb") return true;
      return s.nodeCount >= 2;
    },
    phase: "replication",
    nextButtonColor: "#8b5cf6",
    flow: (s) => getAdapter(s.dbType).getReplicationFlows(s),
    explain: (s) => getAdapter(s.dbType).getReplicationExplanation(s),
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

/* ── Build active steps ────────────────────────────────── */

export function buildSteps(state: DbTradeoffState): TaggedStep[] {
  return genericBuildSteps(STEPS, state, {
    reorder: (steps, s) => getAdapter(s.dbType).reorderSteps(steps, s),
    relabel: (step, s) =>
      step.key === "replication" && s.dbType === "cassandra"
        ? "Write to Replicas"
        : step.label,
  });
}

/* ── Flow executor ─────────────────────────────────────── */

export function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
