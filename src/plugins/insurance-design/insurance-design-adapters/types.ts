import type { InsuranceDesignState, VariantKey } from "../insuranceDesignSlice";
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

export interface InsuranceDesignAdapter {
  id: VariantKey;
  profile: VariantProfile;
  colors: VariantColors;
  canvasSize?: { width: number; height: number };
  computeMetrics(state: InsuranceDesignState): void;
  expandToken(token: string, state: InsuranceDesignState): string[] | null;
  getFlowBeats(state: InsuranceDesignState): FlowBeat[];
  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    state: InsuranceDesignState,
    helpers: SceneHelpers,
  ): void;
  getStatBadges(state: InsuranceDesignState): StatBadgeConfig[];
  softReset(state: InsuranceDesignState): void;
}
