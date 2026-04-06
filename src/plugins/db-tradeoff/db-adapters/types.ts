/**
 * DbAdapter — the behavioural contract each database must implement.
 *
 * Instead of scattering `if (db === "relational") ... else if (db === "mongodb") ...`
 * throughout the slice, flow-engine and main.tsx, we define one per-database
 * object that owns all the behaviour.  Consumers just call `getAdapter(dbType)`.
 */

import type React from "react";
import type {
  ConsistencyLevel,
  DbNode,
  DbTradeoffState,
  DbType,
  OperationId,
  WorkloadId,
} from "../dbTradeoffSlice";
import type { FlowBeat, StepDef } from "../flow-engine";

/* ── Static metadata ───────────────────────────────────── */

export interface DbProfile {
  label: string; // e.g. "PostgreSQL (Relational)"
  shortLabel: string; // e.g. "PostgreSQL"
  dataModel: string; // general data-model description
  scaling: string;
  consistency: ConsistencyLevel;
  strengths: string[];
  weaknesses: string[];
}

export interface DataModelDesc {
  model: string;
  detail: string[];
}

export interface DbColors {
  fill: string; // dark node fill when highlighted
  stroke: string; // accent border
}

/* ── Metrics-related ───────────────────────────────────── */

export interface BaseLatencies {
  read: number; // base read ms
  write: number; // base write ms
  throughput: number; // base requests/sec
  scaleFactor: number; // how much throughput scales per added node (0-1)
}

export interface OpAdjustment {
  readDelta: number;
  writeDelta: number;
  throughputMultiplier: number;
  nodesTouched: number;
  staleReadRisk: boolean;
}

export interface FailureImpact {
  writeOverhead: number; // extra ms added to writes under failure
  throughputFactor: number; // multiplier on throughput under failure (e.g. 0.5)
}

export interface RpoRto {
  rpoRisk: "none" | "low" | "high";
  rtoMs: number;
}

/* ── Needs checklist ───────────────────────────────────── */

export type CheckStatus = "pass" | "warn" | "fail";

export interface NeedCheck {
  need: string;
  status: CheckStatus;
  note: string;
}

export interface NeedConceptSection {
  title: string;
  accent: string;
  content: React.ReactNode;
}

export interface NeedConcept {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: NeedConceptSection[];
}

/* ── Scene rendering ───────────────────────────────────── */

/** Bag of helpers that the adapter uses to talk back to the scene builder. */
export interface SceneHelpers {
  hot: (zone: string) => boolean;
  openConcept: (key: string) => void;
  phase: string;
  selectedOp: OperationId;
  isReadOp: (op: string) => boolean;
}

/* ── The adapter interface ─────────────────────────────── */

export interface DbAdapter {
  /** Unique key matching DbType */
  id: DbType;

  /** Static display metadata */
  profile: DbProfile;
  colors: DbColors;

  /** Data-model description per workload */
  dataModels: Record<WorkloadId, DataModelDesc>;

  /** Fit score per workload (0-100) */
  fitScores: Record<WorkloadId, number>;

  /** "Why this DB" narrative per workload */
  whyText: Record<WorkloadId, string>;

  /* ── Topology ──────────────────────────────────────── */

  /** Max nodes/shards allowed in the slider */
  maxNodes: number;

  /** Build the node array for this DB type */
  buildNodes(count: number, failedIdx: number | null): DbNode[];

  /** Pick which node to kill for the demo toggle */
  pickFailureTarget(state: DbTradeoffState): number;

  /* ── Metrics ───────────────────────────────────────── */

  baseLatencies: BaseLatencies;

  /** Per-operation latency/throughput adjustments */
  opAdjustment(op: OperationId, state: DbTradeoffState): OpAdjustment;

  /** Availability % under normal / failure conditions */
  availability(nodeCount: number, failedNode: boolean): number;

  /** Operational complexity score (1-10) */
  complexity(nodeCount: number, consistency: ConsistencyLevel): number;

  /** Impact of a node failure on latency/throughput */
  failureImpact: FailureImpact;

  /** RPO/RTO under current settings */
  rpoRto(state: DbTradeoffState, failedNode: boolean): RpoRto;

  /**
   * Extra metric adjustments that are specific to this DB.
   * Called after base metrics are computed. Mutates the passed
   * metrics object with DB-specific overrides (write concern, read
   * preference, join mode, shards touched, nodes touched, etc.).
   */
  refineMetrics(state: DbTradeoffState, metrics: RefinableMetrics): void;

  /* ── Post-compute hooks (lagging nodes, etc.) ──────── */

  /** Apply any post-node-build mutations (e.g. mark lagging replicas) */
  applyPostBuildMutations(state: DbTradeoffState): void;

  /* ── Token expansion (flow engine) ─────────────────── */

  /** Expand a $token into concrete node IDs */
  expandToken(token: string, state: DbTradeoffState): string[] | null;

  /* ── Flow engine ───────────────────────────────────── */

  /** Get DB-specific flow beats for a step */
  getRouteFlows(state: DbTradeoffState): FlowBeat[];
  getResponseFlows(state: DbTradeoffState): FlowBeat[];
  getReplicationFlows(state: DbTradeoffState): FlowBeat[];

  /** Get the explanation text for a step */
  getRouteExplanation(state: DbTradeoffState): string;
  getResponseExplanation(state: DbTradeoffState): string;
  getReplicationExplanation(state: DbTradeoffState): string;

  /** Reorder steps based on DB-specific rules (e.g. w:majority) */
  reorderSteps(steps: StepDef[], state: DbTradeoffState): StepDef[];

  /* ── Needs checklist ───────────────────────────────── */

  /** Evaluate how well this DB meets each workload need */
  evaluateNeeds(workload: WorkloadId, state: DbTradeoffState): NeedCheck[];

  /* ── Scene (VizCraft topology) ─────────────────────── */

  /** Build the DB-topology portion of the VizCraft scene */
  buildTopology(
    builder: any, // viz() builder instance
    state: DbTradeoffState,
    helpers: SceneHelpers,
  ): void;

  /** Build any annotation overlays (CL labels, join-mode, stale warning) */
  buildAnnotationOverlays(
    builder: any,
    state: DbTradeoffState,
    helpers: SceneHelpers,
    viewW: number,
    viewH: number,
  ): void;

  /** DB-specific stat badges for the header */
  getStatBadges(state: DbTradeoffState): StatBadgeConfig[];

  /* ── Soft reset per animation pass ─────────────────── */

  /** Randomize per-pass state (shard idx, coordinator, etc.) */
  softReset(state: DbTradeoffState): void;

  /* ── Default consistency on DB change ──────────────── */

  /** Called when user switches to this DB. Returns the default consistency level. */
  defaultConsistency(): ConsistencyLevel;
}

/* ── Shared helper types ───────────────────────────────── */

export interface RefinableMetrics {
  writeMs: number;
  readMs: number;
  staleReadRisk: boolean;
  nodesTouched: number;
  shardsTouched: number;
}

export interface StatBadgeConfig {
  label: string;
  value: string | number;
  color: string;
}
