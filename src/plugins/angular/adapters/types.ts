import type { AngularState, VariantKey } from "../angularSlice";
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

export interface AngularAdapter {
  id: VariantKey;
  profile: VariantProfile;
  colors: VariantColors;
  computeMetrics(state: AngularState): void;
  expandToken(token: string, state: AngularState): string[] | null;
  getFlowBeats(state: AngularState): FlowBeat[];
  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    state: AngularState,
    helpers: SceneHelpers,
  ): void;
  getStatBadges(state: AngularState): StatBadgeConfig[];
  softReset(state: AngularState): void;
}
