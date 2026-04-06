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

/* ── Adapter ───────────────────────────────────────────── */

export const cassandraAdapter: DbAdapter = {
  id: "cassandra",

  profile: {
    label: "Cassandra (Wide-Column)",
    shortLabel: "Cassandra",
    dataModel: "Partition-keyed wide rows",
    scaling: "Partition-based, multi-region",
    consistency: "eventual",
    strengths: [
      "Huge write throughput",
      "High availability",
      "Multi-region friendly",
      "Linear scale-out",
    ],
    weaknesses: [
      "Query-driven data modeling",
      "No ad-hoc joins",
      "Denormalization required",
      "Harder to reason about",
    ],
  },

  colors: { fill: "#422006", stroke: "#f59e0b" },

  dataModels: {
    banking: {
      model: "Query-driven tables: transactions_by_account",
      detail: [
        "transactions_by_account (account_id, ts, tx_id, amount) PK=(account_id, ts)",
        "account_balances (account_id, balance) — materialized view",
      ],
    },
    ecommerce: {
      model: "Query-driven tables: orders_by_user, products_by_category",
      detail: [
        "orders_by_user (user_id, order_ts, order_id, items) PK=(user_id, order_ts)",
        "products_by_category (category, product_id, name, price) PK=(category, product_id)",
      ],
    },
    chat: {
      model: "Partition-keyed: messages_by_channel",
      detail: [
        "messages_by_channel (channel_id, ts, sender, body) PK=(channel_id, ts)",
        "channels_by_user (user_id, channel_id, last_msg_ts) PK=(user_id)",
      ],
    },
  },

  fitScores: { banking: 20, ecommerce: 55, chat: 92 },

  whyText: {
    banking:
      "Very risky — eventual consistency and lack of transactions make it dangerous for financial correctness.",
    ecommerce:
      "Query-driven modeling works for reads, but cross-entity queries (user + orders) require heavy denormalization.",
    chat: "High write throughput, partition-key access patterns, and multi-region replication make Cassandra ideal for messaging at scale.",
  },

  maxNodes: 5,

  buildNodes(count, failedIdx) {
    return Array.from({ length: count }, (_, i) => ({
      id: `db-node-${i}`,
      role: "replica" as const,
      status: (i === failedIdx ? "down" : "up") as "up" | "down",
      loadPct:
        i === failedIdx
          ? 0
          : Math.round(100 / Math.max(1, count - (failedIdx !== null ? 1 : 0))),
    }));
  },

  pickFailureTarget(state) {
    return state.nodeCount >= 2 ? state.nodeCount - 1 : 0;
  },

  baseLatencies: {
    read: 4,
    write: 3,
    throughput: 15000,
    scaleFactor: 0.85,
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
      base.readDelta = 45; // scatter across partitions
      base.nodesTouched = Math.min(nodeCount, 3);
    }
    if (op === "aggregate") {
      base.readDelta = 55;
      base.nodesTouched = nodeCount;
    }
    if (op === "burst-write") {
      base.writeDelta = 3 * 0.5; // 1.5× base write
      base.throughputMultiplier = 2.5;
    }
    if (op === "read-after-write" && state.consistencyLevel === "eventual") {
      base.staleReadRisk = true;
      base.readDelta = 2;
    }
    return base;
  },

  availability(nodeCount, failedNode) {
    if (!failedNode) return 99;
    return nodeCount >= 3 ? 96 : 85;
  },

  complexity(nodeCount, consistency) {
    let c = 5; // base 2 + 3 for cassandra
    if (nodeCount >= 4) c += 1;
    if (consistency === "strong") c += 1;
    if (consistency === "eventual") c += 1;
    return Math.max(1, Math.min(10, c));
  },

  failureImpact: { writeOverhead: 3, throughputFactor: 0.88 },

  rpoRto(state, failedNode) {
    return {
      rpoRisk:
        state.consistencyLevel === "eventual"
          ? "high"
          : state.consistencyLevel === "quorum"
            ? "low"
            : "none",
      rtoMs: failedNode ? 1000 : 0,
    };
  },

  refineMetrics(state, metrics) {
    // Cassandra: nodesTouched = RF for most ops
    const rf = Math.min(state.replicationFactor, state.nodeCount);
    if (state.selectedOp === "aggregate") {
      metrics.nodesTouched = state.nodeCount; // full scatter
    } else if (state.selectedOp === "join-query") {
      metrics.nodesTouched = Math.min(state.nodeCount, rf + 1);
    } else {
      metrics.nodesTouched = rf;
    }
  },

  applyPostBuildMutations(state) {
    // Mark a replica as lagging for read-after-write + eventual
    if (
      state.consistencyLevel === "eventual" &&
      state.selectedOp === "read-after-write" &&
      state.nodes.length >= 2
    ) {
      const replicaIdx = state.nodes.findIndex(
        (n, i) => n.status === "up" && i !== 0,
      );
      if (replicaIdx >= 0) state.nodes[replicaIdx].status = "lagging";
    }
  },

  /* ── Token expansion ─────────────────────────────────── */

  expandToken(token, state) {
    if (token === "$coordinator") {
      const idx = state.coordinatorIdx % state.nodes.length;
      const node = state.nodes[idx];
      return node && node.status !== "down"
        ? [node.id]
        : state.nodes
            .filter((n) => n.status !== "down")
            .slice(0, 1)
            .map((n) => n.id);
    }
    if (token === "$keyOwner") {
      const idx = state.keyOwnerIdx % state.nodes.length;
      const node = state.nodes[idx];
      return node && node.status !== "down"
        ? [node.id]
        : state.nodes
            .filter((n) => n.status !== "down")
            .slice(0, 1)
            .map((n) => n.id);
    }
    if (token === "$rfReplicas") {
      const n = state.nodes.length;
      const rf = Math.min(state.replicationFactor, n);
      const koIdx = state.keyOwnerIdx % n;
      const ids: string[] = [];
      for (let r = 1; r < rf; r++) {
        const ri = (koIdx + r) % n;
        if (state.nodes[ri].status !== "down") ids.push(state.nodes[ri].id);
      }
      return ids;
    }
    if (token === "$rfAll") {
      const n = state.nodes.length;
      const rf = Math.min(state.replicationFactor, n);
      const koIdx = state.keyOwnerIdx % n;
      const ids: string[] = [];
      for (let r = 0; r < rf; r++) {
        const ri = (koIdx + r) % n;
        if (state.nodes[ri].status !== "down") ids.push(state.nodes[ri].id);
      }
      return ids;
    }
    if (token === "$clAckNodes") {
      const n = state.nodes.length;
      const rf = Math.min(state.replicationFactor, n);
      const koIdx = state.keyOwnerIdx % n;
      const cl = state.consistencyLevel;
      const ackCount =
        cl === "strong" ? rf : cl === "quorum" ? Math.floor(rf / 2) + 1 : 1;
      const ids: string[] = [];
      for (let r = 0; r < rf && ids.length < ackCount; r++) {
        const ri = (koIdx + r) % n;
        if (state.nodes[ri].status !== "down") ids.push(state.nodes[ri].id);
      }
      return ids;
    }
    return null; // not handled
  },

  /* ── Flow beats ──────────────────────────────────────── */

  getRouteFlows(state) {
    const flows: FlowBeat[] = [];
    flows.push({
      from: "query-layer",
      to: "$coordinator",
      duration: 550,
      explain:
        "Client connects to any node — it becomes the coordinator for this request.",
    });
    // Reads: coordinator reads from CL-appropriate replicas
    if (
      isReadOp(state.selectedOp) &&
      state.replicationFactor >= 1 &&
      state.nodes.filter((nd) => nd.status !== "down").length >= 1
    ) {
      flows.push({
        from: "$coordinator",
        to: "$clAckNodes",
        duration: 600,
        explain:
          "Coordinator hashes the key → finds replicas on the ring → reads from CL nodes.",
      });
    }
    return flows;
  },

  getResponseFlows(state) {
    const flows: FlowBeat[] = [];
    if (
      state.replicationFactor >= 1 &&
      state.nodes.filter((nd) => nd.status !== "down").length >= 1
    ) {
      flows.push({
        from: "$clAckNodes",
        to: "$coordinator",
        duration: 500,
        explain:
          "CL-required replicas acknowledge — coordinator can now respond.",
      });
    }
    flows.push({
      from: "$coordinator",
      to: "query-layer",
      duration: 600,
    });
    return flows;
  },

  getReplicationFlows(state) {
    if (
      state.replicationFactor < 1 ||
      state.nodes.filter((n) => n.status !== "down").length < 1
    )
      return [];
    return [
      {
        from: "$coordinator",
        to: "$rfAll",
        duration: 800,
        explain:
          "Coordinator sends the write to ALL RF replicas in parallel. Every replica stores its own primary range AND replicas of other ranges.",
      },
    ];
  },

  getRouteExplanation(state) {
    return `Client connects to Node ${(state.coordinatorIdx % state.nodeCount) + 1} — it becomes the coordinator for this request.`;
  },

  getResponseExplanation(state) {
    const rf = Math.min(state.replicationFactor, state.nodeCount);
    const clName =
      state.consistencyLevel === "strong"
        ? "ALL"
        : state.consistencyLevel === "quorum"
          ? "QUORUM"
          : "ONE";
    const ackCount =
      state.consistencyLevel === "strong"
        ? rf
        : state.consistencyLevel === "quorum"
          ? Math.floor(rf / 2) + 1
          : 1;
    if (isReadOp(state.selectedOp)) {
      return `CL=${clName}: coordinator read from ${ackCount} replica(s) and returned the latest value. Read: ~${state.result.readLatencyMs}ms.`;
    }
    return `CL=${clName}: coordinator received ${ackCount}/${rf} acks → success returned.${ackCount < rf ? ` Remaining ${rf - ackCount} replica(s) complete their writes asynchronously (hinted handoff / read repair).` : ""} Write: ~${state.result.writeLatencyMs}ms.`;
  },

  getReplicationExplanation(state) {
    const rf = Math.min(state.replicationFactor, state.nodeCount);
    const koNode = state.keyOwnerIdx % state.nodeCount;
    const rfNodes = Array.from(
      { length: rf },
      (_, r) => ((koNode + r) % state.nodeCount) + 1,
    );
    const clName =
      state.consistencyLevel === "strong"
        ? "ALL"
        : state.consistencyLevel === "quorum"
          ? "QUORUM"
          : "ONE";
    const ackCount =
      state.consistencyLevel === "strong"
        ? rf
        : state.consistencyLevel === "quorum"
          ? Math.floor(rf / 2) + 1
          : 1;
    return `Coordinator writes to ALL ${rf} replicas in parallel: [${rfNodes.join(" → ")}]. Each node stores its own token range + replicas of adjacent ranges. CL=${clName} → coordinator waits for ${ackCount}/${rf} acks before responding.`;
  },

  reorderSteps(steps, state) {
    // Cassandra writes: coordinator writes to ALL replicas first, THEN returns acks
    if (!isReadOp(state.selectedOp)) {
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
    const cassLevel =
      state.consistencyLevel === "strong"
        ? "strong"
        : state.consistencyLevel === "quorum"
          ? "quorum"
          : "eventual";

    if (workload === "banking") {
      return [
        {
          need: "Strong consistency",
          status:
            cassLevel === "strong"
              ? "warn"
              : cassLevel === "quorum"
                ? "warn"
                : "fail",
          note:
            cassLevel === "strong"
              ? "CL=ALL — coordinator waits for ALL replicas to ack. Reads all replicas. Strong per-partition, but no cross-partition ACID."
              : cassLevel === "quorum"
                ? "CL=QUORUM — majority of replicas must ack. Overlapping write+read quorums guarantee you read the latest write."
                : "CL=ONE — only 1 replica acks the write. Other replicas may lag. Reads may return stale data.",
        },
        {
          need: "ACID transactions",
          status: "fail",
          note: "No cross-partition transactions — LWT is limited and slow",
        },
        {
          need: "Correctness over speed",
          status:
            cassLevel === "strong" || cassLevel === "quorum" ? "warn" : "fail",
          note:
            cassLevel === "strong"
              ? "CL=ALL gives durability guarantees per-partition, but lacks multi-row atomicity"
              : cassLevel === "quorum"
                ? "CL=QUORUM balances speed and safety — not sufficient for strict ledger guarantees"
                : "CL=ONE — writes return before all replicas confirm. Data loss risk on node failure.",
        },
      ];
    }
    if (workload === "ecommerce") {
      return [
        {
          need: "Flexible schema",
          status: "warn",
          note: "Wide-column allows adding columns; no nested structures",
        },
        {
          need: "Nested product data",
          status: "fail",
          note: "Flat rows only — nesting must be pre-denormalised",
        },
        {
          need: "Read-heavy workload",
          status: "warn",
          note: "Scales for reads only when the partition key matches — range queries require extra tables",
        },
      ];
    }
    // chat
    return [
      {
        need: "Massive write throughput",
        status: "pass",
        note: "Log-structured storage + distributed ring — built for exactly this",
      },
      {
        need: "Partition-friendly reads",
        status: "pass",
        note: "Partition key is first-class — every read is partition-scoped by design",
      },
      {
        need: "High availability",
        status: "pass",
        note: "Peer-to-peer, no primary — multi-DC replication and 99.99% HA out of the box",
      },
    ];
  },

  /* ── Scene topology ──────────────────────────────────── */

  buildTopology(b, state, helpers) {
    const { nodes } = state;
    const dbColors = this.colors;
    const phase = helpers.phase;
    const selectedOp = helpers.selectedOp;
    const H = 660;

    const ringNodeCount = nodes.length;
    const rf = Math.min(state.replicationFactor, ringNodeCount);
    const coordIdx = state.coordinatorIdx % Math.max(1, ringNodeCount);
    const coordId = nodes[coordIdx]?.id ?? "db-node-0";
    const koIdx = state.keyOwnerIdx % Math.max(1, ringNodeCount);

    // Progressive reveal: show roles only once the step has reached them
    const ROUTE_PHASES = new Set([
      "partition-route",
      "replication",
      "response",
      "stale",
      "consistent",
      "summary",
    ]);
    const FANOUT_PHASES = new Set([
      "replication",
      "response",
      "stale",
      "consistent",
      "summary",
    ]);
    const showCoordLabel = ROUTE_PHASES.has(phase);
    const showRfLabels =
      FANOUT_PHASES.has(phase) ||
      (phase === "partition-route" && isReadOp(selectedOp));

    // RF replica indices
    const rfIndices: number[] = [];
    for (let r = 0; r < rf; r++) {
      rfIndices.push((koIdx + r) % ringNodeCount);
    }
    const rfSet = new Set(rfIndices);

    // Token ring helpers
    const TOKEN_SPACE = 1000;
    const tokenOf = (idx: number) =>
      Math.round((idx * TOKEN_SPACE) / ringNodeCount);
    const ownedRangeLabel = (idx: number) =>
      idx === 0
        ? `${tokenOf(ringNodeCount - 1)}\u21ba`
        : `${tokenOf(idx - 1)}\u2013${tokenOf(idx)}`;
    const arcMidAngle = (idx: number) =>
      -Math.PI / 2 +
      (idx - 0.5 + (idx === 0 ? ringNodeCount : 0)) *
        ((2 * Math.PI) / ringNodeCount);

    // Ring geometry
    const cx = 730;
    const cy = H / 2 - 10;
    const R = ringNodeCount <= 3 ? 135 : ringNodeCount <= 4 ? 145 : 155;
    const nodeW = 125;
    const nodeH = 64;

    // Ring circle overlay
    b.overlay((o: any) => {
      o.add(
        "circle",
        {
          x: cx,
          y: cy,
          r: R - 15,
          fill: "none",
          stroke: "rgba(245,158,11,0.12)",
          strokeWidth: 1.5,
          strokeDasharray: "6,4",
        },
        { key: "hash-ring" },
      );
      o.add(
        "text",
        {
          x: cx,
          y: cy - 8,
          text: "Hash Ring",
          fill: "rgba(245,158,11,0.3)",
          fontSize: 10,
          fontWeight: "600",
        },
        { key: "ring-label" },
      );
    });

    // Token boundary labels + arc labels + hash-key landing dot
    b.overlay((o: any) => {
      for (let i = 0; i < ringNodeCount; i++) {
        const nodeAngle = -Math.PI / 2 + i * ((2 * Math.PI) / ringNodeCount);
        const isKo = i === koIdx;

        o.add(
          "text",
          {
            x: cx + (R + 18) * Math.cos(nodeAngle),
            y: cy + (R + 18) * Math.sin(nodeAngle),
            text: `T:${tokenOf(i)}`,
            fill: showRfLabels && isKo ? "#f97316" : "rgba(245,158,11,0.55)",
            fontSize: 8,
            fontWeight: "700",
          },
          { key: `tok-${i}` },
        );

        const mid = arcMidAngle(i);
        o.add(
          "text",
          {
            x: cx + (R - 34) * Math.cos(mid),
            y: cy + (R - 34) * Math.sin(mid),
            text: ownedRangeLabel(i),
            fill:
              showRfLabels && isKo
                ? "rgba(249,115,22,0.9)"
                : "rgba(245,158,11,0.32)",
            fontSize: 8,
            fontWeight: showRfLabels && isKo ? "700" : "400",
          },
          { key: `arc-${i}` },
        );
      }

      if (showRfLabels) {
        const koAngle = -Math.PI / 2 + koIdx * ((2 * Math.PI) / ringNodeCount);
        o.add(
          "circle",
          {
            x: cx + (R - 15) * Math.cos(koAngle),
            y: cy + (R - 15) * Math.sin(koAngle),
            r: 5,
            fill: "#f97316",
            stroke: "#fff",
            strokeWidth: 1,
          },
          { key: "hash-land-dot" },
        );
      }
    });

    // Position nodes on ring
    nodes.forEach((node, i) => {
      const angle = -Math.PI / 2 + i * ((2 * Math.PI) / ringNodeCount);
      const nx = cx + R * Math.cos(angle) - nodeW / 2;
      const ny = cy + R * Math.sin(angle) - nodeH / 2;

      const isCoord = i === coordIdx;
      const isKeyOwner = i === koIdx;
      const isRf = rfSet.has(i);
      const statusColors = NODE_STATUS_COLORS[node.status];
      const isHot = helpers.hot(node.id);

      // Progressive role label
      const roleLabel =
        showCoordLabel && showRfLabels && isCoord && isKeyOwner
          ? "COORD \u00b7 KEY"
          : showCoordLabel && isCoord
            ? "COORDINATOR"
            : showRfLabels && isKeyOwner
              ? "KEY OWNER"
              : showRfLabels && isRf
                ? "RF Replica"
                : `Node ${i + 1}`;
      const statusLabel =
        node.status === "down"
          ? "OFFLINE"
          : node.status === "lagging"
            ? "LAGGING"
            : `${node.loadPct}%`;

      const revealCoord = showCoordLabel && isCoord;
      const revealKo = showRfLabels && isKeyOwner;
      const revealRf = showRfLabels && isRf;

      b.node(node.id)
        .at(nx, ny)
        .rect(nodeW, nodeH, 10)
        .fill(
          node.status === "down"
            ? "#1c1917"
            : isHot
              ? dbColors.fill
              : revealKo
                ? "rgba(120,53,15,0.7)"
                : revealRf
                  ? "rgba(66,32,6,0.5)"
                  : "#0f172a",
        )
        .stroke(
          node.status === "down"
            ? statusColors.stroke
            : revealKo
              ? "#f97316"
              : revealCoord
                ? "#fbbf24"
                : isHot
                  ? dbColors.stroke
                  : revealRf
                    ? "rgba(245,158,11,0.45)"
                    : statusColors.stroke,
          revealKo || revealCoord ? 2.5 : 2,
        )
        .richLabel(
          (l: any) => {
            l.color(
              roleLabel,
              revealKo ? "#f97316" : revealCoord ? "#fbbf24" : "#e2e8f0",
              {
                fontSize: 10,
                bold: true,
              },
            );
            l.newline();
            l.color(
              statusLabel,
              node.status === "down"
                ? "#ef4444"
                : node.status === "lagging"
                  ? "#f59e0b"
                  : "#94a3b8",
              { fontSize: 9 },
            );
          },
          { fill: "#fff", fontSize: 10, dy: 0, lineHeight: 1.5 },
        )
        .onClick(() => helpers.openConcept("token-ring"));
    });

    // Edge: query-layer → coordinator
    if (showCoordLabel && nodes[coordIdx]?.status !== "down") {
      b.edge("query-layer", coordId, `e-query-${coordId}`)
        .stroke(helpers.hot(coordId) ? "#fbbf24" : "#78350f", 2)
        .arrow(true);
    }

    // Edges: coordinator → each RF node
    if (showRfLabels) {
      rfIndices.forEach((ri) => {
        if (
          ri !== coordIdx &&
          nodes[ri]?.status !== "down" &&
          nodes[coordIdx]?.status !== "down"
        ) {
          b.edge(coordId, nodes[ri].id, `e-coord-${nodes[ri].id}`)
            .stroke(
              ri === koIdx ? "rgba(249,115,22,0.5)" : "rgba(245,158,11,0.4)",
              1.4,
            )
            .arrow(true);
        }
      });
    }

    // Ring gossip edges
    if (ringNodeCount >= 2) {
      const coordRfEdges = new Set(
        rfIndices
          .filter((ri) => ri !== coordIdx)
          .map((ri) => `${coordIdx}-${ri}`),
      );
      for (let i = 0; i < ringNodeCount; i++) {
        const next = (i + 1) % ringNodeCount;
        if (
          nodes[i].status !== "down" &&
          nodes[next].status !== "down" &&
          !coordRfEdges.has(`${i}-${next}`)
        ) {
          b.edge(nodes[i].id, nodes[next].id, `ring-${i}-${next}`)
            .stroke("rgba(120,53,15,0.5)", 1)
            .dashed();
        }
      }
    }
  },

  buildAnnotationOverlays(b, state, helpers, viewW, _viewH) {
    const { nodes, consistencyLevel, replicationFactor } = state;
    const phase = helpers.phase;
    const selectedOp = helpers.selectedOp;

    if (phase !== "" && phase !== "data-model" && phase !== "request") {
      const rf = Math.min(replicationFactor, nodes.length);
      const koIdx = state.keyOwnerIdx % Math.max(1, nodes.length);
      const coordNode = (state.coordinatorIdx % Math.max(1, nodes.length)) + 1;
      const rfNodeLabels = Array.from(
        { length: rf },
        (_, r) => `N${((koIdx + r) % nodes.length) + 1}`,
      );
      const clName =
        consistencyLevel === "strong"
          ? "ALL"
          : consistencyLevel === "quorum"
            ? "QUORUM"
            : "ONE";
      const acksNeeded =
        consistencyLevel === "strong"
          ? rf
          : consistencyLevel === "quorum"
            ? Math.floor(rf / 2) + 1
            : 1;

      const showFanout =
        phase === "replication" ||
        phase === "response" ||
        phase === "summary" ||
        (phase === "partition-route" && isReadOp(selectedOp));
      const text = showFanout
        ? `Coord: N${coordNode}  ·  hash(key) → N${koIdx + 1}  ·  RF=[${rfNodeLabels.join(" → ")}]  ·  CL=${clName} (${acksNeeded}/${rf} acks)`
        : `Coord: N${coordNode}  ·  CL=${clName}`;

      b.overlay((o: any) => {
        o.add(
          "text",
          {
            x: viewW / 2,
            y: 22,
            text,
            fill: "#fbbf24",
            fontSize: 11,
            fontWeight: "700",
          },
          { key: "cassandra-cl-label" },
        );
      });
    }
  },

  getStatBadges(state) {
    const badges: StatBadgeConfig[] = [];
    badges.push({
      label: "RF",
      value: Math.min(state.replicationFactor, state.nodeCount),
      color: "#fbbf24",
    });

    const _rf = Math.min(state.replicationFactor, state.nodeCount);
    const _acks =
      state.consistencyLevel === "strong"
        ? _rf
        : state.consistencyLevel === "quorum"
          ? Math.floor(_rf / 2) + 1
          : 1;
    const _rPlusW = _acks * 2;
    const _mode =
      _rPlusW > _rf ? "Strong" : _rPlusW === _rf ? "Mixed" : "Eventual";
    const _color =
      _mode === "Strong"
        ? "#22c55e"
        : _mode === "Mixed"
          ? "#f59e0b"
          : "#ef4444";
    badges.push({ label: "MODE", value: _mode, color: _color });

    badges.push({
      label: "Coord",
      value: `Node ${(state.coordinatorIdx % Math.max(1, state.nodeCount)) + 1}`,
      color: "#fbbf24",
    });
    return badges;
  },

  softReset(state) {
    if (state.nodeCount > 0) {
      state.coordinatorIdx = Math.floor(Math.random() * state.nodeCount);
      state.keyOwnerIdx = Math.floor(Math.random() * state.nodeCount);
    }
  },

  defaultConsistency() {
    return "eventual";
  },
};
