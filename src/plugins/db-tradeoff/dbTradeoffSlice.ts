import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getAdapter } from "./db-adapters";
import { deriveMongoConsistency } from "./db-adapters/mongodb";

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
export type JoinMode = "app-join" | "lookup" | "denormalized";

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
  joinMode: JoinMode; // MongoDB: how the join-query is executed
  coordinatorIdx: number; // Cassandra: which ring node acts as coordinator
  keyOwnerIdx: number; // Cassandra: which ring node hash(key) lands on (first replica)
  hotZones: string[];
  explanation: string;
  phase: string;
}

/* ── DB profiles (derived from adapters) ───────────────── */

export interface DbProfile {
  label: string;
  dataModel: string;
  scaling: string;
  consistency: ConsistencyLevel;
  strengths: string[];
  weaknesses: string[];
}

/** Derived from adapters — keeps the same public shape for consumers. */
export const DB_PROFILES: Record<DbType, DbProfile> = {
  relational: getAdapter("relational").profile,
  mongodb: getAdapter("mongodb").profile,
  cassandra: getAdapter("cassandra").profile,
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

/* ── Metrics computation (adapter-based) ───────────────── */

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export function computeMetrics(state: DbTradeoffState) {
  const adapter = getAdapter(state.dbType);
  const failedNode = state.failedNodeIndex !== null;

  // Build nodes via adapter
  state.nodes = adapter.buildNodes(state.nodeCount, state.failedNodeIndex);

  // For MongoDB, nodeCount = shard count; pick target shard
  const shardCount = state.dbType === "mongodb" ? state.nodeCount : 1;
  if (state.targetShardIdx >= shardCount) {
    state.targetShardIdx = Math.floor(Math.random() * shardCount);
  }

  // Adapter-specific post-build mutations (e.g. mark lagging nodes)
  adapter.applyPostBuildMutations(state);

  // Operation adjustments from adapter
  const opAdj = adapter.opAdjustment(state.selectedOp, state);
  const bl = adapter.baseLatencies;

  let readMs = bl.read + opAdj.readDelta;
  let writeMs = bl.write + opAdj.writeDelta;
  let throughput = Math.round(
    bl.throughput *
      opAdj.throughputMultiplier *
      (1 + (state.nodeCount - 1) * bl.scaleFactor),
  );
  let nodesTouched = opAdj.nodesTouched;
  let staleReadRisk = opAdj.staleReadRisk;

  // Consistency overhead
  if (state.consistencyLevel === "strong") {
    writeMs +=
      state.dbType === "cassandra" ? 18 : state.dbType === "mongodb" ? 5 : 0;
    throughput = Math.round(
      throughput * (state.dbType === "cassandra" ? 0.55 : 0.9),
    );
    staleReadRisk = false;
  } else if (state.consistencyLevel === "quorum") {
    writeMs += state.dbType === "cassandra" ? 8 : 2;
    nodesTouched = Math.max(nodesTouched, Math.ceil(state.nodeCount / 2));
  }

  // Workload affinity penalty
  const fit = adapter.fitScores[state.workload];
  const affinityPenalty = (100 - fit) / 100;
  readMs = Math.round(readMs * (1 + affinityPenalty * 0.4));
  writeMs = Math.round(writeMs * (1 + affinityPenalty * 0.3));

  // Node failure impact
  if (failedNode) {
    writeMs += adapter.failureImpact.writeOverhead;
    throughput = Math.round(
      throughput * adapter.failureImpact.throughputFactor,
    );
  }

  const shardsTouched = 0; // default, adapter may override

  // DB-specific refinements (write concern, read pref, join mode, shards/nodes override)
  const refinable = {
    writeMs,
    readMs,
    staleReadRisk,
    nodesTouched,
    shardsTouched,
  };
  adapter.refineMetrics(state, refinable);
  writeMs = refinable.writeMs;
  readMs = refinable.readMs;
  staleReadRisk = refinable.staleReadRisk;
  nodesTouched = refinable.nodesTouched;

  // RPO / RTO from adapter
  const { rpoRisk, rtoMs } = adapter.rpoRto(state, failedNode);

  state.result = {
    readLatencyMs: clamp(readMs, 1, 500),
    writeLatencyMs: clamp(writeMs, 1, 500),
    throughputRps: clamp(throughput, 50, 100_000),
    consistency: state.consistencyLevel,
    availability: adapter.availability(state.nodeCount, failedNode),
    complexity: adapter.complexity(state.nodeCount, state.consistencyLevel),
    fitScore: fit,
    nodesTouched: clamp(nodesTouched, 1, state.nodeCount),
    shardsTouched: refinable.shardsTouched,
    staleReadRisk,
    rpoRisk,
    rtoMs,
  };

  // Data model from adapter
  const dm = adapter.dataModels[state.workload];
  state.dataModel = dm.model;
  state.dataModelDetail = dm.detail;

  // Why this DB from adapter
  state.whyThisDb = adapter.whyText[state.workload];
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
  joinMode: "app-join" as JoinMode,
  coordinatorIdx: 0,
  keyOwnerIdx: 0,
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
      getAdapter(state.dbType).softReset(state);
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<DbTradeoffState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setDbType(state, action: PayloadAction<DbType>) {
      const adapter = getAdapter(action.payload);
      state.dbType = action.payload;
      state.writeConcern = "wmajority";
      state.readPreference = "primary";
      state.failedNodeIndex = null;
      state.consistencyLevel = adapter.defaultConsistency();
      if (state.nodeCount > adapter.maxNodes) {
        state.nodeCount = adapter.maxNodes;
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
    setJoinMode(state, action: PayloadAction<JoinMode>) {
      state.joinMode = action.payload;
      computeMetrics(state);
    },
    setReplicationFactor(state, action: PayloadAction<number>) {
      state.replicationFactor = clamp(action.payload, 1, state.nodeCount);
      computeMetrics(state);
    },
    setNodeCount(state, action: PayloadAction<number>) {
      state.nodeCount = clamp(
        action.payload,
        1,
        getAdapter(state.dbType).maxNodes,
      );
      // Clamp RF to not exceed node count
      if (state.replicationFactor > state.nodeCount) {
        state.replicationFactor = state.nodeCount;
      }
      // Clamp coordinator and key owner indices
      if (state.coordinatorIdx >= state.nodeCount) {
        state.coordinatorIdx = 0;
      }
      if (state.keyOwnerIdx >= state.nodeCount) {
        state.keyOwnerIdx = 0;
      }
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
      } else {
        state.failedNodeIndex = getAdapter(state.dbType).pickFailureTarget(
          state,
        );
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
  setJoinMode,
  setReplicationFactor,
  setNodeCount,
  toggleNodeFailure,
} = dbTradeoffSlice.actions;

export default dbTradeoffSlice.reducer;
