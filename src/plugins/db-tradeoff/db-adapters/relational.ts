import type {
  DbAdapter,
  OpAdjustment,
  StatBadgeConfig,
} from "./types";

/* ── Node status helpers (shared colours for scene) ───── */

const NODE_STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  up: { fill: "#0f3b2e", stroke: "#10b981" },
  down: { fill: "#7f1d1d", stroke: "#ef4444" },
  lagging: { fill: "#78350f", stroke: "#f59e0b" },
};

/* ── Helpers ───────────────────────────────────────────── */

const isReadOp = (op: string) =>
  op === "point-read" ||
  op === "join-query" ||
  op === "aggregate" ||
  op === "read-after-write";

/** Map consistency level to PostgreSQL replication behaviour. */
const replicationMode = (
  cl: string,
): "sync" | "quorum-sync" | "async" =>
  cl === "strong" ? "sync" : cl === "quorum" ? "quorum-sync" : "async";

/* ── Adapter ───────────────────────────────────────────── */

export const relationalAdapter: DbAdapter = {
  id: "relational",

  profile: {
    label: "PostgreSQL (Relational)",
    shortLabel: "PostgreSQL",
    dataModel: "Normalized tables with foreign keys",
    scaling: "Vertical (scale-up), limited horizontal",
    consistency: "strong",
    strengths: [
      "ACID transactions",
      "Rich joins & SQL",
      "Strong consistency",
      "Mature ecosystem",
    ],
    weaknesses: [
      "Harder horizontal scaling",
      "Schema rigidity",
      "Write throughput ceiling",
    ],
  },

  colors: { fill: "#172554", stroke: "#3b82f6" },

  dataModels: {
    banking: {
      model: "Normalized tables: accounts, transactions, ledger_entries",
      detail: [
        "accounts (id, balance, owner_id)",
        "transactions (id, from_account, to_account, amount, ts)",
        "ledger_entries (id, tx_id, debit, credit)",
      ],
    },
    ecommerce: {
      model: "Normalized tables: users, products, orders, order_items",
      detail: [
        "users (id, name, email)",
        "products (id, name, price, attributes JSONB)",
        "orders (id, user_id, created_at)",
        "order_items (id, order_id, product_id, qty)",
      ],
    },
    chat: {
      model: "Normalized tables: users, channels, messages",
      detail: [
        "users (id, name)",
        "channels (id, name, type)",
        "messages (id, channel_id, sender_id, body, ts)",
      ],
    },
  },

  fitScores: { banking: 95, ecommerce: 65, chat: 40 },

  whyText: {
    banking:
      "Strong ACID transactions and referential integrity make relational DBs the safest fit for ledger-critical workloads.",
    ecommerce:
      "Joins across products, orders, and users work well, but flexible product attributes need JSONB workarounds.",
    chat: "Writes hit a ceiling fast. Scaling message tables across billions of rows requires careful partitioning.",
  },

  maxNodes: 5,

  buildNodes(count, failedIdx) {
    const liveCount = Math.max(1, count - (failedIdx !== null ? 1 : 0));
    return Array.from({ length: count }, (_, i) => ({
      id: `db-node-${i}`,
      role: (i === 0 ? "primary" : "secondary") as "primary" | "secondary",
      status: (i === failedIdx ? "down" : "up") as "up" | "down",
      loadPct:
        i === failedIdx
          ? 0
          : i === 0
            ? Math.round(60 + 30 / liveCount) // primary handles all writes + reads
            : Math.round(30 + 20 / liveCount), // replicas handle read-offload only
    }));
  },

  pickFailureTarget(state) {
    return state.nodeCount >= 2 ? state.nodeCount - 1 : 0;
  },

  baseLatencies: {
    read: 8,
    write: 12,
    throughput: 2000,
    scaleFactor: 0.15,
  },

  opAdjustment(op, state) {
    const base: OpAdjustment = {
      readDelta: 0,
      writeDelta: 0,
      throughputMultiplier: 1,
      nodesTouched: 1,
      staleReadRisk: false,
    };
    if (op === "join-query") {
      base.readDelta = 7;
      base.nodesTouched = 1;
    }
    if (op === "aggregate") {
      base.readDelta = 18;
      base.nodesTouched = 1;
    }
    if (op === "burst-write") {
      base.writeDelta = 12 * 0.5;
      base.throughputMultiplier = 0.7;
    }
    /* read-after-write: stale risk when reading from an async replica */
    if (op === "read-after-write" && state.consistencyLevel === "eventual") {
      base.staleReadRisk = true;
      base.readDelta = -2; // replica read slightly faster (no primary contention)
    }
    return base;
  },

  availability(nodeCount, failedNode) {
    if (!failedNode) return 99;
    if (nodeCount >= 3) return 85; // multiple promotion candidates
    if (nodeCount >= 2) return 75; // single failover target
    return 15; // complete outage — single point of failure
  },

  complexity(nodeCount, consistency) {
    let c = 2;
    if (nodeCount >= 3) c += 1;
    if (nodeCount >= 5) c += 1;
    if (consistency === "strong" && nodeCount >= 2) c += 1; // sync replication overhead
    return Math.max(1, Math.min(10, c));
  },

  failureImpact: { writeOverhead: 35, throughputFactor: 0.5 },

  rpoRto(state, failedNode) {
    if (!failedNode) return { rpoRisk: "none" as const, rtoMs: 0 };
    const mode = replicationMode(state.consistencyLevel);
    if (state.nodeCount < 2) return { rpoRisk: "high" as const, rtoMs: 30000 };
    if (mode === "sync") return { rpoRisk: "none" as const, rtoMs: 15000 };
    if (mode === "quorum-sync")
      return { rpoRisk: "low" as const, rtoMs: 12000 };
    return { rpoRisk: "low" as const, rtoMs: 10000 };
  },

  refineMetrics(state, metrics) {
    const mode = replicationMode(state.consistencyLevel);
    const replicaCount = Math.max(0, state.nodeCount - 1);

    /* Synchronous replication: primary waits for replica WAL flush */
    if (mode === "sync" && replicaCount > 0) {
      metrics.writeMs += 6;
      metrics.nodesTouched = state.nodeCount;
      metrics.staleReadRisk = false;
    } else if (mode === "quorum-sync" && replicaCount > 0) {
      metrics.writeMs += 3;
      metrics.nodesTouched = Math.ceil(state.nodeCount / 2) + 1;
    } else if (
      mode === "async" &&
      replicaCount > 0 &&
      isReadOp(state.selectedOp)
    ) {
      metrics.readMs -= 2; // read from nearby replica
      metrics.staleReadRisk = true;
    }

    /* Read replicas spread read load (not in sync mode — all go to primary) */
    if (isReadOp(state.selectedOp) && replicaCount > 0 && mode !== "sync") {
      metrics.readMs -= Math.min(3, replicaCount);
    }
  },

  applyPostBuildMutations(state) {
    /* Mark one replica as lagging during read-after-write + eventual consistency */
    if (
      state.selectedOp === "read-after-write" &&
      state.consistencyLevel === "eventual" &&
      state.nodeCount >= 2
    ) {
      const replicas = state.nodes.filter(
        (n) => n.role !== "primary" && n.status !== "down",
      );
      if (replicas.length > 0) {
        replicas[replicas.length - 1].status = "lagging";
      }
    }
  },

  expandToken(token, state) {
    if (token === "$primary") {
      const p = state.nodes.find((n) => n.role === "primary");
      return p ? [p.id] : [state.nodes[0]?.id ?? "db-node-0"];
    }
    if (token === "$replicas") {
      const r = state.nodes.filter(
        (n) => n.role !== "primary" && n.status !== "down",
      );
      return r.length
        ? r.map((n) => n.id)
        : [state.nodes[0]?.id ?? "db-node-0"];
    }
    if (token === "$allNodes") {
      return state.nodes.filter((n) => n.status !== "down").map((n) => n.id);
    }
    /* $readTarget — where reads actually land based on consistency mode */
    if (token === "$readTarget") {
      if (state.consistencyLevel === "eventual") {
        const replica = state.nodes.find(
          (n) => n.role !== "primary" && n.status === "up",
        );
        return replica ? [replica.id] : [state.nodes[0]?.id ?? "db-node-0"];
      }
      const p = state.nodes.find((n) => n.role === "primary");
      return p ? [p.id] : [state.nodes[0]?.id ?? "db-node-0"];
    }
    /* $walTarget — first live replica (for WAL stream highlight) */
    if (token === "$walTarget") {
      const first = state.nodes.find(
        (n) => n.role !== "primary" && n.status !== "down",
      );
      return first ? [first.id] : [];
    }
    return null;
  },

  /* ── Flow beats ──────────────────────────────────────── */

  getRouteFlows(state) {
    const read = isReadOp(state.selectedOp);

    /* Eventual-consistency reads go to a replica when available */
    if (read && state.consistencyLevel === "eventual" && state.nodeCount >= 2) {
      return [
        {
          from: "query-layer",
          to: "$readTarget",
          duration: 600,
          explain:
            "Read routed to a streaming replica — offloads the primary.",
        },
      ];
    }

    /* All writes and strong/quorum reads go to the primary */
    return [
      {
        from: "query-layer",
        to: "$primary",
        duration: 700,
        explain: read
          ? "Read routed to the primary for guaranteed consistency."
          : "Write routed to the primary — the only node that accepts writes.",
      },
    ];
  },

  getResponseFlows(state) {
    const read = isReadOp(state.selectedOp);
    if (read && state.consistencyLevel === "eventual" && state.nodeCount >= 2) {
      return [{ from: "$readTarget", to: "query-layer", duration: 500 }];
    }
    return [{ from: "$primary", to: "query-layer", duration: 600 }];
  },

  getReplicationFlows(state) {
    if (state.nodeCount < 2 || isReadOp(state.selectedOp)) return [];
    const mode = replicationMode(state.consistencyLevel);
    const rc = Math.max(0, state.nodeCount - 1);
    return [
      {
        from: "$primary",
        to: "$replicas",
        duration: mode === "sync" ? 1000 : 800,
        explain:
          mode === "sync"
            ? `Synchronous replication: primary waits for all ${rc} replica(s) to flush WAL before confirming. Zero data loss, higher latency.`
            : mode === "quorum-sync"
              ? `Quorum-sync: primary waits for ${Math.ceil(rc / 2)} of ${rc} replica(s) to acknowledge. Balances safety and speed.`
              : `Async streaming: WAL segments shipped to ${rc} replica(s) without waiting. Fast writes, but latest transactions at risk on crash.`,
      },
    ];
  },

  getRouteExplanation(state) {
    const read = isReadOp(state.selectedOp);
    const mode = replicationMode(state.consistencyLevel);
    if (read && mode === "async" && state.nodeCount >= 2) {
      return `Read routed to replica. Latency: ~${state.result.readLatencyMs}ms — data may lag the primary by a few seconds.`;
    }
    if (read) {
      return `Read routed to primary (${mode === "sync" ? "synchronous" : "quorum"} mode). Latency: ~${state.result.readLatencyMs}ms — guaranteed fresh.`;
    }
    return `Write routed to primary. WAL write + fsync → ~${state.result.writeLatencyMs}ms. All writes must pass through this single node.`;
  },

  getResponseExplanation(state) {
    const mode = replicationMode(state.consistencyLevel);
    const read = isReadOp(state.selectedOp);
    if (read && mode === "async" && state.nodeCount >= 2) {
      return `Replica responds. Read: ~${state.result.readLatencyMs}ms. ${state.result.staleReadRisk ? "⚠ Stale data possible — replica may lag the primary." : "Data appears current."}`;
    }
    return `Primary responds. Read: ~${state.result.readLatencyMs}ms, Write: ~${state.result.writeLatencyMs}ms. ACID guarantees hold.`;
  },

  getReplicationExplanation(state) {
    const mode = replicationMode(state.consistencyLevel);
    const rc = Math.max(0, state.nodeCount - 1);
    if (mode === "sync") {
      return `Synchronous replication to ${rc} replica(s) complete — primary waited for WAL flush confirmation. RPO ≈ 0 (zero data loss).`;
    }
    if (mode === "quorum-sync") {
      return `Quorum-sync: ${Math.ceil(rc / 2)} of ${rc} replica(s) confirmed. Balances safety with response time.`;
    }
    return `Async streaming: WAL shipped to ${rc} replica(s). Primary didn't wait — fast, but latest transactions at risk if primary crashes now.`;
  },

  reorderSteps(steps, state) {
    /* Synchronous replication: replication completes before response */
    if (
      replicationMode(state.consistencyLevel) === "sync" &&
      !isReadOp(state.selectedOp)
    ) {
      const repIdx = steps.findIndex((s) => s.key === "replication");
      const resIdx = steps.findIndex((s) => s.key === "db-response");
      if (repIdx > resIdx && repIdx !== -1 && resIdx !== -1) {
        const [rep] = steps.splice(repIdx, 1);
        steps.splice(resIdx, 0, rep);
      }
    }
    return steps;
  },

  /* ── Needs checklist ─────────────────────────────────── */

  evaluateNeeds(workload, state) {
    const mode = replicationMode(state.consistencyLevel);
    const rc = Math.max(0, state.nodeCount - 1);

    if (workload === "banking") {
      return [
        {
          need: "Strong consistency",
          status: "pass",
          note:
            mode === "sync"
              ? "Synchronous replication + serialisable isolation — strongest possible guarantee"
              : mode === "quorum-sync"
                ? "Quorum-sync provides near-strong consistency; consider full sync for ledger safety"
                : "⚠ Async replication means recent writes can be lost on primary failure",
        },
        {
          need: "ACID transactions",
          status: "pass",
          note: "Native multi-statement BEGIN/COMMIT across any tables — the gold standard",
        },
        {
          need: "Correctness over speed",
          status: mode === "async" ? ("warn" as const) : ("pass" as const),
          note:
            mode === "async"
              ? "Async mode trades correctness for speed — dangerous for financial data"
              : "Constraints, triggers, and referential integrity enforce correctness at every write",
        },
      ];
    }
    if (workload === "ecommerce") {
      return [
        {
          need: "Flexible schema",
          status: "warn",
          note: "Possible via JSONB columns, but ALTER TABLE migrations add friction",
        },
        {
          need: "Nested product data",
          status: "warn",
          note: `Requires JOINs across ${state.nodeCount === 1 ? "a single node" : state.nodeCount + " nodes"} — normalisation penalty`,
        },
        {
          need: "Read-heavy workload",
          status:
            rc > 0 && mode !== "sync" ? ("pass" as const) : ("warn" as const),
          note:
            rc > 0 && mode !== "sync"
              ? `${rc} read replica(s) absorb read traffic — good horizontal read scaling`
              : "Single-node reads or sync mode limits read throughput scaling",
        },
      ];
    }
    // chat
    return [
      {
        need: "Massive write throughput",
        status: "fail",
        note: `Single primary bottleneck${mode === "sync" ? " + sync replication latency" : ""} — sharding requires Citus or manual partitioning`,
      },
      {
        need: "Partition-friendly reads",
        status: rc >= 2 ? ("warn" as const) : ("fail" as const),
        note:
          rc >= 2
            ? `${rc} replicas spread reads, but JOINs degrade at scale`
            : "No read replicas — massive table scans hit the single primary",
      },
      {
        need: "High availability",
        status: rc >= 1 ? ("warn" as const) : ("fail" as const),
        note:
          rc >= 1
            ? `Streaming replication to ${rc} replica(s), but failover takes 10–30 s (RTO ~${mode === "sync" ? "15" : "10"}s)`
            : "Single node — any failure means total downtime",
      },
    ];
  },

  /* ── Scene topology ──────────────────────────────────── */

  buildTopology(b, state, helpers) {
    const { nodes, selectedOp, consistencyLevel } = state;
    const dbColors = this.colors;
    const phase = helpers.phase;
    const mode = replicationMode(consistencyLevel);
    const H = 660;

    const primaryNode = nodes[0];
    const replicas = nodes.slice(1);
    const replicaCount = replicas.length;

    /* Progressive reveal flags */
    const showRouteInfo =
      phase === "primary-route" ||
      phase === "response" ||
      phase === "replication" ||
      phase === "summary" ||
      phase === "stale" ||
      phase === "consistent";
    const showReplInfo =
      phase === "replication" ||
      phase === "response" ||
      phase === "summary" ||
      phase === "stale" ||
      phase === "consistent";
    const showWal = showRouteInfo && !isReadOp(selectedOp);

    /* Layout constants */
    const primaryW = 170;
    const primaryH = 78;
    const replicaW = 130;
    const replicaH = 56;
    const primaryX = 660;
    const primaryY =
      replicaCount === 0
        ? H / 2 - primaryH / 2
        : replicaCount <= 2
          ? 175
          : 150;
    const replicaBaseY = primaryY + primaryH + 75;
    const primaryCX = primaryX + primaryW / 2;

    /* Compute replica positions */
    const replicaPositions: { x: number; y: number }[] = [];
    if (replicaCount === 1) {
      replicaPositions.push({ x: primaryCX - replicaW / 2, y: replicaBaseY });
    } else if (replicaCount === 2) {
      const gap = 155;
      replicaPositions.push({
        x: primaryCX - gap / 2 - replicaW / 2,
        y: replicaBaseY,
      });
      replicaPositions.push({
        x: primaryCX + gap / 2 - replicaW / 2,
        y: replicaBaseY,
      });
    } else if (replicaCount === 3) {
      const gap = 145;
      for (let i = 0; i < 3; i++) {
        replicaPositions.push({
          x: primaryCX + (i - 1) * gap - replicaW / 2,
          y: replicaBaseY,
        });
      }
    } else {
      /* 4 replicas → 2 × 2 grid */
      const gapX = 155;
      const gapY = 80;
      for (let i = 0; i < replicaCount; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        replicaPositions.push({
          x: primaryCX + (col === 0 ? -gapX / 2 : gapX / 2) - replicaW / 2,
          y: replicaBaseY + row * gapY,
        });
      }
    }

    /* ── Replication-zone background ──────────────────── */
    if (replicaCount > 0) {
      const pad = 18;
      const xs = replicaPositions.map((p) => p.x);
      const ys = replicaPositions.map((p) => p.y);
      const zoneX = Math.min(...xs) - pad;
      const zoneY = Math.min(...ys) - 22;
      const zoneW = Math.max(...xs) + replicaW - Math.min(...xs) + pad * 2;
      const zoneH = Math.max(...ys) + replicaH - Math.min(...ys) + 22 + pad;

      b.overlay((o: any) => {
        o.add(
          "rect",
          {
            x: zoneX,
            y: zoneY,
            width: zoneW,
            height: zoneH,
            rx: 10,
            fill: showReplInfo
              ? "rgba(59,130,246,0.05)"
              : "rgba(15,23,42,0.25)",
            stroke: showReplInfo
              ? "rgba(59,130,246,0.22)"
              : "rgba(100,116,139,0.12)",
            strokeWidth: 1,
            strokeDasharray: "5,3",
          },
          { key: "repl-zone-bg" },
        );
        o.add(
          "text",
          {
            x: zoneX + 10,
            y: zoneY + 14,
            text: `Streaming Replication  ·  ${mode === "sync" ? "SYNCHRONOUS" : mode === "quorum-sync" ? "QUORUM SYNC" : "ASYNC"}`,
            fill: showReplInfo ? "#60a5fa" : "#64748b",
            fontSize: 9,
            fontWeight: "600",
          },
          { key: "repl-zone-label" },
        );
      });
    }

    /* ── WAL indicator beside primary ─────────────────── */
    if (showWal && primaryNode && primaryNode.status !== "down") {
      b.overlay((o: any) => {
        const walX = primaryX + primaryW + 8;
        const walY = primaryY + 12;
        o.add(
          "rect",
          {
            x: walX,
            y: walY,
            width: 92,
            height: 22,
            rx: 4,
            fill: "rgba(59,130,246,0.12)",
            stroke: "rgba(59,130,246,0.35)",
            strokeWidth: 1,
          },
          { key: "wal-bg" },
        );
        o.add(
          "text",
          {
            x: walX + 46,
            y: walY + 14,
            text: mode === "sync" ? "WAL ✓ synced" : "WAL → stream",
            fill: mode === "sync" ? "#22c55e" : "#60a5fa",
            fontSize: 9,
            fontWeight: "700",
          },
          { key: "wal-label" },
        );
      });
    }

    /* ── Primary node ─────────────────────────────────── */
    if (primaryNode) {
      const isHot = helpers.hot(primaryNode.id);
      const statusColors = NODE_STATUS_COLORS[primaryNode.status];
      const readFromPrimary =
        !isReadOp(selectedOp) || consistencyLevel !== "eventual";

      const roleLabel = showRouteInfo
        ? readFromPrimary
          ? "PRIMARY  ·  R/W"
          : "PRIMARY  ·  WRITES"
        : "PRIMARY";
      const statusLabel =
        primaryNode.status === "down"
          ? "OFFLINE"
          : primaryNode.status === "lagging"
            ? "LAGGING"
            : `${primaryNode.loadPct}% load`;

      b.node(primaryNode.id)
        .at(primaryX, primaryY)
        .rect(primaryW, primaryH, 12)
        .fill(
          primaryNode.status === "down"
            ? "#1c1917"
            : isHot
              ? dbColors.fill
              : showRouteInfo
                ? "rgba(23,37,84,0.9)"
                : "#0f172a",
        )
        .stroke(
          primaryNode.status === "down"
            ? statusColors.stroke
            : isHot
              ? dbColors.stroke
              : showRouteInfo
                ? "#3b82f6"
                : statusColors.stroke,
          showRouteInfo ? 2.5 : 2,
        )
        .richLabel(
          (l: any) => {
            l.color(roleLabel, showRouteInfo ? "#60a5fa" : "#e2e8f0", {
              fontSize: 10,
              bold: true,
            });
            l.newline();
            l.color(
              statusLabel,
              primaryNode.status === "down"
                ? "#ef4444"
                : primaryNode.status === "lagging"
                  ? "#f59e0b"
                  : "#94a3b8",
              { fontSize: 9 },
            );
            if (showWal) {
              l.newline();
              l.color("WAL ↦ fsync", "#60a5fa", { fontSize: 8 });
            }
          },
          { fill: "#fff", fontSize: 10, dy: 0, lineHeight: 1.5 },
        )
        .onClick(() => helpers.openConcept("relational"));

      /* Edge: query-layer → primary */
      if (primaryNode.status !== "down") {
        b.edge("query-layer", primaryNode.id, `e-query-${primaryNode.id}`)
          .stroke(
            isHot
              ? dbColors.stroke
              : showRouteInfo
                ? "#3b82f6"
                : "#475569",
            isHot ? 2.2 : showRouteInfo ? 2 : 1.5,
          )
          .arrow(true);
      }
    }

    /* ── Replica nodes ────────────────────────────────── */
    replicas.forEach((replica, i) => {
      const pos = replicaPositions[i];
      if (!pos) return;
      const isHot = helpers.hot(replica.id);
      const statusColors = NODE_STATUS_COLORS[replica.status];
      const isReadTarget =
        isReadOp(selectedOp) &&
        consistencyLevel === "eventual" &&
        i === 0 &&
        replica.status === "up";

      const roleLabel = isReadTarget
        ? `REPLICA ${i + 1}  ·  READ`
        : showReplInfo
          ? `REPLICA ${i + 1}  ·  WAL recv`
          : `Replica ${i + 1}`;
      const statusLabel =
        replica.status === "down"
          ? "OFFLINE"
          : replica.status === "lagging"
            ? "LAGGING"
            : `${replica.loadPct}% load`;

      b.node(replica.id)
        .at(pos.x, pos.y)
        .rect(replicaW, replicaH, 8)
        .fill(
          replica.status === "down"
            ? "#1c1917"
            : isReadTarget
              ? "rgba(5,46,22,0.8)"
              : isHot
                ? dbColors.fill
                : replica.status === "lagging"
                  ? "#1c0f00"
                  : "#0f172a",
        )
        .stroke(
          replica.status === "down"
            ? statusColors.stroke
            : isReadTarget
              ? "#22c55e"
              : isHot
                ? dbColors.stroke
                : replica.status === "lagging"
                  ? "#f59e0b"
                  : showReplInfo
                    ? "rgba(59,130,246,0.45)"
                    : "#334155",
          isReadTarget || showReplInfo ? 2 : 1.5,
        )
        .richLabel(
          (l: any) => {
            l.color(
              roleLabel,
              isReadTarget
                ? "#22c55e"
                : showReplInfo
                  ? "#60a5fa"
                  : "#cbd5e1",
              { fontSize: 9, bold: true },
            );
            l.newline();
            l.color(
              statusLabel,
              replica.status === "down"
                ? "#ef4444"
                : replica.status === "lagging"
                  ? "#f59e0b"
                  : "#94a3b8",
              { fontSize: 8 },
            );
          },
          { fill: "#fff", fontSize: 9, dy: 0, lineHeight: 1.5 },
        )
        .onClick(() => helpers.openConcept("relational"));

      /* Edge: query-layer → replica (eventual reads only) */
      if (isReadTarget && replica.status !== "down") {
        b.edge("query-layer", replica.id, `e-query-${replica.id}`)
          .stroke("#22c55e", 2)
          .arrow(true);
      }

      /* Replication edge: primary → replica */
      if (
        primaryNode &&
        primaryNode.status !== "down" &&
        replica.status !== "down"
      ) {
        const repEdge = b
          .edge(primaryNode.id, replica.id, `rep-0-${i + 1}`)
          .stroke(
            showReplInfo
              ? mode === "sync"
                ? "#3b82f6"
                : "rgba(59,130,246,0.4)"
              : "#1e293b",
            showReplInfo ? 1.8 : 1,
          )
          .arrow(true);
        if (mode !== "sync") repEdge.dashed();
      }
    });
  },

  buildAnnotationOverlays(b, state, helpers, viewW, _viewH) {
    const { nodes, consistencyLevel, selectedOp } = state;
    const phase = helpers.phase;
    const mode = replicationMode(consistencyLevel);
    const replicaCount = Math.max(0, nodes.length - 1);

    /* Info banner: routing + replication mode + ACID */
    const showBanner =
      phase !== "" && phase !== "data-model" && phase !== "request";

    if (showBanner) {
      const routeLabel = isReadOp(selectedOp)
        ? mode === "async" && replicaCount > 0
          ? "Read → Replica"
          : "Read → Primary"
        : "Write → Primary";
      const replLabel =
        replicaCount > 0
          ? `  ·  Repl: ${mode === "sync" ? "SYNC" : mode === "quorum-sync" ? "QUORUM" : "ASYNC"} (${replicaCount})`
          : "  ·  Single node";

      b.overlay((o: any) => {
        o.add(
          "text",
          {
            x: viewW / 2,
            y: 22,
            text: `${routeLabel}${replLabel}  ·  ACID ✓`,
            fill: "#60a5fa",
            fontSize: 11,
            fontWeight: "700",
          },
          { key: "pg-info-banner" },
        );
      });
    }

    /* Stale read warning */
    if (phase === "stale" && state.result.staleReadRisk) {
      b.overlay((o: any) => {
        o.add(
          "text",
          {
            x: viewW / 2,
            y: 40,
            text: "⚠ STALE READ — replica hasn't received latest WAL segment",
            fill: "#f59e0b",
            fontSize: 10,
            fontWeight: "700",
          },
          { key: "stale-warning" },
        );
      });
    }
  },

  getStatBadges(state) {
    const badges: StatBadgeConfig[] = [];
    const rc = Math.max(0, state.nodeCount - 1);
    const mode = replicationMode(state.consistencyLevel);

    badges.push({
      label: "Repl",
      value:
        mode === "sync"
          ? "Sync"
          : mode === "quorum-sync"
            ? "Quorum"
            : "Async",
      color:
        mode === "sync"
          ? "#22c55e"
          : mode === "quorum-sync"
            ? "#f59e0b"
            : "#ef4444",
    });
    badges.push({
      label: "Replicas",
      value: rc,
      color: rc >= 2 ? "#22c55e" : rc === 1 ? "#f59e0b" : "#ef4444",
    });
    badges.push({ label: "ACID", value: "Full", color: "#22c55e" });

    return badges;
  },

  softReset(state) {
    /* Randomise load distribution to show variance between animation passes */
    if (state.nodeCount > 1) {
      const primary = state.nodes.find((n) => n.role === "primary");
      if (primary && primary.status !== "down") {
        primary.loadPct = Math.round(60 + Math.random() * 30);
      }
      state.nodes.forEach((n) => {
        if (n.role !== "primary" && n.status !== "down") {
          n.loadPct = Math.round(30 + Math.random() * 35);
        }
      });
    }
  },

  defaultConsistency() {
    return "strong";
  },
};
