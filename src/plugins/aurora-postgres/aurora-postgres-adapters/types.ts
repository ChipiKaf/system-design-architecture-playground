import type { AuroraPostgresState, VariantKey } from "../auroraPostgresSlice";
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

export interface AuroraPostgresAdapter {
  id: VariantKey;
  profile: VariantProfile;
  colors: VariantColors;
  computeMetrics(state: AuroraPostgresState): void;
  expandToken(token: string, state: AuroraPostgresState): string[] | null;
  getFlowBeats(state: AuroraPostgresState): FlowBeat[];
  getStepLabels(): string[];
  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    state: AuroraPostgresState,
    helpers: SceneHelpers,
  ): void;
  getStatBadges(state: AuroraPostgresState): StatBadgeConfig[];
  softReset(state: AuroraPostgresState): void;
}
