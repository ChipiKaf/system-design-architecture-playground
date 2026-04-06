import type { DbTradeoffState } from "./dbTradeoffSlice";
import { isTargetedOp, WORKLOAD_PROFILES } from "./dbTradeoffSlice";
import { getAdapter } from "./db-adapters";

/* ── helpers ───────────────────────────────────────────── */

const isReadOp = (op: string) =>
  op === "point-read" ||
  op === "join-query" ||
  op === "aggregate" ||
  op === "read-after-write";

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
  | "join-merge"
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
  flow?: FlowBeat[] | ((s: DbTradeoffState) => FlowBeat[]);
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

  // Delegate step reordering to the current adapter
  active = getAdapter(state.dbType).reorderSteps(active, state);

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

    // Cassandra: relabel "Replication" → "Write to Replicas"
    const label =
      step.key === "replication" && state.dbType === "cassandra"
        ? "Write to Replicas"
        : step.label;

    return {
      key: step.key,
      label,
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
