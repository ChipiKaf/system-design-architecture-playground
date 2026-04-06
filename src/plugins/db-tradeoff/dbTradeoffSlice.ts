import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/* ── Types ─────────────────────────────────────────────── */

export type DbType = "relational" | "mongodb" | "cassandra";
export type WorkloadId = "banking" | "ecommerce" | "chat";
export type OperationId =
  | "write"
  | "point-read"
  | "join-query"
  | "aggregate"
  | "burst-write"
  | "read-after-write";
export type ConsistencyLevel = "strong" | "quorum" | "eventual";
export type WriteConcern = "w1" | "wmajority";
export type ReadPreference = "primary" | "secondary" | "majority";

export interface DbNode {
  id: string;
  role: "primary" | "secondary" | "replica";
  status: "up" | "down" | "lagging";
  loadPct: number;
  shardIdx?: number; // MongoDB only — which shard this node belongs to
}

/** True when the operation targets a single shard (by shard key). */
export function isTargetedOp(op: OperationId): boolean {
  return op === "write" || op === "point-read" || op === "read-after-write";
}

export interface OperationResult {
  readLatencyMs: number;
  writeLatencyMs: number;
  throughputRps: number;
  consistency: ConsistencyLevel;
  availability: number; // 0-100
  complexity: number; // 1-10
  fitScore: number; // 0-100
  nodesTouched: number;
  shardsTouched: number; // MongoDB: how many shards the query hits
  staleReadRisk: boolean;
  rpoRisk: "none" | "low" | "high"; // Risk of data loss on failure
  rtoMs: number; // Recovery-time estimate in ms (0 = no downtime)
}

export interface DbTradeoffState {
  dbType: DbType;
  workload: WorkloadId;
  selectedOp: OperationId;
  consistencyLevel: ConsistencyLevel;
  writeConcern: WriteConcern; // MongoDB: w:1 or w:majority
  readPreference: ReadPreference; // MongoDB: where reads are routed
  replicationFactor: number;
  nodeCount: number;
  failedNodeIndex: number | null;

  nodes: DbNode[];
  result: OperationResult;

  dataModel: string;
  dataModelDetail: string[];
  whyThisDb: string;

  targetShardIdx: number; // MongoDB: which shard a targeted query hits
  replicaAckCount: number; // MongoDB: how many nodes have the latest write (1 | 2 | 3)
  hotZones: string[];
  explanation: string;
  phase: string;
}

/* ── DB profiles ───────────────────────────────────────── */

export interface DbProfile {
  label: string;
  dataModel: string;
  scaling: string;
  consistency: ConsistencyLevel;
  strengths: string[];
  weaknesses: string[];
}

export const DB_PROFILES: Record<DbType, DbProfile> = {
  relational: {
    label: "PostgreSQL (Relational)",
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
  mongodb: {
    label: "MongoDB (Document)",
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
  cassandra: {
    label: "Cassandra (Wide-Column)",
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
};

/* ── Workload profiles ─────────────────────────────────── */

export interface WorkloadProfile {
  label: string;
  description: string;
  needs: string[];
}

export const WORKLOAD_PROFILES: Record<WorkloadId, WorkloadProfile> = {
  banking: {
    label: "Banking / Ledger",
    description: "Transaction processing with strict integrity",
    needs: [
      "Strong consistency",
      "ACID transactions",
      "Correctness over speed",
    ],
  },
  ecommerce: {
    label: "E-Commerce Catalog",
    description: "Flexible product attributes with moderate writes",
    needs: ["Flexible schema", "Nested product data", "Read-heavy workload"],
  },
  chat: {
    label: "Chat / Messaging",
    description: "Append-heavy writes at high volume with timeline reads",
    needs: [
      "Massive write throughput",
      "Partition-friendly reads",
      "High availability",
    ],
  },
};

/* ── Operation catalog ─────────────────────────────────── */

export const OPERATION_CATALOG: Record<
  OperationId,
  { label: string; type: string }
> = {
  write: { label: "Create", type: "write" },
  "point-read": { label: "Get by ID", type: "read" },
  "join-query": { label: "Join", type: "join" },
  aggregate: { label: "Aggregate", type: "aggregate" },
  "burst-write": { label: "Burst 10k", type: "burst" },
  "read-after-write": { label: "Read-after-Write", type: "consistency" },
};

/* ── Data model descriptions per DB × workload ─────────── */

interface DataModelDesc {
  model: string;
  detail: string[];
}

const DATA_MODELS: Record<DbType, Record<WorkloadId, DataModelDesc>> = {
  relational: {
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
  mongodb: {
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
  cassandra: {
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
};

/* ── Fit score matrix (DB × Workload) ──────────────────── */

const FIT_SCORES: Record<DbType, Record<WorkloadId, number>> = {
  relational: { banking: 95, ecommerce: 65, chat: 40 },
  mongodb: { banking: 35, ecommerce: 88, chat: 60 },
  cassandra: { banking: 20, ecommerce: 55, chat: 92 },
};

/* ── Why-this-DB text ──────────────────────────────────── */

const WHY_DB: Record<DbType, Record<WorkloadId, string>> = {
  relational: {
    banking:
      "Strong ACID transactions and referential integrity make relational DBs the safest fit for ledger-critical workloads.",
    ecommerce:
      "Joins across products, orders, and users work well, but flexible product attributes need JSONB workarounds.",
    chat: "Writes hit a ceiling fast. Scaling message tables across billions of rows requires careful partitioning.",
  },
  mongodb: {
    banking:
      "Possible, but multi-document transactions are less battle-tested than relational for strict ledger semantics.",
    ecommerce:
      "Flexible product attributes, nested variants, and evolving schemas make documents a natural fit for catalogs.",
    chat: "Decent for moderate scale, but write-heavy chat at millions of messages/sec pushes MongoDB limits.",
  },
  cassandra: {
    banking:
      "Very risky — eventual consistency and lack of transactions make it dangerous for financial correctness.",
    ecommerce:
      "Query-driven modeling works for reads, but cross-entity queries (user + orders) require heavy denormalization.",
    chat: "High write throughput, partition-key access patterns, and multi-region replication make Cassandra ideal for messaging at scale.",
  },
};

/* ── Metrics computation ───────────────────────────────── */

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/**
 * Map MongoDB's actual knobs (writeConcern + readPreference) to a
 * canonical ConsistencyLevel so existing metric computations work correctly.
 *
 *  w:majority + majority  → strong   (quorum read + write)
 *  w:majority + primary   → quorum   (safe writes, primary reads)
 *  w:1        + majority  → quorum   (fast writes, but majority reads)
 *  w:1        + secondary → eventual (fast writes, possibly stale reads)
 *  w:1        + primary   → quorum   (fast writes, primary reads — mixed)
 */
function deriveMongoConsistency(
  wc: WriteConcern,
  rp: ReadPreference,
): ConsistencyLevel {
  if (wc === "wmajority" && rp === "majority") return "strong";
  if (wc === "w1" && rp === "secondary") return "eventual";
  return "quorum";
}

interface OpMetrics {
  readMs: number;
  writeMs: number;
  throughput: number;
  nodesTouched: number;
  staleReadRisk: boolean;
}

function baseOpMetrics(
  db: DbType,
  op: OperationId,
  workload: WorkloadId,
  consistency: ConsistencyLevel,
  nodeCount: number,
  failedNode: boolean,
): OpMetrics {
  // Baseline latencies per DB
  const readBase: Record<DbType, number> = {
    relational: 8,
    mongodb: 6,
    cassandra: 4,
  };
  const writeBase: Record<DbType, number> = {
    relational: 12,
    mongodb: 8,
    cassandra: 3,
  };
  const throughputBase: Record<DbType, number> = {
    relational: 2000,
    mongodb: 5000,
    cassandra: 15000,
  };

  let readMs = readBase[db];
  let writeMs = writeBase[db];
  let throughput = throughputBase[db];
  let nodesTouched = 1;
  let staleReadRisk = false;

  // Scale throughput mildly with nodes (relational less, cassandra more)
  const scaleFactor: Record<DbType, number> = {
    relational: 0.15,
    mongodb: 0.5,
    cassandra: 0.85,
  };
  throughput = Math.round(throughput * (1 + (nodeCount - 1) * scaleFactor[db]));

  // Operation adjustments
  if (op === "join-query") {
    if (db === "relational") {
      readMs += 7;
      nodesTouched = 1;
    } else if (db === "mongodb") {
      readMs += 22; // application-level join
      nodesTouched = 2;
    } else {
      readMs += 45; // scatter across partitions
      nodesTouched = Math.min(nodeCount, 3);
    }
  }

  if (op === "aggregate") {
    if (db === "relational") {
      readMs += 18;
      nodesTouched = 1;
    } else if (db === "mongodb") {
      readMs += 25;
      nodesTouched = Math.min(nodeCount, 2);
    } else {
      readMs += 55;
      nodesTouched = nodeCount;
    }
  }

  if (op === "burst-write") {
    writeMs *= 1.5;
    throughput = Math.round(
      throughput * (db === "cassandra" ? 2.5 : db === "mongodb" ? 1.4 : 0.7),
    );
  }

  if (op === "read-after-write") {
    if (db === "cassandra" && consistency === "eventual") {
      staleReadRisk = true;
      readMs += 2;
    } else if (db === "mongodb" && consistency === "eventual") {
      staleReadRisk = true;
      readMs += 4;
    } else if (db === "relational") {
      staleReadRisk = false;
    }
  }

  // Consistency overhead
  if (consistency === "strong") {
    writeMs += db === "cassandra" ? 18 : db === "mongodb" ? 5 : 0;
    throughput = Math.round(throughput * (db === "cassandra" ? 0.55 : 0.9));
    staleReadRisk = false;
  } else if (consistency === "quorum") {
    writeMs += db === "cassandra" ? 8 : 2;
    nodesTouched = Math.max(nodesTouched, Math.ceil(nodeCount / 2));
  }

  // Workload affinity penalty
  const fit = FIT_SCORES[db][workload];
  const affinityPenalty = (100 - fit) / 100;
  readMs = Math.round(readMs * (1 + affinityPenalty * 0.4));
  writeMs = Math.round(writeMs * (1 + affinityPenalty * 0.3));

  // Node failure impact
  if (failedNode) {
    if (db === "relational") {
      // Failover delay
      writeMs += 35;
      throughput = Math.round(throughput * 0.5);
    } else if (db === "mongodb") {
      writeMs += 15;
      throughput = Math.round(throughput * 0.7);
    } else {
      // Cassandra handles failure gracefully
      writeMs += 3;
      throughput = Math.round(throughput * 0.88);
    }
  }

  return {
    readMs: clamp(readMs, 1, 500),
    writeMs: clamp(writeMs, 1, 500),
    throughput: clamp(throughput, 50, 100_000),
    nodesTouched: clamp(nodesTouched, 1, nodeCount),
    staleReadRisk,
  };
}

function computeAvailability(
  db: DbType,
  nodeCount: number,
  failedNode: boolean,
): number {
  if (!failedNode) {
    if (db === "cassandra") return 99;
    if (db === "mongodb") return 97;
    return 95;
  }
  // Under failure
  if (db === "cassandra") return nodeCount >= 3 ? 96 : 85;
  if (db === "mongodb") return nodeCount >= 3 ? 88 : 60;
  return nodeCount >= 2 ? 70 : 20; // relational depends on replica
}

function computeComplexity(
  db: DbType,
  nodeCount: number,
  consistency: ConsistencyLevel,
): number {
  let c = 2;
  if (db === "cassandra") c += 3;
  else if (db === "mongodb") c += 1;
  if (nodeCount >= 4) c += 1;
  if (consistency === "strong" && db === "cassandra") c += 1;
  if (consistency === "eventual") c += 1;
  return clamp(c, 1, 10);
}

export function computeMetrics(state: DbTradeoffState) {
  const failedNode = state.failedNodeIndex !== null;

  // Build nodes (MongoDB generates shard groups)
  state.nodes = buildNodes(
    state.dbType,
    state.nodeCount,
    state.failedNodeIndex,
  );

  // For MongoDB, nodeCount = shard count; pick target shard
  // (only set if not already set — softResetRun randomizes it per pass)
  const shardCount = state.dbType === "mongodb" ? state.nodeCount : 1;
  if (state.targetShardIdx >= shardCount) {
    state.targetShardIdx = Math.floor(Math.random() * shardCount);
  }

  // If cassandra + eventual + read-after-write, mark a replica as lagging
  if (
    state.dbType === "cassandra" &&
    state.consistencyLevel === "eventual" &&
    state.selectedOp === "read-after-write" &&
    state.nodes.length >= 2
  ) {
    const replicaIdx = state.nodes.findIndex(
      (n, i) => n.status === "up" && i !== 0,
    );
    if (replicaIdx >= 0) state.nodes[replicaIdx].status = "lagging";
  }

  // MongoDB + eventual + read-after-write: mark a secondary in target shard as lagging
  if (
    state.dbType === "mongodb" &&
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

  const m = baseOpMetrics(
    state.dbType,
    state.selectedOp,
    state.workload,
    state.consistencyLevel,
    state.nodeCount,
    failedNode,
  );

  // MongoDB write-concern latency adjustment
  let writeMs = m.writeMs;
  let readMs = m.readMs;
  let staleReadRisk = m.staleReadRisk;

  if (state.dbType === "mongodb") {
    if (state.writeConcern === "wmajority") {
      // w:majority waits for ack from majority of replica-set members
      writeMs += 6;
    }
    // w:1 has no extra latency (fire-and-forget to secondaries)

    // Read preference effects
    if (state.readPreference === "secondary") {
      readMs -= 1; // slightly lower because secondaries offload primary
      // Stale risk: secondary may not have replicated yet
      staleReadRisk = state.writeConcern === "w1" ? true : true;
      // Even w:majority can have a tiny lag window on secondary reads
    } else if (state.readPreference === "majority") {
      readMs += 3; // majority read must confirm data is majority-committed
      staleReadRisk = false; // reads only return majority-committed data
    } else {
      // primary — reads go to same node that writes, always current
      staleReadRisk = false;
    }
  }

  // RPO / RTO
  let rpoRisk: "none" | "low" | "high" = "none";
  let rtoMs = 0;

  if (state.dbType === "mongodb") {
    rpoRisk = state.writeConcern === "w1" ? "high" : "none";
    rtoMs = failedNode ? 7000 : 0; // ~5-10s election on primary failure
  } else if (state.dbType === "relational") {
    rpoRisk = failedNode && state.nodeCount < 2 ? "high" : "none";
    rtoMs = failedNode ? 15000 : 0; // manual / slower failover
  } else {
    // Cassandra: peer-to-peer, very fast recovery
    rpoRisk = state.consistencyLevel === "eventual" ? "low" : "none";
    rtoMs = failedNode ? 1000 : 0;
  }

  // Shards touched
  const shardsTouched =
    state.dbType === "mongodb"
      ? isTargetedOp(state.selectedOp)
        ? 1
        : shardCount
      : 0;

  state.result = {
    readLatencyMs: readMs,
    writeLatencyMs: writeMs,
    throughputRps: m.throughput,
    consistency: state.consistencyLevel,
    availability: computeAvailability(
      state.dbType,
      state.nodeCount,
      failedNode,
    ),
    complexity: computeComplexity(
      state.dbType,
      state.nodeCount,
      state.consistencyLevel,
    ),
    fitScore: FIT_SCORES[state.dbType][state.workload],
    nodesTouched: m.nodesTouched,
    shardsTouched,
    staleReadRisk,
    rpoRisk,
    rtoMs,
  };

  // Data model
  const dm = DATA_MODELS[state.dbType][state.workload];
  state.dataModel = dm.model;
  state.dataModelDetail = dm.detail;

  // Why this DB
  state.whyThisDb = WHY_DB[state.dbType][state.workload];
}

function buildNodes(
  db: DbType,
  count: number,
  failedIdx: number | null,
): DbNode[] {
  if (db === "mongodb") {
    // Each "node" in the slider = 1 shard; each shard has 1 primary + 2 secondaries
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
  }

  if (db === "cassandra") {
    return Array.from({ length: count }, (_, i) => ({
      id: `db-node-${i}`,
      role: "replica" as const,
      status: (i === failedIdx ? "down" : "up") as "up" | "down",
      loadPct:
        i === failedIdx
          ? 0
          : Math.round(100 / Math.max(1, count - (failedIdx !== null ? 1 : 0))),
    }));
  }

  // Relational
  return Array.from({ length: count }, (_, i) => ({
    id: `db-node-${i}`,
    role: (i === 0 ? "primary" : "secondary") as "primary" | "secondary",
    status: (i === failedIdx ? "down" : "up") as "up" | "down",
    loadPct:
      i === failedIdx
        ? 0
        : Math.round(100 / Math.max(1, count - (failedIdx !== null ? 1 : 0))),
  }));
}

function buildNodeRoles(
  db: DbType,
  count: number,
): Array<"primary" | "secondary" | "replica"> {
  if (db === "cassandra") {
    // All Cassandra nodes are peers (replicas)
    return Array.from({ length: count }, () => "replica");
  }
  // Relational / Mongo: first is primary, rest are secondary
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? "primary" : "secondary",
  );
}

/* ── Initial state ─────────────────────────────────────── */

const baseState: DbTradeoffState = {
  dbType: "relational",
  workload: "banking",
  selectedOp: "write",
  consistencyLevel: "strong",
  writeConcern: "wmajority" as WriteConcern,
  readPreference: "primary" as ReadPreference,
  replicationFactor: 3,
  nodeCount: 3,
  failedNodeIndex: null,

  nodes: [],
  result: {
    readLatencyMs: 0,
    writeLatencyMs: 0,
    throughputRps: 0,
    consistency: "strong",
    availability: 0,
    complexity: 0,
    fitScore: 0,
    nodesTouched: 0,
    shardsTouched: 0,
    staleReadRisk: false,
    rpoRisk: "none",
    rtoMs: 0,
  },

  targetShardIdx: 0,
  replicaAckCount: 2,
  dataModel: "",
  dataModelDetail: [],
  whyThisDb: "",

  hotZones: [],
  explanation: "",
  phase: "",
};

function makeInitial(): DbTradeoffState {
  const s = { ...baseState, nodes: [], dataModelDetail: [] };
  computeMetrics(s);
  return s;
}

export const initialState: DbTradeoffState = makeInitial();

/* ── Slice ─────────────────────────────────────────────── */

const dbTradeoffSlice = createSlice({
  name: "dbTradeoff",
  initialState,
  reducers: {
    reset() {
      return makeInitial();
    },
    softResetRun(state) {
      state.hotZones = [];
      state.explanation = "";
      state.phase = "";
      // Randomize target shard each pass for MongoDB
      if (state.dbType === "mongodb" && state.nodeCount > 0) {
        state.targetShardIdx = Math.floor(Math.random() * state.nodeCount);
        // 50/50: either only primary has new value (no majority yet)
        // or primary + one secondary do (majority reached)
        state.replicaAckCount = Math.random() < 0.5 ? 1 : 2;
      }
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<DbTradeoffState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setDbType(state, action: PayloadAction<DbType>) {
      state.dbType = action.payload;
      state.writeConcern = "wmajority";
      state.readPreference = "primary";
      state.failedNodeIndex = null;
      // Derive consistency from knobs for MongoDB; use profile default for others
      state.consistencyLevel =
        action.payload === "mongodb"
          ? deriveMongoConsistency("wmajority", "primary")
          : DB_PROFILES[action.payload].consistency;
      // MongoDB: nodeCount = shard count, max 3
      if (action.payload === "mongodb" && state.nodeCount > 3) {
        state.nodeCount = 3;
      }
      computeMetrics(state);
    },
    setWorkload(state, action: PayloadAction<WorkloadId>) {
      state.workload = action.payload;
      state.failedNodeIndex = null;
      computeMetrics(state);
    },
    setSelectedOp(state, action: PayloadAction<OperationId>) {
      state.selectedOp = action.payload;
      computeMetrics(state);
    },
    setConsistencyLevel(state, action: PayloadAction<ConsistencyLevel>) {
      state.consistencyLevel = action.payload;
      computeMetrics(state);
    },
    setWriteConcern(state, action: PayloadAction<WriteConcern>) {
      state.writeConcern = action.payload;
      // sync consistencyLevel so internal metrics stay accurate
      if (state.dbType === "mongodb") {
        state.consistencyLevel = deriveMongoConsistency(
          action.payload,
          state.readPreference,
        );
      }
      computeMetrics(state);
    },
    setReadPreference(state, action: PayloadAction<ReadPreference>) {
      state.readPreference = action.payload;
      // sync consistencyLevel so internal metrics stay accurate
      if (state.dbType === "mongodb") {
        state.consistencyLevel = deriveMongoConsistency(
          state.writeConcern,
          action.payload,
        );
      }
      computeMetrics(state);
    },
    setNodeCount(state, action: PayloadAction<number>) {
      const max = state.dbType === "mongodb" ? 3 : 5;
      state.nodeCount = clamp(action.payload, 1, max);
      if (state.failedNodeIndex !== null) {
        const totalNodes =
          state.dbType === "mongodb" ? state.nodeCount * 3 : state.nodeCount;
        if (state.failedNodeIndex >= totalNodes) {
          state.failedNodeIndex = null;
        }
      }
      computeMetrics(state);
    },
    toggleNodeFailure(state) {
      if (state.failedNodeIndex !== null) {
        state.failedNodeIndex = null;
      } else if (state.dbType === "mongodb") {
        // Kill the primary of the last shard (impactful demo)
        const lastShardPrimaryIdx = (state.nodeCount - 1) * 3;
        state.failedNodeIndex = lastShardPrimaryIdx;
      } else {
        // Fail a non-primary node if possible
        state.failedNodeIndex = state.nodeCount >= 2 ? state.nodeCount - 1 : 0;
      }
      computeMetrics(state);
    },
  },
});

export const {
  reset,
  softResetRun,
  patchState,
  recalcMetrics,
  setDbType,
  setWorkload,
  setSelectedOp,
  setConsistencyLevel,
  setWriteConcern,
  setReadPreference,
  setNodeCount,
  toggleNodeFailure,
} = dbTradeoffSlice.actions;

export default dbTradeoffSlice.reducer;
