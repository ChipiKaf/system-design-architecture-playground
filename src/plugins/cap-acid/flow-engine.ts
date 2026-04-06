import type { CapAcidState } from "./capAcidSlice";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<CapAcidState>;
export type StepDef = GenericStepDef<CapAcidState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<CapAcidState>;

/* ── Token expansion ─────────────────────────────────── */

export function expandToken(token: string, state: CapAcidState): string[] {
  if (token === "$client") return ["client-app"];
  if (token === "$gateway") return ["query-layer"];
  if (token === "$primary") {
    const p = state.nodes.find(
      (n) => n.role === "primary" && n.status === "up",
    );
    return p ? [p.id] : [state.nodes[0]?.id ?? "db-node-0"];
  }
  if (token === "$replicas") {
    return state.nodes
      .filter((n) => n.role !== "primary" && n.status === "up")
      .map((n) => n.id);
  }
  if (token === "$allNodes") {
    return state.nodes.filter((n) => n.status === "up").map((n) => n.id);
  }
  if (token === "$partitionedNode") {
    const p = state.nodes.find(
      (n) => n.status === "partitioned" || n.status === "down",
    );
    return p ? [p.id] : [];
  }
  return [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  | "overview"
  | "write-send"
  | "write-route"
  | "write-replicate"
  | "read-send"
  | "read-route"
  | "read-respond"
  | "trigger-partition"
  | "partition-write-send"
  | "partition-write-route"
  | "partition-read-send"
  | "partition-read-route"
  | "partition-read-respond"
  | "acid-check"
  | "summary";

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  /* ─── Overview ──────────────────────────────────────── */
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Begin Write →",
    action: "resetRun",
    explain: (s) => {
      const v =
        s.variant === "postgresql"
          ? "PostgreSQL (CA)"
          : s.variant === "cassandra"
            ? "Cassandra (AP)"
            : "MongoDB (CP)";
      return `${v} — 3-node cluster. Step through to see normal operation, then trigger a partition.`;
    },
  },

  /* ─── Normal Write: 3 granular steps ────────────────── */
  {
    key: "write-send",
    label: "Write → Query Layer",
    phase: "write",
    processingText: "Sending write...",
    flow: [{ from: "$client", to: "$gateway", duration: 500 }],
    finalHotZones: ["query-layer"],
    explain: () => "Client sends a write request to the query layer.",
  },
  {
    key: "write-route",
    label: "Route → Primary",
    phase: "write",
    processingText: "Routing...",
    flow: [{ from: "$gateway", to: "$primary", duration: 600 }],
    finalHotZones: (s) => {
      const p = s.nodes.find(
        (n) => n.role === "primary" && n.status === "up",
      );
      return p ? [p.id] : [];
    },
    explain: (s) =>
      s.variant === "cassandra"
        ? "Coordinator node receives the write."
        : "Query layer routes the write to the primary node.",
  },
  {
    key: "write-replicate",
    label: "Replicate → Secondaries",
    phase: "write",
    when: (s) =>
      s.variant !== "cassandra" || s.consistencyLevel !== "eventual",
    processingText: "Replicating...",
    flow: [{ from: "$primary", to: "$replicas", duration: 700 }],
    recalcMetrics: true,
    finalHotZones: (s) =>
      s.nodes.filter((n) => n.status === "up").map((n) => n.id),
    explain: (s) =>
      s.variant === "cassandra"
        ? `Coordinator forwards write to replica peers. All ${s.nodes.filter((n) => n.status === "up").length} nodes now have v${s.writeVersion}.`
        : `Primary replicates to secondaries. ${s.nodes.filter((n) => n.status === "up").length} nodes now at v${s.writeVersion}. Latency: ~${s.writeLatencyMs}ms.`,
  },

  /* ─── Normal Read: 3 granular steps ─────────────────── */
  {
    key: "read-send",
    label: "Read → Query Layer",
    phase: "read",
    processingText: "Sending read...",
    flow: [{ from: "$client", to: "$gateway", duration: 500 }],
    finalHotZones: ["query-layer"],
    explain: () => "Client sends a read request to the query layer.",
  },
  {
    key: "read-route",
    label: "Route → Primary",
    phase: "read",
    processingText: "Fetching...",
    flow: [{ from: "$gateway", to: "$primary", duration: 500 }],
    finalHotZones: (s) => {
      const p = s.nodes.find(
        (n) => n.role === "primary" && n.status === "up",
      );
      return p ? [p.id] : [];
    },
    explain: (s) =>
      `Query layer routes to ${s.variant === "cassandra" ? "coordinator" : "primary"} to fetch the latest value.`,
  },
  {
    key: "read-respond",
    label: "Response → Client",
    phase: "read",
    processingText: "Returning data...",
    flow: [
      { from: "$primary", to: "$gateway", duration: 400 },
      { from: "$gateway", to: "$client", duration: 400 },
    ],
    finalHotZones: ["client-app"],
    explain: (s) =>
      `Read returns v${s.writeVersion}. Latency: ~${s.readLatencyMs}ms. ${!s.partitioned ? "All nodes agree — consistent." : ""}`,
  },

  /* ─── Network Partition ─────────────────────────────── */
  {
    key: "trigger-partition",
    label: "⚡ Network Partition",
    phase: "partition",
    nextButtonColor: "#ef4444",
    processingText: "Splitting network...",
    delay: 800,
    action: "triggerPartition",
    recalcMetrics: true,
    finalHotZones: (s) => {
      const p = s.nodes.find(
        (n) => n.status === "partitioned" || n.status === "down",
      );
      return p ? [p.id] : [];
    },
    explain: (s) => s.riskText,
  },

  /* ─── Partition Write: 2 granular steps ─────────────── */
  {
    key: "partition-write-send",
    label: "Write → Query (Partitioned)",
    phase: "partition-write",
    when: (s) => s.partitioned,
    processingText: "Sending write...",
    flow: [{ from: "$client", to: "$gateway", duration: 500 }],
    finalHotZones: ["query-layer"],
    explain: (s) => {
      if (s.variant === "cassandra" && s.consistencyLevel === "strong")
        return "Client sends write — but CL=ALL needs every node to ack. This will fail.";
      return "Client sends a write request during the network partition.";
    },
  },
  {
    key: "partition-write-route",
    label: "Route → Primary (Partitioned)",
    phase: "partition-write",
    when: (s) =>
      s.partitioned &&
      !(s.variant === "cassandra" && s.consistencyLevel === "strong"),
    processingText: "Attempting route...",
    flow: [{ from: "$gateway", to: "$primary", duration: 600 }],
    recalcMetrics: true,
    finalHotZones: (s) => {
      const p = s.nodes.find(
        (n) => n.role === "primary" && n.status === "up",
      );
      return p ? [p.id] : [];
    },
    explain: (s) => {
      if (s.variant === "postgresql")
        return `PostgreSQL: Write succeeds on primary, but cannot replicate to partitioned node. Durability at risk. Availability: ${s.availabilityPct}%.`;
      if (s.variant === "cassandra")
        return `Cassandra CL=${s.consistencyLevel === "quorum" ? "QUORUM" : "ONE"}: Write succeeds on reachable nodes. Node 3 will diverge.`;
      return `MongoDB: New primary elected. Write accepted after election. Latency: ~${s.writeLatencyMs}ms.`;
    },
  },

  /* ─── Partition Read: 3 granular steps ──────────────── */
  {
    key: "partition-read-send",
    label: "Read → Query (Partitioned)",
    phase: "partition-read",
    when: (s) => s.partitioned,
    processingText: "Sending read...",
    flow: [{ from: "$client", to: "$gateway", duration: 500 }],
    finalHotZones: ["query-layer"],
    explain: () =>
      "Client sends a read request during the partition.",
  },
  {
    key: "partition-read-route",
    label: "Route → Node (Partitioned)",
    phase: "partition-read",
    when: (s) => s.partitioned,
    processingText: "Fetching...",
    flow: (s) => {
      const target = s.nodes.find(
        (n) => n.role === "primary" && n.status === "up",
      );
      return target
        ? [{ from: "$gateway", to: target.id, duration: 500 }]
        : [];
    },
    finalHotZones: (s) => {
      const p = s.nodes.find(
        (n) => n.role === "primary" && n.status === "up",
      );
      return p ? [p.id] : [];
    },
    explain: (s) => {
      if (s.variant === "postgresql")
        return `Routed to primary — it has the latest data (v${s.writeVersion}).`;
      if (s.variant === "cassandra")
        return s.consistencyLevel === "eventual"
          ? "CL=ONE may route to the partitioned node — risk of stale read."
          : `CL=${s.consistencyLevel === "strong" ? "ALL" : "QUORUM"}: Read routes to available quorum.`;
      return "Routed to the new primary after failover.";
    },
  },
  {
    key: "partition-read-respond",
    label: "Response → Client (Partitioned)",
    phase: "partition-read",
    when: (s) => s.partitioned,
    processingText: "Returning data...",
    flow: (s) => {
      const target = s.nodes.find(
        (n) => n.role === "primary" && n.status === "up",
      );
      if (!target) return [];
      return [
        { from: target.id, to: "$gateway", duration: 400 },
        { from: "$gateway", to: "$client", duration: 400 },
      ];
    },
    finalHotZones: ["client-app"],
    explain: (s) => {
      if (s.variant === "postgresql")
        return `Read returns v${s.writeVersion}. Consistency preserved — but the partitioned replica would serve stale data if queried directly.`;
      if (s.variant === "cassandra")
        return s.consistencyLevel === "eventual"
          ? `CL=ONE: Read may return stale v${s.writeVersion - 1}. CONSISTENCY VIOLATED.`
          : `CL=${s.consistencyLevel === "strong" ? "ALL" : "QUORUM"}: Read returns consistent data.`;
      return `MongoDB: Read from new primary returns v${s.writeVersion - 1} (pre-election data). Brief inconsistency until oplog catches up.`;
    },
  },

  /* ─── ACID Check ────────────────────────────────────── */
  {
    key: "acid-check",
    label: "ACID Status",
    phase: "acid-check",
    delay: 500,
    recalcMetrics: true,
    finalHotZones: (s) => s.nodes.map((n) => n.id),
    explain: (s) => {
      const a = s.acid;
      const parts: string[] = [];
      parts.push(`Atomicity: ${a.atomicity.toUpperCase()}`);
      parts.push(`Consistency: ${a.consistency.toUpperCase()}`);
      parts.push(`Isolation: ${a.isolation.toUpperCase()}`);
      parts.push(`Durability: ${String(a.durability).toUpperCase()}`);
      return parts.join("  ·  ");
    },
  },
  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    explain: (s) => {
      const cap = s.cap;
      const got = [cap.c && "C", cap.a && "A", cap.p && "P"]
        .filter(Boolean)
        .join("");
      const profile =
        s.variant === "postgresql"
          ? "PostgreSQL"
          : s.variant === "cassandra"
            ? "Cassandra"
            : "MongoDB";
      return `${profile} achieves ${got || "none"} during ${s.partitioned ? "partition" : "normal operation"}. ${s.partitioned ? "CAP forces a trade-off — you can't have all three." : "Without a partition, all three properties hold."} Try switching DB or toggling the partition to compare.`;
    },
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: CapAcidState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
