/**
 * EcommerceCapAdapter — the behavioural contract each e-commerce service
 * implements for the CAP comparison lab.
 *
 * Instead of scattering `if (serviceType === "catalog") ...` branches through
 * the slice, flow-engine, and scene, each service owns its own CAP trade-off.
 */

import type {
  CapMode,
  EcommerceCapState,
  ServiceType,
} from "../ecommerceCapSlice";
import type { FlowBeat } from "../flow-engine";

/* ── Static metadata ───────────────────────────────────── */

export interface ServiceProfile {
  label: string;
  shortLabel: string;
  capMode: CapMode;
  description: string;
  patterns: string[];
  criticalNodes: string[];
}

export interface ServiceColors {
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

export interface EcommerceCapAdapter {
  /** Unique key matching ServiceType */
  id: ServiceType;

  /** Static display metadata */
  profile: ServiceProfile;
  colors: ServiceColors;

  /* ── Metrics ───────────────────────────────────────── */

  computeMetrics(state: EcommerceCapState): void;

  /* ── Token expansion (flow engine) ─────────────────── */

  expandToken(token: string, state: EcommerceCapState): string[] | null;

  /* ── Flow engine ───────────────────────────────────── */

  getHealthyFlows(state: EcommerceCapState): FlowBeat[];
  getPartitionFlows(state: EcommerceCapState): FlowBeat[];
  getDecisionFlows(state: EcommerceCapState): FlowBeat[];
  getOutcomeFlows(state: EcommerceCapState): FlowBeat[];

  getHealthyExplanation(state: EcommerceCapState): string;
  getPartitionExplanation(state: EcommerceCapState): string;
  getDecisionExplanation(state: EcommerceCapState): string;
  getOutcomeExplanation(state: EcommerceCapState): string;

  /* ── Scene (VizCraft topology) ─────────────────────── */

  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any -- viz() builder
    state: EcommerceCapState,
    helpers: SceneHelpers,
  ): void;

  getStatBadges(state: EcommerceCapState): StatBadgeConfig[];

  /* ── Soft reset per animation pass ─────────────────── */

  softReset(state: EcommerceCapState): void;
}
