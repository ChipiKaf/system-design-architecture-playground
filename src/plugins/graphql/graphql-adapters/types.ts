import type { GraphqlState, VariantKey } from "../graphqlSlice";
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

/* ── The adapter interface ─────────────────────────────── */

export interface GraphqlAdapter {
  id: VariantKey;
  profile: VariantProfile;
  colors: VariantColors;
  computeMetrics(state: GraphqlState): void;
  expandToken(token: string, state: GraphqlState): string[] | null;
  getFlowBeats(state: GraphqlState): FlowBeat[];
  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    state: GraphqlState,
    helpers: SceneHelpers,
  ): void;
  getStatBadges(state: GraphqlState): StatBadgeConfig[];
  softReset(state: GraphqlState): void;
}
