import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";

/* ── Variant identifiers (DB archetypes) ─────────────── */
export type VariantKey = "postgresql" | "cassandra" | "mongodb";

/* ── Tunable knobs ───────────────────────────────────── */
export type IsolationLevel =
  | "read-committed"
  | "repeatable-read"
  | "serializable";
export type ConsistencyLevel = "strong" | "quorum" | "eventual";

/* ── Per-variant profile ─────────────────────────────── */
export interface VariantProfile {
  key: VariantKey;
  label: string;
  color: string;
  description: string;
  capPosition: "CA" | "AP" | "CP";
  defaultConsistency: ConsistencyLevel;
  defaultIsolation: IsolationLevel;
  acidNative: boolean;
}

export const VARIANT_PROFILES: Record<VariantKey, VariantProfile> = {
  postgresql: {
    key: "postgresql",
    label: "PostgreSQL",
    color: "#3b82f6",
    description:
      "Relational DB — favours Consistency + Availability. Single primary, ACID transactions, sync/async replication.",
    capPosition: "CA",
    defaultConsistency: "strong",
    defaultIsolation: "read-committed",
    acidNative: true,
  },
  cassandra: {
    key: "cassandra",
    label: "Cassandra",
    color: "#f59e0b",
    description:
      "Wide-column store — favours Availability + Partition-tolerance. Tunable consistency, no multi-row ACID.",
    capPosition: "AP",
    defaultConsistency: "eventual",
    defaultIsolation: "read-committed",
    acidNative: false,
  },
  mongodb: {
    key: "mongodb",
    label: "MongoDB",
    color: "#22c55e",
    description:
      "Document store — favours Consistency + Partition-tolerance. Replica-set elections, multi-doc transactions since 4.0.",
    capPosition: "CP",
    defaultConsistency: "strong",
    defaultIsolation: "read-committed",
    acidNative: false,
  },
};

/* ── Node types for the scene ────────────────────────── */
export interface DbNode {
  id: string;
  label: string;
  role: "primary" | "replica" | "peer";
  status: "up" | "partitioned" | "down";
  dataVersion: number;
}

/* ── ACID guarantee status ───────────────────────────── */
export type AcidGrade = "full" | "partial" | "none";
export type IsolationGrade =
  | "serializable"
  | "snapshot"
  | "read-committed"
  | "none";

export interface AcidStatus {
  atomicity: AcidGrade;
  consistency: AcidGrade;
  isolation: IsolationGrade;
  durability: AcidGrade | "at-risk";
}

/* ── CAP live status ─────────────────────────────────── */
export interface CapStatus {
  c: boolean;
  a: boolean;
  p: boolean;
}

/* ── State shape ─────────────────────────────────────── */
export interface CapAcidState extends LabState {
  variant: VariantKey;
  isolationLevel: IsolationLevel;
  consistencyLevel: ConsistencyLevel;
  partitioned: boolean;

  nodes: DbNode[];
  writeVersion: number;

  acid: AcidStatus;
  cap: CapStatus;

  writeLatencyMs: number;
  readLatencyMs: number;
  availabilityPct: number;
  riskText: string;
}

/* ── ACID derivation ─────────────────────────────────── */
function deriveAcid(
  variant: VariantKey,
  isolation: IsolationLevel,
  partitioned: boolean,
  consistency: ConsistencyLevel,
): AcidStatus {
  if (variant === "postgresql") {
    const iso: IsolationGrade =
      isolation === "serializable"
        ? "serializable"
        : isolation === "repeatable-read"
          ? "snapshot"
          : "read-committed";
    return {
      atomicity: "full",
      consistency: "full",
      isolation: iso,
      durability: partitioned ? "at-risk" : "full",
    };
  }
  if (variant === "cassandra") {
    return {
      atomicity: "partial",
      consistency: partitioned
        ? consistency === "eventual"
          ? "none"
          : "partial"
        : consistency === "strong"
          ? "partial"
          : "none",
      isolation: "none",
      durability: "full",
    };
  }
  // mongodb
  return {
    atomicity: partitioned ? "partial" : "full",
    consistency:
      consistency === "strong" ? (partitioned ? "partial" : "full") : "partial",
    isolation: partitioned ? "none" : "snapshot",
    durability: consistency === "strong" ? "full" : "at-risk",
  };
}

/* ── CAP derivation ──────────────────────────────────── */
function deriveCap(
  variant: VariantKey,
  partitioned: boolean,
  consistency: ConsistencyLevel,
): CapStatus {
  if (!partitioned) {
    return { c: true, a: true, p: true };
  }
  if (variant === "postgresql") {
    return { c: true, a: false, p: false };
  }
  if (variant === "cassandra") {
    if (consistency === "strong") {
      return { c: true, a: false, p: true };
    }
    return { c: false, a: true, p: true };
  }
  // mongodb — CP
  return { c: true, a: false, p: true };
}

/* ── Build nodes ─────────────────────────────────────── */
function buildNodes(
  variant: VariantKey,
  partitioned: boolean,
  writeVersion: number,
): DbNode[] {
  if (variant === "postgresql") {
    return [
      {
        id: "db-node-0",
        label: "Primary",
        role: "primary",
        status: "up",
        dataVersion: writeVersion,
      },
      {
        id: "db-node-1",
        label: "Replica 1",
        role: "replica",
        status: "up",
        dataVersion: partitioned ? writeVersion - 1 : writeVersion,
      },
      {
        id: "db-node-2",
        label: "Replica 2",
        role: "replica",
        status: partitioned ? "partitioned" : "up",
        dataVersion: partitioned ? writeVersion - 1 : writeVersion,
      },
    ];
  }
  if (variant === "cassandra") {
    return [
      {
        id: "db-node-0",
        label: "Node 1",
        role: "peer",
        status: "up",
        dataVersion: writeVersion,
      },
      {
        id: "db-node-1",
        label: "Node 2",
        role: "peer",
        status: "up",
        dataVersion: writeVersion,
      },
      {
        id: "db-node-2",
        label: "Node 3",
        role: "peer",
        status: partitioned ? "partitioned" : "up",
        dataVersion: partitioned ? writeVersion - 1 : writeVersion,
      },
    ];
  }
  // mongodb
  return [
    {
      id: "db-node-0",
      label: "Primary",
      role: "primary",
      status: partitioned ? "down" : "up",
      dataVersion: writeVersion,
    },
    {
      id: "db-node-1",
      label: "Secondary 1",
      role: "replica",
      status: "up",
      dataVersion: partitioned ? writeVersion - 1 : writeVersion,
    },
    {
      id: "db-node-2",
      label: partitioned ? "New Primary" : "Secondary 2",
      role: partitioned ? "primary" : "replica",
      status: "up",
      dataVersion: partitioned ? writeVersion - 1 : writeVersion,
    },
  ];
}

/* ── Risk text ───────────────────────────────────────── */
function buildRiskText(s: CapAcidState): string {
  if (!s.partitioned) {
    return s.variant === "postgresql"
      ? "No partition. Full ACID, all nodes consistent."
      : s.variant === "cassandra"
        ? "No partition. Tunable consistency — eventual by default."
        : "No partition. Replica set healthy, reads from primary consistent.";
  }
  if (s.variant === "postgresql") {
    return "PARTITION: Primary rejects writes to partitioned replica. Availability drops, consistency preserved.";
  }
  if (s.variant === "cassandra") {
    return s.consistencyLevel === "strong"
      ? "PARTITION + CL=ALL: Cannot reach all nodes — requests blocked."
      : "PARTITION: Node 3 diverges. Writes accepted on majority — consistency lost.";
  }
  return "PARTITION: Election in progress. Old primary steps down, new primary elected.";
}

/* ── Metrics computation ─────────────────────────────── */
export function computeMetrics(state: CapAcidState) {
  const p = state.partitioned;
  const bases: Record<VariantKey, { r: number; w: number }> = {
    postgresql: { r: 8, w: 12 },
    cassandra: { r: 6, w: 8 },
    mongodb: { r: 7, w: 10 },
  };
  const base = bases[state.variant];
  state.writeLatencyMs = base.w;
  state.readLatencyMs = base.r;

  // Isolation overhead (PG)
  if (state.variant === "postgresql") {
    if (state.isolationLevel === "serializable") {
      state.writeLatencyMs += 8;
      state.readLatencyMs += 4;
    } else if (state.isolationLevel === "repeatable-read") {
      state.writeLatencyMs += 3;
      state.readLatencyMs += 2;
    }
  }

  // Consistency overhead
  if (state.consistencyLevel === "strong") state.writeLatencyMs += 6;
  else if (state.consistencyLevel === "quorum") state.writeLatencyMs += 3;

  // Partition impact
  if (p) {
    if (state.variant === "postgresql") {
      state.writeLatencyMs = 0;
      state.availabilityPct = 33;
    } else if (state.variant === "cassandra") {
      if (state.consistencyLevel === "strong") {
        state.writeLatencyMs = 0;
        state.availabilityPct = 0;
      } else {
        state.writeLatencyMs += 2;
        state.availabilityPct = 95;
      }
    } else {
      state.writeLatencyMs += 15;
      state.availabilityPct = 67;
    }
  } else {
    state.availabilityPct = state.variant === "postgresql" ? 99 : 99.9;
  }

  state.cap = deriveCap(state.variant, p, state.consistencyLevel);
  state.acid = deriveAcid(
    state.variant,
    state.isolationLevel,
    p,
    state.consistencyLevel,
  );
  state.nodes = buildNodes(state.variant, p, state.writeVersion);
  state.riskText = buildRiskText(state);
}

/* ── Initial state ───────────────────────────────────── */
export const initialState: CapAcidState = {
  variant: "postgresql",
  isolationLevel: "read-committed",
  consistencyLevel: "strong",
  partitioned: false,
  nodes: [],
  writeVersion: 1,
  acid: {
    atomicity: "full",
    consistency: "full",
    isolation: "read-committed",
    durability: "full",
  },
  cap: { c: true, a: true, p: true },
  writeLatencyMs: 12,
  readLatencyMs: 8,
  availabilityPct: 99,
  riskText: "",
  hotZones: [],
  explanation:
    "Pick a database and step through to see how CAP and ACID behave — then trigger a network partition.",
  phase: "overview",
};
computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const capAcidSlice = createSlice({
  name: "capAcid",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState, nodes: [] };
      computeMetrics(s);
      return s;
    },
    softResetRun: (state) => {
      state.hotZones = [];
      state.explanation = VARIANT_PROFILES[state.variant].description;
      state.phase = "overview";
      state.partitioned = false;
      state.writeVersion = 1;
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<CapAcidState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setVariant(state, action: PayloadAction<VariantKey>) {
      const profile = VARIANT_PROFILES[action.payload];
      state.variant = action.payload;
      state.consistencyLevel = profile.defaultConsistency;
      state.isolationLevel = profile.defaultIsolation;
      state.partitioned = false;
      state.writeVersion = 1;
      state.hotZones = [];
      state.explanation = profile.description;
      state.phase = "overview";
      computeMetrics(state);
    },
    setIsolationLevel(state, action: PayloadAction<IsolationLevel>) {
      state.isolationLevel = action.payload;
      computeMetrics(state);
    },
    setConsistencyLevel(state, action: PayloadAction<ConsistencyLevel>) {
      state.consistencyLevel = action.payload;
      computeMetrics(state);
    },
    togglePartition(state) {
      state.partitioned = !state.partitioned;
      if (state.partitioned) state.writeVersion += 1;
      computeMetrics(state);
    },
  },
});

export const {
  reset,
  softResetRun,
  patchState,
  recalcMetrics,
  setVariant,
  setIsolationLevel,
  setConsistencyLevel,
  togglePartition,
} = capAcidSlice.actions;
export default capAcidSlice.reducer;
