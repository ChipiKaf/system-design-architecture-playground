import type { NextjsState, VariantKey } from "../nextjsSlice";
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

export interface NextjsAdapter {
  id: VariantKey;
  profile: VariantProfile;
  colors: VariantColors;
  computeMetrics(state: NextjsState): void;
  expandToken(token: string, state: NextjsState): string[] | null;
  getFlowBeats(state: NextjsState): FlowBeat[];
  getStepLabels(): string[];
  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    state: NextjsState,
    helpers: SceneHelpers,
  ): void;
  getStatBadges(state: NextjsState): StatBadgeConfig[];
  softReset(state: NextjsState): void;
}
