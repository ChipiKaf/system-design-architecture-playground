import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ShardStrategy = "range" | "hash";
export type ShardKey = "userId" | "region" | "orderId";
export type QueryId =
  | "user-lookup"
  | "user-orders"
  | "region-orders"
  | "total-orders"
  | "join-user-orders";
export type SkewMode = "uniform" | "hotUser" | "hotRegion";

export interface ClientNode {
  id: string;
  type: "desktop" | "mobile";
}

export interface ShardStat {
  id: string;
  records: number;
  writesQps: number;
  loadPct: number;
}

export interface QueryMetrics {
  shardsTouched: number;
  fanOut: number;
  mergeCost: number;
  latencyMs: number;
  joinColocated: boolean;
}

export interface ShardingState {
  strategy: ShardStrategy;
  shardKey: ShardKey;
  shardCount: number;
  selectedQuery: QueryId;
  skewMode: SkewMode;
  denormalized: boolean;
  colocateOrdersWithUsers: boolean;

  clients: ClientNode[];
  shards: ShardStat[];

  sampleUserId: number;
  sampleOrderId: number;
  sampleRegion: "US" | "EU" | "APAC";

  queryMetrics: QueryMetrics;
  throughputRps: number;
  hotspotLevel: number;
  balanceScore: number;
  complexityScore: number;
  dataMovedMb: number;

  queryTargetShards: string[];
  hottestShardId: string;
  coolestShardId: string;
  routingTrace: {
    keyLabel: string;
    keyValue: string;
    hashValue: number;
    moduloResult: number;
  };

  hotZones: string[];
  explanation: string;
  phase: string;
}

export const QUERY_CATALOG: Record<QueryId, { label: string; type: string }> = {
  "user-lookup": { label: "GET /users/42", type: "point" },
  "user-orders": { label: "GET /users/42/orders", type: "point+child" },
  "region-orders": { label: "GET /orders?region=EU", type: "filter" },
  "total-orders": { label: "GET /analytics/total-orders", type: "aggregate" },
  "join-user-orders": { label: "JOIN user + orders", type: "join" },
};

const defaultClients: ClientNode[] = [
  { id: "client-1", type: "desktop" },
  { id: "client-2", type: "mobile" },
  { id: "client-3", type: "desktop" },
];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const hashNumber = (input: string | number) => {
  const s = String(input);
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
};

const regionToSeed: Record<ShardingState["sampleRegion"], number> = {
  US: 31,
  EU: 67,
  APAC: 97,
};

function querySeed(state: ShardingState): number {
  if (state.shardKey === "userId") return state.sampleUserId;
  if (state.shardKey === "orderId") return state.sampleOrderId;
  return regionToSeed[state.sampleRegion];
}

function distributionWeights(state: ShardingState): number[] {
  const n = state.shardCount;
  const w = Array.from({ length: n }, () => 1);

  if (state.strategy === "range") {
    for (let i = 0; i < n; i += 1) w[i] = 0.75 + (i / Math.max(1, n - 1)) * 0.9;
  }

  if (state.skewMode === "hotUser") {
    const idx = Math.max(0, Math.min(n - 1, hashNumber(state.sampleUserId) % n));
    w[idx] *= state.strategy === "range" ? 2.2 : 1.7;
  }

  if (state.skewMode === "hotRegion") {
    const idx = Math.max(0, Math.min(n - 1, regionToSeed[state.sampleRegion] % n));
    w[idx] *= state.shardKey === "region" ? 2.4 : 1.5;
  }

  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / sum);
}

function estimateShardsTouched(state: ShardingState): number {
  const n = state.shardCount;
  const q = state.selectedQuery;

  if (q === "total-orders") return n;

  if (q === "region-orders") {
    if (state.shardKey === "region") return 1;
    return Math.max(2, Math.ceil(n * 0.6));
  }

  if (q === "user-lookup") {
    if (state.shardKey === "userId") return 1;
    return Math.max(2, Math.ceil(n * 0.5));
  }

  if (q === "user-orders") {
    if (state.shardKey === "userId" || state.colocateOrdersWithUsers) return 1;
    return Math.max(2, Math.ceil(n * 0.7));
  }

  if (q === "join-user-orders") {
    const colocated = state.shardKey === "userId" && state.colocateOrdersWithUsers;
    return colocated ? 1 : n;
  }

  return 1;
}

function describeQueryImpact(state: ShardingState): string {
  const q = QUERY_CATALOG[state.selectedQuery].label;
  const m = state.queryMetrics;
  if (m.shardsTouched === 1) {
    return `${q} stays local on one shard. Fast path with minimal network fan-out.`;
  }
  return `${q} touches ${m.shardsTouched} shards, then merges results. This is the core sharding tradeoff: scale point lookups, pay more for global queries.`;
}

export function computeMetrics(state: ShardingState) {
  const weights = distributionWeights(state);
  const baseRecords = 20000 + state.shardCount * 4500;
  const baseWrites = 800 + state.clients.length * 140;

  state.shards = weights.map((p, i) => ({
    id: `shard-${i + 1}`,
    records: Math.round(baseRecords * p),
    writesQps: Math.round(baseWrites * p),
    loadPct: Math.round(100 * p),
  }));

  const loads = state.shards.map((s) => s.loadPct);
  const maxLoad = Math.max(...loads);
  const minLoad = Math.min(...loads);
  const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;

  const spread = maxLoad - minLoad;
  state.hotspotLevel = clamp(Math.round(spread * 1.6), 0, 100);
  state.balanceScore = clamp(Math.round(100 - spread * 1.35), 10, 99);

  const hottest = state.shards.reduce((a, b) => (a.loadPct >= b.loadPct ? a : b));
  const coolest = state.shards.reduce((a, b) => (a.loadPct <= b.loadPct ? a : b));
  state.hottestShardId = hottest.id;
  state.coolestShardId = coolest.id;

  const touched = estimateShardsTouched(state);
  const fanOut = touched;
  const mergeCost = Math.max(0, touched - 1);
  const joinColocated =
    state.selectedQuery !== "join-user-orders"
      ? true
      : state.shardKey === "userId" && state.colocateOrdersWithUsers;

  const hotspotPenalty = Math.round(state.hotspotLevel * 0.6);
  const joinPenalty = state.selectedQuery === "join-user-orders" && !joinColocated ? 70 : 0;
  const mergePenalty = mergeCost * 12;
  const denormBoost = state.denormalized ? 12 : 0;
  const latencyMs = clamp(
    18 + fanOut * 15 + mergePenalty + hotspotPenalty + joinPenalty - denormBoost,
    20,
    520,
  );

  state.queryMetrics = {
    shardsTouched: touched,
    fanOut,
    mergeCost,
    latencyMs,
    joinColocated,
  };

  const capacityBase = 650 + state.shardCount * 240;
  const strategyFactor = state.strategy === "hash" ? 1.1 : 1.0;
  const skewPenalty = 1 - state.hotspotLevel / 180;
  state.throughputRps = Math.max(120, Math.round(capacityBase * strategyFactor * skewPenalty));

  const totalDataMb = Math.round(state.shards.reduce((a, s) => a + s.records, 0) / 4.8);
  state.dataMovedMb = Math.round(
    totalDataMb * (state.strategy === "hash" ? 0.58 : 0.34),
  );

  const complexityBase =
    2 +
    (state.strategy === "hash" ? 1 : 0) +
    (state.queryMetrics.shardsTouched > 1 ? 2 : 0) +
    (state.selectedQuery === "join-user-orders" && !joinColocated ? 2 : 0) +
    (state.denormalized ? 1 : 0) +
    (state.shardCount >= 5 ? 1 : 0);
  state.complexityScore = clamp(complexityBase, 1, 10);

  const seed = querySeed(state);
  const h = hashNumber(seed);
  const modulo = h % state.shardCount;
  state.routingTrace = {
    keyLabel: state.shardKey,
    keyValue:
      state.shardKey === "userId"
        ? String(state.sampleUserId)
        : state.shardKey === "orderId"
          ? String(state.sampleOrderId)
          : state.sampleRegion,
    hashValue: h,
    moduloResult: modulo,
  };

  if (touched <= 1) {
    state.queryTargetShards = [`shard-${modulo + 1}`];
  } else {
    const ordered = [...state.shards].sort((a, b) => b.loadPct - a.loadPct);
    state.queryTargetShards = ordered.slice(0, touched).map((s) => s.id);
  }

  state.explanation = describeQueryImpact(state);
}

function describeConfig(state: ShardingState): string {
  return `Strategy ${state.strategy.toUpperCase()} + key ${state.shardKey} across ${state.shardCount} shards.`;
}

const baseState: ShardingState = {
  strategy: "hash",
  shardKey: "userId",
  shardCount: 4,
  selectedQuery: "user-orders",
  skewMode: "uniform",
  denormalized: false,
  colocateOrdersWithUsers: true,

  clients: defaultClients,
  shards: [],

  sampleUserId: 42,
  sampleOrderId: 8842,
  sampleRegion: "EU",

  queryMetrics: {
    shardsTouched: 1,
    fanOut: 1,
    mergeCost: 0,
    latencyMs: 0,
    joinColocated: true,
  },
  throughputRps: 0,
  hotspotLevel: 0,
  balanceScore: 0,
  complexityScore: 0,
  dataMovedMb: 0,

  queryTargetShards: [],
  hottestShardId: "shard-1",
  coolestShardId: "shard-1",
  routingTrace: {
    keyLabel: "userId",
    keyValue: "42",
    hashValue: 0,
    moduloResult: 0,
  },

  hotZones: [],
  explanation: "",
  phase: "overview",
};

computeMetrics(baseState);
baseState.explanation =
  "Sharding splits one large database into smaller partitions. Route one request and observe which shard(s) it touches.";

export const initialState: ShardingState = baseState;

const shardingSlice = createSlice({
  name: "sharding",
  initialState,
  reducers: {
    reset: () => {
      const s: ShardingState = JSON.parse(JSON.stringify(initialState));
      computeMetrics(s);
      s.phase = "overview";
      s.hotZones = [];
      return s;
    },

    softResetRun(state) {
      state.hotZones = [];
      state.phase = "overview";
      computeMetrics(state);
      state.explanation =
        "Sharding splits one large database into smaller partitions. Route one request and observe which shard(s) it touches.";
    },

    patchState(state, action: PayloadAction<Partial<ShardingState>>) {
      Object.assign(state, action.payload);
    },

    recalcMetrics(state) {
      computeMetrics(state);
    },

    setStrategy(state, action: PayloadAction<ShardStrategy>) {
      state.strategy = action.payload;
      computeMetrics(state);
      state.explanation = `${describeConfig(state)} ${describeQueryImpact(state)}`;
    },

    setShardKey(state, action: PayloadAction<ShardKey>) {
      state.shardKey = action.payload;
      computeMetrics(state);
      state.explanation = `${describeConfig(state)} ${describeQueryImpact(state)}`;
    },

    setShardCount(state, action: PayloadAction<number>) {
      state.shardCount = clamp(action.payload, 2, 6);
      computeMetrics(state);
      state.explanation = `${describeConfig(state)} Rebalancing preview: ~${state.dataMovedMb} MB moves when you add/remove a shard.`;
    },

    setSelectedQuery(state, action: PayloadAction<QueryId>) {
      state.selectedQuery = action.payload;
      computeMetrics(state);
      state.explanation = describeQueryImpact(state);
    },

    setSkewMode(state, action: PayloadAction<SkewMode>) {
      state.skewMode = action.payload;
      computeMetrics(state);
      state.explanation =
        state.hotspotLevel > 55
          ? `Hotspot detected: ${state.hottestShardId} is overloaded. Bad key/strategy combinations create uneven shard pressure.`
          : "Load is fairly balanced across shards.";
    },

    toggleDenormalized(state) {
      state.denormalized = !state.denormalized;
      computeMetrics(state);
      state.explanation = state.denormalized
        ? "Denormalized reads avoid expensive joins, but duplicate data and increase write complexity."
        : "Normalized model is cleaner, but cross-shard joins are more expensive.";
    },

    toggleColocation(state) {
      state.colocateOrdersWithUsers = !state.colocateOrdersWithUsers;
      computeMetrics(state);
      state.explanation = state.colocateOrdersWithUsers
        ? "Orders are co-located with users. User-centric queries stay local to one shard."
        : "Orders are distributed independently. User + orders now fan out across shards.";
    },

    addClient(state) {
      if (state.clients.length >= 8) return;
      const id = `client-${Date.now()}`;
      const type = state.clients.length % 2 === 0 ? "desktop" : "mobile";
      state.clients.push({ id, type });
      computeMetrics(state);
    },

    removeClient(state) {
      if (state.clients.length <= 1) return;
      state.clients.pop();
      computeMetrics(state);
    },
  },
});

export const {
  reset,
  softResetRun,
  patchState,
  recalcMetrics,
  setStrategy,
  setShardKey,
  setShardCount,
  setSelectedQuery,
  setSkewMode,
  toggleDenormalized,
  toggleColocation,
  addClient,
  removeClient,
} = shardingSlice.actions;

export default shardingSlice.reducer;
