/**
 * AngularConstructorVsNgoninitAdapter — the behavioural contract each variant must implement.
 *
 * Instead of scattering \`if (variant === "variant-a") … else …\`
 * throughout the slice, flow-engine, and main.tsx, each variant
 * implements this interface.  Consumers call \`getAdapter(variant)\`.
 */

import type { AngularConstructorVsNgoninitState, VariantKey } from "../angularConstructorVsNgoninitSlice";
import type { FlowBeat } from "../flow-engine";

/* ── Static metadata ───────────────────────────────────── */

export interface VariantProfile {
  label: string;
  description: string;
}

export interface VariantColors {
  fill: string;   // dark node fill when highlighted
  stroke: string; // accent border
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

export interface AngularConstructorVsNgoninitAdapter {
  /** Unique key matching VariantKey */
  id: VariantKey;

  /** Static display metadata */
  profile: VariantProfile;
  colors: VariantColors;

  /* ── Metrics ───────────────────────────────────────── */

  /** Compute and mutate derived metrics on the state */
  computeMetrics(state: AngularConstructorVsNgoninitState): void;

  /* ── Token expansion (flow engine) ─────────────────── */

  /** Expand a $token into concrete node IDs, or null to use the token as-is */
  expandToken(token: string, state: AngularConstructorVsNgoninitState): string[] | null;

  /* ── Flow engine ───────────────────────────────────── */

  /** Return adapter-specific flow beats for the main traffic step */
  getFlowBeats(state: AngularConstructorVsNgoninitState): FlowBeat[];

  /* ── Scene (VizCraft topology) ─────────────────────── */

  /** Build the topology portion of the VizCraft scene */
  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any -- viz() builder
    state: AngularConstructorVsNgoninitState,
    helpers: SceneHelpers,
  ): void;

  /** Stat badges for the header */
  getStatBadges(state: AngularConstructorVsNgoninitState): StatBadgeConfig[];

  /* ── Soft reset per animation pass ─────────────────── */

  /** Reset per-pass state (randomise, etc.) */
  softReset(state: AngularConstructorVsNgoninitState): void;
}
