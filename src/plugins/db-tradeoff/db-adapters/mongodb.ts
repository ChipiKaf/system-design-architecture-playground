import type {
  ConsistencyLevel,
  DbNode,
  WriteConcern,
  ReadPreference,
  JoinMode,
} from "../dbTradeoffSlice";
import { isTargetedOp } from "../dbTradeoffSlice";
import type { FlowBeat } from "../flow-engine";
import type {
  DbAdapter,
  OpAdjustment,
  StatBadgeConfig,
} from "./types";

/* ── Helpers ───────────────────────────────────────────── */

const NODE_STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  up: { fill: "#0f3b2e", stroke: "#10b981" },
  down: { fill: "#7f1d1d", stroke: "#ef4444" },
  lagging: { fill: "#78350f", stroke: "#f59e0b" },
};

const isReadOp = (op: string) =>
  op === "point-read" ||
  op === "join-query" ||
  op === "aggregate" ||
  op === "read-after-write";

/**
 * Map MongoDB's actual knobs (writeConcern + readPreference) to a
 * canonical ConsistencyLevel so existing metric computations work correctly.
 */
export function deriveMongoConsistency(
  wc: WriteConcern,
  rp: ReadPreference,
): ConsistencyLevel {
  if (wc === "wmajority" && rp === "majority") return "strong";
  if (wc === "w1" && rp === "secondary") return "eventual";
  return "quorum";
}

/* ── Adapter ───────────────────────────────────────────── */

export const mongodbAdapter: DbAdapter = {
  id: "mongodb",

  profile: {
    label: "MongoDB (Document)",
    shortLabel: "MongoDB",
    dataModel: "Nested JSON documents in collections",
    scaling: "Horizontal via sharding",
    consistency: "quorum",
    strengths: [
      "Flexible schema",
      "Nested document locality",
      "Good horizontal scaling",
      "Developer ergonomics",
    ],
    weaknesses: [
      "Weaker joins",
      "Data duplication common",
      "Consistency trade-offs",
    ],
  },

  colors: { fill: "#052e16", stroke: "#22c55e" },

  dataModels: {
    banking: {
      model: "Documents: accounts embed recent transactions",
      detail: [
        "accounts { _id, balance, owner, recentTxns: [...] }",
        "transactions { _id, from, to, amount, ts }",
      ],
    },
    ecommerce: {
      model: "Documents: products with embedded variants, orders with items",
      detail: [
        "products { _id, name, price, variants: [...], specs: {...} }",
        "orders { _id, user_id, items: [{ product, qty }], total }",
      ],
    },
    chat: {
      model: "Documents: messages per channel, user profiles",
      detail: [
        "messages { _id, channel_id, sender, body, ts }",
        "channels { _id, name, members: [...] }",
      ],
    },
  },

  fitScores: { banking: 35, ecommerce: 88, chat: 60 },

  whyText: {
    banking:
      "Possible, but multi-document transactions are less battle-tested than relational for strict ledger semantics.",
    ecommerce:
      "Flexible product attributes, nested variants, and evolving schemas make documents a natural fit for catalogs.",
    chat: "Decent for moderate scale, but write-heavy chat at millions of messages/sec pushes MongoDB limits.",
  },

  maxNodes: 3,

  buildNodes(count, failedIdx) {
    const shardCount = count;
    const nodes: DbNode[] = [];
    let flatIdx = 0;
    for (let s = 0; s < shardCount; s++) {
      const roles: Array<"primary" | "secondary"> = [
        "primary",
        "secondary",
        "secondary",
      ];
      for (let r = 0; r < 3; r++) {
        nodes.push({
          id: `shard-${s}-${roles[r] === "primary" ? "primary" : `sec-${r - 1}`}`,
          role: roles[r],
          status: flatIdx === failedIdx ? "down" : "up",
          loadPct: flatIdx === failedIdx ? 0 : Math.round(100 / 3),
          shardIdx: s,
        });
        flatIdx++;
      }
    }
    return nodes;
  },

  pickFailureTarget(state) {
    // Kill the primary of the last shard (impactful demo)
    return (state.nodeCount - 1) * 3;
  },

  baseLatencies: {
    read: 6,
    write: 8,
    throughput: 5000,
    scaleFactor: 0.5,
  },

  opAdjustment(op, state) {
    const nodeCount = state.nodeCount;
    const base: OpAdjustment = {
      readDelta: 0,
      writeDelta: 0,
      throughputMultiplier: 1,
      nodesTouched: 1,
      staleReadRisk: false,
    };
    if (op === "join-query") {
      base.readDelta = 22; // application-level join
      base.nodesTouched = 2;
    }
    if (op === "aggregate") {
      base.readDelta = 25;
      base.nodesTouched = Math.min(nodeCount, 2);
    }
    if (op === "burst-write") {
      base.writeDelta = 8 * 0.5; // 1.5× base write
      base.throughputMultiplier = 1.4;
    }
    if (op === "read-after-write" && state.consistencyLevel === "eventual") {
      base.staleReadRisk = true;
      base.readDelta = 4;
    }
    return base;
  },

  availability(nodeCount, failedNode) {
    if (!failedNode) return 97;
    return nodeCount >= 3 ? 88 : 60;
  },

  complexity(nodeCount, _consistency) {
    let c = 3; // base 2 + 1 for mongo
    if (nodeCount >= 4) c += 1;
    return Math.max(1, Math.min(10, c));
  },

  failureImpact: { writeOverhead: 15, throughputFactor: 0.7 },

  rpoRto(state, failedNode) {
    return {
      rpoRisk: state.writeConcern === "w1" ? "high" : "none",
      rtoMs: failedNode ? 7000 : 0,
    };
  },

  refineMetrics(state, metrics) {
    // Write concern latency adjustment
    if (state.writeConcern === "wmajority") {
      metrics.writeMs += 6;
    }

    // Read preference effects
    if (state.readPreference === "secondary") {
      metrics.readMs -= 1;
      metrics.staleReadRisk = true;
    } else if (state.readPreference === "majority") {
      metrics.readMs += 3;
      metrics.staleReadRisk = false;
    } else {
      metrics.staleReadRisk = false;
    }

    // Join mode latency override
    if (state.selectedOp === "join-query") {
      const mongoReadBase = 6;
      if (state.joinMode === "denormalized") {
        metrics.readMs = mongoReadBase + 4;
      } else if (state.joinMode === "lookup") {
        metrics.readMs = mongoReadBase + 16;
      }
    }

    // Shards touched
    const shardCount = state.nodeCount;
    const isJoinDenorm =
      state.selectedOp === "join-query" && state.joinMode === "denormalized";
    metrics.shardsTouched =
      isTargetedOp(state.selectedOp) || isJoinDenorm ? 1 : shardCount;

    // Nodes touched override for join modes
    if (state.selectedOp === "join-query") {
      if (state.joinMode === "denormalized") metrics.nodesTouched = 1;
      else if (state.joinMode === "lookup") metrics.nodesTouched = shardCount;
      // app-join: keep existing nodesTouched (2)
    }
  },

  applyPostBuildMutations(state) {
    // Mark a secondary in target shard as lagging for read-after-write + eventual
    if (
      state.consistencyLevel === "eventual" &&
      state.selectedOp === "read-after-write"
    ) {
      const laggingCandidate = state.nodes.find(
        (n) =>
          n.shardIdx === state.targetShardIdx &&
          n.role === "secondary" &&
          n.status === "up",
      );
      if (laggingCandidate) laggingCandidate.status = "lagging";
    }
  },

  /* ── Token expansion ─────────────────────────────────── */

  expandToken(token, state) {
    if (token === "$targetShardPrimary") {
      const id = `shard-${state.targetShardIdx}-primary`;
      const n = state.nodes.find((nd) => nd.id === id && nd.status !== "down");
      return n ? [n.id] : ["shard-0-primary"];
    }
    if (token === "$targetShardSecondary") {
      const sec = state.nodes.find(
        (n) =>
          n.shardIdx === state.targetShardIdx &&
          n.role === "secondary" &&
          n.status !== "down",
      );
      return sec
        ? [sec.id]
        : (this.expandToken("$targetShardPrimary", state) ?? [
            "shard-0-primary",
          ]);
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
            n.shardIdx === sIdx &&
            n.role === "secondary" &&
            n.status !== "down",
        )
        .map((n) => n.id);
    }
    if (token === "$shard0Primary") {
      const p = state.nodes.find(
        (n) => n.shardIdx === 0 && n.role === "primary",
      );
      return p ? [p.id] : ["shard-0-primary"];
    }
    if (token === "$shard1Primary") {
      const p = state.nodes.find(
        (n) => n.shardIdx === 1 && n.role === "primary",
      );
      if (p) return [p.id];
      const p0 = state.nodes.find(
        (n) => n.shardIdx === 0 && n.role === "primary",
      );
      return p0 ? [p0.id] : ["shard-0-primary"];
    }
    return null; // not handled
  },

  /* ── Flow beats ──────────────────────────────────────── */

  getRouteFlows(state) {
    const flows: FlowBeat[] = [];

    // Targeted (write, point-read, read-after-write): one shard
    if (
      isTargetedOp(state.selectedOp) &&
      !(isReadOp(state.selectedOp) && state.readPreference === "secondary")
    ) {
      flows.push({
        from: "query-layer",
        to: "$targetShardPrimary",
        duration: 700,
        explain: "mongos routes by shard key to the target shard's primary.",
      });
    }
    if (
      isTargetedOp(state.selectedOp) &&
      isReadOp(state.selectedOp) &&
      state.readPreference === "secondary"
    ) {
      flows.push({
        from: "query-layer",
        to: "$targetShardSecondary",
        duration: 700,
        explain:
          "readPreference:secondary — mongos routes the read to a secondary to offload the primary.",
      });
    }
    // Scatter-gather (aggregate, burst): all shard primaries
    if (!isTargetedOp(state.selectedOp) && state.selectedOp !== "join-query") {
      flows.push({
        from: "query-layer",
        to: "$shardPrimaries",
        duration: 700,
        explain: "Scatter-gather: mongos fans out to ALL shard primaries.",
      });
    }
    // Join-query: depends on join mode
    if (state.selectedOp === "join-query") {
      if (state.joinMode === "lookup") {
        flows.push({
          from: "query-layer",
          to: "$shardPrimaries",
          duration: 700,
          explain:
            "$lookup aggregation pipeline fans out to all shard primaries. Cross-shard joins require each shard to independently resolve the join.",
        });
      }
      if (state.joinMode === "denormalized") {
        flows.push({
          from: "query-layer",
          to: "$targetShardPrimary",
          duration: 550,
          explain:
            "Denormalized: users and orders are embedded in one document. Single shard read — no join overhead.",
        });
      }
      if (state.joinMode === "app-join") {
        flows.push(
          {
            from: "query-layer",
            to: "$shard0Primary",
            duration: 550,
            explain:
              "App-side join — Round trip 1 of 2: fetching first collection (e.g., users) from Shard 1.",
          },
          {
            from: "$shard0Primary",
            to: "query-layer",
            duration: 450,
            explain:
              "Shard 1 returns the users collection. Issuing second query...",
          },
          {
            from: "query-layer",
            to: "$shard1Primary",
            duration: 550,
            explain:
              "App-side join — Round trip 2 of 2: fetching second collection (e.g., orders) from Shard 2.",
          },
          {
            from: "$shard1Primary",
            to: "query-layer",
            duration: 450,
            explain:
              "Both collections received. Merging results in application layer...",
          },
        );
      }
    }
    return flows;
  },

  getResponseFlows(state) {
    const flows: FlowBeat[] = [];
    // Targeted primary response (including denormalized join)
    if (
      (isTargetedOp(state.selectedOp) ||
        (state.selectedOp === "join-query" &&
          state.joinMode === "denormalized")) &&
      !(isReadOp(state.selectedOp) && state.readPreference === "secondary")
    ) {
      flows.push({
        from: "$targetShardPrimary",
        to: "query-layer",
        color:
          isReadOp(state.selectedOp) && state.readPreference === "majority"
            ? state.replicaAckCount >= 2
              ? "#22c55e"
              : "#f59e0b"
            : "",
        duration: 600,
      });
    }
    // Targeted secondary response
    if (
      isTargetedOp(state.selectedOp) &&
      isReadOp(state.selectedOp) &&
      state.readPreference === "secondary"
    ) {
      flows.push({
        from: "$targetShardSecondary",
        to: "query-layer",
        duration: 600,
      });
    }
    // Scatter-gather response
    if (
      !isTargetedOp(state.selectedOp) &&
      !(state.selectedOp === "join-query" && state.joinMode === "app-join") &&
      !(state.selectedOp === "join-query" && state.joinMode === "denormalized")
    ) {
      flows.push({
        from: "$shardPrimaries",
        to: "query-layer",
        duration: 600,
      });
    }
    return flows;
  },

  getReplicationFlows(_state) {
    return [
      {
        from: "$targetShardPrimary",
        to: "$targetShardReplicas",
        duration: 800,
        explain: "Shard primary replicates the write to its 2 secondaries.",
      },
    ];
  },

  getRouteExplanation(state) {
    if (state.selectedOp === "join-query") {
      if (state.joinMode === "app-join")
        return "App-side join: 2 round trips to separate shards — more network latency, manual data stitching in application code.";
      if (state.joinMode === "lookup")
        return `$lookup aggregation: mongos fans out the pipeline to all ${state.nodeCount} shard(s). Cross-shard joins require full scatter-gather.`;
      if (state.joinMode === "denormalized")
        return `Denormalized: users+orders embedded in one document at Shard ${state.targetShardIdx + 1}. Single targeted read — no join overhead. Shards touched: 1/${state.nodeCount}.`;
    }
    const targeted = isTargetedOp(state.selectedOp);
    const readSec =
      isReadOp(state.selectedOp) && state.readPreference === "secondary";
    if (targeted && readSec)
      return `readPreference:secondary — read sent to a secondary in Shard ${state.targetShardIdx + 1}. May return stale data.`;
    return targeted
      ? `Targeted query: mongos routes to Shard ${state.targetShardIdx + 1} only. Shards touched: 1/${state.nodeCount}.`
      : `Scatter-gather: mongos fans out to all ${state.nodeCount} shard(s). Shards touched: ${state.nodeCount}/${state.nodeCount}.`;
  },

  getResponseExplanation(state) {
    if (state.writeConcern === "wmajority" && !isReadOp(state.selectedOp)) {
      return `w:majority — response returned AFTER majority of replica set confirmed the write. Safer but slower (~${state.result.writeLatencyMs}ms).`;
    }
    if (state.writeConcern === "w1" && !isReadOp(state.selectedOp)) {
      return `w:1 — response returned IMMEDIATELY from primary. Fast (~${state.result.writeLatencyMs}ms) but replicas may not have the data yet.`;
    }
    if (state.readPreference === "majority" && isReadOp(state.selectedOp)) {
      const gotNew = state.replicaAckCount >= 2;
      return gotNew
        ? `readConcern:majority → NEW value returned ✓  (${state.replicaAckCount}/3 nodes confirmed — majority snapshot is current).`
        : `readConcern:majority → OLD value returned  (new write is on 1/3 nodes only — not majority-committed yet, so the safe old snapshot is served).`;
    }
    if (state.selectedOp === "join-query") {
      if (state.joinMode === "app-join")
        return `Two collections fetched via 2 round trips and merged in app layer. Total latency ~${state.result.readLatencyMs}ms. ⚠ N+1 query cost scales with dataset size.`;
      if (state.joinMode === "lookup")
        return `$lookup pipeline completed across ${state.nodeCount} shard(s). Aggregated result returned. Latency ~${state.result.readLatencyMs}ms. Cross-shard $lookup degrades as data spreads.`;
      if (state.joinMode === "denormalized")
        return `Single embedded document returned — no join needed. Data was co-located in one document. Latency ~${state.result.readLatencyMs}ms ✓`;
    }
    return `Response returned. Read: ~${state.result.readLatencyMs}ms, Write: ~${state.result.writeLatencyMs}ms.`;
  },

  getReplicationExplanation(state) {
    if (state.writeConcern === "wmajority")
      return `w:majority — Shard ${state.targetShardIdx + 1}'s primary waited for majority ack from secondaries BEFORE responding. Data is durable.`;
    return `w:1 — Shard ${state.targetShardIdx + 1}'s primary replicates AFTER the response was sent. If primary crashes now, the write could be lost.`;
  },

  reorderSteps(steps, state) {
    // w:majority → replication happens BEFORE db-response
    if (state.writeConcern === "wmajority" && !isReadOp(state.selectedOp)) {
      const repIdx = steps.findIndex((s) => s.key === "replication");
      const respIdx = steps.findIndex((s) => s.key === "db-response");
      if (repIdx > respIdx && repIdx >= 0 && respIdx >= 0) {
        const [rep] = steps.splice(repIdx, 1);
        steps.splice(respIdx, 0, rep);
      }
    }
    return steps;
  },

  /* ── Needs checklist ─────────────────────────────────── */

  evaluateNeeds(workload, state) {
    const mongoLevel =
      state.writeConcern === "wmajority" && state.readPreference === "majority"
        ? "strong"
        : state.writeConcern === "w1" && state.readPreference === "secondary"
          ? "eventual"
          : "quorum";

    if (workload === "banking") {
      return [
        {
          need: "Strong consistency",
          status:
            mongoLevel === "strong" || mongoLevel === "quorum"
              ? "warn"
              : "fail",
          note:
            mongoLevel === "strong"
              ? "w:majority + Majority reads — replication safe, but race conditions need atomic ops"
              : mongoLevel === "quorum"
                ? "Partial — enable Majority read mode; still needs atomic ops to prevent double-spend"
                : "w:1 + secondary reads can return stale data",
        },
        {
          need: "ACID transactions",
          status: "warn",
          note: "Multi-doc transactions exist but carry overhead and document-model semantics",
        },
        {
          need: "Correctness over speed",
          status: state.writeConcern === "wmajority" ? "warn" : "fail",
          note:
            state.writeConcern === "wmajority"
              ? "w:majority reduces loss risk but ledger semantics are weaker than relational"
              : "w:1 prioritises speed — dangerous for financial ledger data",
        },
      ];
    }
    if (workload === "ecommerce") {
      return [
        {
          need: "Flexible schema",
          status: "pass",
          note: "Document model natively supports evolving attributes per product",
        },
        {
          need: "Nested product data",
          status: "pass",
          note: "Embed variants, specs, and images directly in the document",
        },
        {
          need: "Read-heavy workload",
          status: "pass",
          note: "Rich compound indexes and aggregation pipeline scale reads well",
        },
      ];
    }
    // chat
    return [
      {
        need: "Massive write throughput",
        status: "warn",
        note: "Good throughput but plateaus against Cassandra at millions of writes/sec",
      },
      {
        need: "Partition-friendly reads",
        status: "warn",
        note: "Shard key design is critical; less natural than Cassandra partition keys",
      },
      {
        need: "High availability",
        status: "warn",
        note: "Replica sets give HA but failover election takes 10–30 s",
      },
    ];
  },

  /* ── Scene topology ──────────────────────────────────── */

  buildTopology(b, state, helpers) {
    const {
      nodes,
      targetShardIdx,
      selectedOp,
      readPreference,
      replicaAckCount,
      workload,
    } = state;
    const dbColors = this.colors;
    const phase = helpers.phase;
    const isReplicaAck = phase === "replica-ack";
    const H = 660; // match main.tsx canvas height

    const shardCount =
      targetShardIdx !== undefined
        ? Math.max(
            ...nodes
              .filter((n) => n.shardIdx !== undefined)
              .map((n) => n.shardIdx!),
          ) + 1
        : 1;
    const shardSpacingY = shardCount <= 2 ? 200 : 170;
    const shardStartY = H / 2 - ((shardCount - 1) * shardSpacingY) / 2;
    const shardKeyField =
      workload === "banking"
        ? "account_id"
        : workload === "ecommerce"
          ? "product_id"
          : "channel_id";

    for (let s = 0; s < shardCount; s++) {
      const sy = shardStartY + s * shardSpacingY;
      const shardNodes = nodes.filter((n) => n.shardIdx === s);
      const primary = shardNodes.find((n) => n.role === "primary");
      const secondaries = shardNodes.filter((n) => n.role === "secondary");
      const isTarget = isTargetedOp(selectedOp) && s === targetShardIdx;
      const isScatter = !isTargetedOp(selectedOp);
      const shardHighlighted = isTarget || isScatter;

      /* Shard background overlay */
      b.overlay((o: any) => {
        o.add(
          "rect",
          {
            x: 570,
            y: sy - 72,
            width: 350,
            height: 145,
            rx: 10,
            fill: shardHighlighted
              ? "rgba(34,197,94,0.05)"
              : "rgba(15,23,42,0.3)",
            stroke: shardHighlighted
              ? "rgba(34,197,94,0.25)"
              : "rgba(100,116,139,0.15)",
            strokeWidth: 1,
            strokeDasharray: "4,3",
          },
          { key: `shard-bg-${s}` },
        );
        o.add(
          "text",
          {
            x: 580,
            y: sy - 57,
            text: `Shard ${s + 1}  ·  ${shardKeyField} range`,
            fill: shardHighlighted ? "#86efac" : "#64748b",
            fontSize: 9,
            fontWeight: "600",
          },
          { key: `shard-label-${s}` },
        );
        if (isReplicaAck && isTarget) {
          const gotNew = replicaAckCount >= 2;
          o.add(
            "text",
            {
              x: 580,
              y: sy - 44,
              text: gotNew
                ? `MAJORITY: NEW value ✓  (${replicaAckCount}/3 nodes)`
                : `MAJORITY: OLD value  (1/3 — not yet committed)`,
              fill: gotNew ? "#22c55e" : "#f59e0b",
              fontSize: 9,
              fontWeight: "700",
            },
            { key: `shard-majority-${s}` },
          );
        }
      });

      /* Primary node */
      if (primary) {
        const px = 640;
        const py = sy - 20;
        const isHot = helpers.hot(primary.id);
        const statusColors = NODE_STATUS_COLORS[primary.status];

        b.node(primary.id)
          .at(px, py)
          .rect(120, 48, 8)
          .fill(
            isHot
              ? dbColors.fill
              : primary.status === "down"
                ? "#1c1917"
                : "#0f172a",
          )
          .stroke(
            primary.status === "down"
              ? statusColors.stroke
              : isHot
                ? dbColors.stroke
                : statusColors.stroke,
            2,
          )
          .richLabel(
            (l: any) => {
              l.color("PRIMARY", "#e2e8f0", { fontSize: 10, bold: true });
              l.newline();
              if (isReplicaAck && isTarget) {
                l.color("v2  NEW", "#22c55e", { fontSize: 8 });
              } else {
                l.color(
                  primary.status === "down" ? "OFFLINE" : `${primary.loadPct}%`,
                  primary.status === "down" ? "#ef4444" : "#94a3b8",
                  { fontSize: 8 },
                );
              }
            },
            { fill: "#fff", fontSize: 10, dy: 0, lineHeight: 1.6 },
          )
          .onClick(() => helpers.openConcept("mongodb"));

        const isMajorityResponse =
          phase === "db-response" &&
          isTarget &&
          readPreference === "majority" &&
          isReadOp(selectedOp);
        const majorityResponseColor = isMajorityResponse
          ? replicaAckCount >= 2
            ? "#22c55e"
            : "#f59e0b"
          : null;

        b.edge("query-layer", primary.id, `e-query-${primary.id}`)
          .stroke(
            majorityResponseColor ??
              (isHot
                ? dbColors.stroke
                : primary.status === "down"
                  ? "#7f1d1d"
                  : "#475569"),
            majorityResponseColor ? 2.5 : isHot ? 2.2 : 1.4,
          )
          .arrow(true);
      }

      /* Secondary nodes */
      secondaries.forEach((sec, si) => {
        const sx = 790 + si * 105;
        const sy2 = sy - 20;
        const isHot = helpers.hot(sec.id);
        const statusColors = NODE_STATUS_COLORS[sec.status];

        b.node(sec.id)
          .at(sx, sy2)
          .rect(95, 44, 8)
          .fill(
            isReplicaAck && isTarget
              ? replicaAckCount >= si + 2
                ? "#052e16"
                : "#1c0f00"
              : isHot
                ? dbColors.fill
                : sec.status === "down"
                  ? "#1c1917"
                  : "#0f172a",
          )
          .stroke(
            isReplicaAck && isTarget
              ? replicaAckCount >= si + 2
                ? "#22c55e"
                : "#b45309"
              : sec.status === "down"
                ? statusColors.stroke
                : isHot
                  ? dbColors.stroke
                  : "#334155",
            isReplicaAck && isTarget ? 1.8 : 1.5,
          )
          .richLabel(
            (l: any) => {
              l.color(`SEC ${si + 1}`, "#cbd5e1", {
                fontSize: 9,
                bold: true,
              });
              l.newline();
              if (isReplicaAck && isTarget) {
                const secHasNew = replicaAckCount >= si + 2;
                l.color(
                  secHasNew ? "v2  NEW" : "v1  OLD",
                  secHasNew ? "#22c55e" : "#f59e0b",
                  { fontSize: 8 },
                );
              } else {
                l.color(
                  sec.status === "down"
                    ? "OFF"
                    : sec.status === "lagging"
                      ? "LAG"
                      : `${sec.loadPct}%`,
                  sec.status === "down"
                    ? "#ef4444"
                    : sec.status === "lagging"
                      ? "#f59e0b"
                      : "#94a3b8",
                  { fontSize: 8 },
                );
              }
            },
            { fill: "#fff", fontSize: 9, dy: 0, lineHeight: 1.5 },
          )
          .onClick(() => helpers.openConcept("write-concern"));

        if (primary && sec.status !== "down" && primary.status !== "down") {
          b.edge(primary.id, sec.id, `rep-${primary.id}-${sec.id}`)
            .stroke("#334155", 1)
            .dashed()
            .arrow(true);
        }
      });
    }
  },

  buildAnnotationOverlays(b, state, helpers, viewW, _viewH) {
    const { selectedOp, joinMode } = state;
    const phase = helpers.phase;
    const isJoinMerge = phase === "join-merge";

    // Join-mode annotation
    if (selectedOp === "join-query") {
      const JOIN_MODE_META: Record<
        JoinMode,
        { text: string; fill: string; sub: string }
      > = {
        "app-join": {
          text: "App-side join — 2 sequential round trips",
          fill: "#f59e0b",
          sub: isJoinMerge ? "MERGING COLLECTIONS IN APPLICATION LAYER" : "",
        },
        lookup: {
          text: "$lookup aggregation pipeline — scatter-gather",
          fill: "#8b5cf6",
          sub: "",
        },
        denormalized: {
          text: "Denormalized — embedded document, no join needed",
          fill: "#22c55e",
          sub: "",
        },
      };
      const meta = JOIN_MODE_META[joinMode];
      b.overlay((o: any) => {
        o.add(
          "text",
          {
            x: viewW / 2,
            y: 22,
            text: meta.text,
            fill: meta.fill,
            fontSize: 11,
            fontWeight: "700",
          },
          { key: "join-mode-label" },
        );
        if (meta.sub) {
          o.add(
            "text",
            {
              x: viewW / 2,
              y: 40,
              text: meta.sub,
              fill: "#f97316",
              fontSize: 10,
              fontWeight: "700",
            },
            { key: "join-merge-label" },
          );
        }
      });
    }
  },

  getStatBadges(state) {
    const badges: StatBadgeConfig[] = [];
    badges.push({
      label: "Shards",
      value: `${state.result.shardsTouched}/${state.nodeCount}`,
      color: state.result.shardsTouched === 1 ? "#22c55e" : "#f59e0b",
    });
    if (state.selectedOp === "join-query") {
      badges.push({
        label: "Join",
        value:
          state.joinMode === "app-join"
            ? "App-side"
            : state.joinMode === "lookup"
              ? "$lookup"
              : "Embed'd",
        color:
          state.joinMode === "app-join"
            ? "#f59e0b"
            : state.joinMode === "lookup"
              ? "#a78bfa"
              : "#22c55e",
      });
    }
    badges.push({
      label: "RPO",
      value:
        state.result.rpoRisk === "high"
          ? "> 0"
          : state.result.rpoRisk === "low"
            ? "~low"
            : "≈ 0",
      color: state.result.rpoRisk === "none" ? "#22c55e" : "#ef4444",
    });
    badges.push({
      label: "Mode",
      value:
        state.writeConcern === "wmajority" &&
        state.readPreference === "majority"
          ? "Strong"
          : state.writeConcern === "w1" && state.readPreference === "secondary"
            ? "Eventual"
            : "Mixed",
      color:
        state.writeConcern === "wmajority" &&
        state.readPreference === "majority"
          ? "#22c55e"
          : state.writeConcern === "w1" && state.readPreference === "secondary"
            ? "#ef4444"
            : "#f59e0b",
    });
    return badges;
  },

  softReset(state) {
    if (state.nodeCount > 0) {
      state.targetShardIdx = Math.floor(Math.random() * state.nodeCount);
      state.replicaAckCount = Math.random() < 0.5 ? 1 : 2;
    }
  },

  defaultConsistency() {
    return deriveMongoConsistency("wmajority", "primary");
  },
};
