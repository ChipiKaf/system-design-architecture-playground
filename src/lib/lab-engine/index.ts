/* ═══════════════════════════════════════════════════════════
 *  Lab Engine — Public API
 *
 *  Usage:
 *    import {
 *      type FlowBeat, type StepDef, type TaggedStep,
 *      type LabState, type ActionMapping, type Signal,
 *      buildSteps, executeFlow, useLabAnimation,
 *    } from "../../lib/lab-engine";
 * ═══════════════════════════════════════════════════════════ */

/* ── Types ────────────────────────────────────────────── */
export type {
  FlowBeat,
  StepDef,
  TaggedStep,
  FlowExecutorDeps,
  LabState,
  ActionMapping,
} from "./types";

/* ── Runtime ──────────────────────────────────────────── */
export { buildSteps, executeFlow } from "./flow-engine";
export { useLabAnimation } from "./useLabAnimation";
export type { Signal, UseLabAnimationConfig } from "./useLabAnimation";
