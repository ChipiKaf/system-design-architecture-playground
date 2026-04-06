import type {
  DbAdapter,
  OpAdjustment,
} from "./types";

/* ── Node status helpers (shared colours for scene) ───── */

const NODE_STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  up: { fill: "#0f3b2e", stroke: "#10b981" },
  down: { fill: "#7f1d1d", stroke: "#ef4444" },
  lagging: { fill: "#78350f", stroke: "#f59e0b" },
};

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
    return Array.from({ length: count }, (_, i) => ({
      id: `db-node-${i}`,
      role: (i === 0 ? "primary" : "secondary") as "primary" | "secondary",
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
    read: 8,
    write: 12,
    throughput: 2000,
    scaleFactor: 0.15,
  },

  opAdjustment(op, _state) {
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
      base.writeDelta = 12 * 0.5; // 1.5× base write
      base.throughputMultiplier = 0.7;
    }
    return base;
  },

  availability(nodeCount, failedNode) {
    if (!failedNode) return 95;
    return nodeCount >= 2 ? 70 : 20;
  },

  complexity(nodeCount, _consistency) {
    let c = 2;
    if (nodeCount >= 4) c += 1;
    return Math.max(1, Math.min(10, c));
  },

  failureImpact: { writeOverhead: 35, throughputFactor: 0.5 },

  rpoRto(state, failedNode) {
    return {
      rpoRisk: failedNode && state.nodeCount < 2 ? "high" : "none",
      rtoMs: failedNode ? 15000 : 0,
    };
  },

  refineMetrics(_state, _metrics) {
    // Relational has no extra DB-specific refinements
  },

  applyPostBuildMutations(_state) {
    // No post-build mutations for relational
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
    return null; // token not handled by this adapter
  },

  /* ── Flow beats ──────────────────────────────────────── */

  getRouteFlows(_state) {
    return [
      {
        from: "query-layer",
        to: "$primary",
        duration: 700,
        explain: "Query routes to the primary DB node.",
      },
    ];
  },

  getResponseFlows(_state) {
    return [{ from: "$primary", to: "query-layer", duration: 600 }];
  },

  getReplicationFlows(state) {
    if (state.nodeCount < 2) return [];
    return [
      {
        from: "$primary",
        to: "$replicas",
        duration: 800,
        explain: "Primary replicates the write to secondary nodes.",
      },
    ];
  },

  getRouteExplanation(state) {
    return `Request routed to primary. Write latency: ~${state.result.writeLatencyMs}ms.`;
  },

  getResponseExplanation(state) {
    return `Response returned. Read: ~${state.result.readLatencyMs}ms, Write: ~${state.result.writeLatencyMs}ms.`;
  },

  getReplicationExplanation(state) {
    return `Write replicated to ${Math.max(0, state.nodeCount - 1)} secondary node(s). Lag depends on replication mode.`;
  },

  reorderSteps(steps, _state) {
    return steps; // No step reordering for relational
  },

  /* ── Needs checklist ─────────────────────────────────── */

  evaluateNeeds(workload, _state) {
    if (workload === "banking") {
      return [
        {
          need: "Strong consistency",
          status: "pass",
          note: "Full serialisable isolation via ACID guarantees",
        },
        {
          need: "ACID transactions",
          status: "pass",
          note: "Native multi-statement transactions across any tables",
        },
        {
          need: "Correctness over speed",
          status: "pass",
          note: "Designed for correctness-first: constraints, triggers, referential integrity",
        },
      ];
    }
    if (workload === "ecommerce") {
      return [
        {
          need: "Flexible schema",
          status: "warn",
          note: "Possible via JSONB columns, but schema migrations add friction",
        },
        {
          need: "Nested product data",
          status: "warn",
          note: "Requires separate tables and JOINs per attribute type",
        },
        {
          need: "Read-heavy workload",
          status: "pass",
          note: "Indexed reads, query planner, and caching handle most patterns well",
        },
      ];
    }
    // chat
    return [
      {
        need: "Massive write throughput",
        status: "fail",
        note: "Single-node write path is a bottleneck — sharding adds significant complexity",
      },
      {
        need: "Partition-friendly reads",
        status: "warn",
        note: "Works with careful indexing; large table JOINs degrade under scale",
      },
      {
        need: "High availability",
        status: "warn",
        note: "Requires explicit replication and failover setup; single-region by default",
      },
    ];
  },

  /* ── Scene topology ──────────────────────────────────── */

  buildTopology(b, state, helpers) {
    const { nodes } = state;
    const nodeCount = nodes.length;
    const dbLeft = 640;
    const dbSpacingY = nodeCount <= 3 ? 120 : 100;
    const dbStartY = 280 - ((nodeCount - 1) * dbSpacingY) / 2;
    const dbColors = this.colors;

    nodes.forEach((node, i) => {
      const y = dbStartY + i * dbSpacingY;
      const statusColors = NODE_STATUS_COLORS[node.status];
      const isHot = helpers.hot(node.id);

      const roleLabel = node.role === "primary" ? "Primary" : `Secondary ${i}`;
      const statusLabel =
        node.status === "down"
          ? "OFFLINE"
          : node.status === "lagging"
            ? "LAGGING"
            : `${node.loadPct}% load`;

      b.node(node.id)
        .at(dbLeft + (i % 2 === 1 ? 60 : 0), y)
        .rect(170, 80, 12)
        .fill(
          isHot
            ? dbColors.fill
            : node.status === "down"
              ? "#1c1917"
              : "#0f172a",
        )
        .stroke(
          node.status === "down"
            ? statusColors.stroke
            : isHot
              ? dbColors.stroke
              : statusColors.stroke,
          2,
        )
        .richLabel(
          (l: any) => {
            l.color(roleLabel, "#e2e8f0", { fontSize: 11, bold: true });
            l.color("  DB Node", "#64748b", { fontSize: 9 });
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
          { fill: "#fff", fontSize: 11, dy: 2, lineHeight: 1.7 },
        )
        .onClick(() => helpers.openConcept("relational"));

      b.edge("query-layer", node.id, `e-query-${node.id}`)
        .stroke(
          isHot
            ? dbColors.stroke
            : node.status === "down"
              ? "#7f1d1d"
              : "#475569",
          isHot ? 2.2 : 1.5,
        )
        .arrow(true);
    });

    // Replication edges
    if (nodeCount >= 2) {
      for (let i = 1; i < nodeCount; i++) {
        if (nodes[i].status !== "down") {
          b.edge(nodes[0].id, nodes[i].id, `rep-0-${i}`)
            .stroke("#334155", 1.2)
            .dashed();
        }
      }
    }
  },

  buildAnnotationOverlays(_b, _state, _helpers, _viewW, _viewH) {
    // No annotation overlays for relational
  },

  getStatBadges(_state) {
    return []; // No DB-specific stat badges for relational
  },

  softReset(_state) {
    // Nothing to randomize for relational
  },

  defaultConsistency() {
    return "strong";
  },
};
