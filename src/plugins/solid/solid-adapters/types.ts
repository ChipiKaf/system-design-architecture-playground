/**
 * SolidAdapter — the behavioural contract each SOLID principle must implement.
 *
 * Each principle (SRP, OCP, LSP, ISP, DIP) implements this interface
 * to provide its own topology, metrics, flows, and explanations.
 * Consumers call `getAdapter(variant)`.
 */

import type { SolidState, VariantKey } from "../solidSlice";
import type { FlowBeat } from "../flow-engine";

/* ── Static metadata ───────────────────────────────────── */

export interface VariantProfile {
  label: string;
  acronym: string;
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

export interface SolidAdapter {
  id: VariantKey;
  profile: VariantProfile;
  colors: VariantColors;

  computeMetrics(state: SolidState): void;
  expandToken(token: string, state: SolidState): string[] | null;
  getFlowBeats(state: SolidState): FlowBeat[];

  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    state: SolidState,
    helpers: SceneHelpers,
  ): void;

  getStatBadges(state: SolidState): StatBadgeConfig[];
  softReset(state: SolidState): void;
}
