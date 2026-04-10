import type { PostgresqlState, VariantKey } from "../postgresqlSlice";
import type { FlowBeat } from "../flow-engine";

/* ── Static metadata ───────────────────────────────────── */

export interface VariantProfile {
  label: string;
  description: string;
}

export interface VariantColors {
  fill: string;
  stroke: string;
}

/* ── Scene rendering ───────────────────────────────────── */

export interface SceneHelpers {
  hot: (zone: string) => boolean;
  phase: string;
}

export interface StatBadgeConfig {
  label: string;
  value: string | number;
  color: string;
}

export interface StrategyNotes {
  queryPatterns: string;
  operatorFit: string;
  workloadFit: string;
  compositeAdvice: string;
  summary: string;
  exampleSql: string;
  exampleTable?: { header: string[]; rows: string[][] };
}

/* ── The adapter interface ─────────────────────────────── */

export interface PostgresqlAdapter {
  id: VariantKey;
  profile: VariantProfile;
  colors: VariantColors;
  notes: StrategyNotes;
  computeMetrics(state: PostgresqlState): void;
  expandToken(token: string, state: PostgresqlState): string[] | null;
  getFlowBeats(state: PostgresqlState): FlowBeat[];
  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    state: PostgresqlState,
    helpers: SceneHelpers,
  ): void;
  getStatBadges(state: PostgresqlState): StatBadgeConfig[];
  softReset(state: PostgresqlState): void;
}
