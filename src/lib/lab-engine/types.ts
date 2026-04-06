/* ═══════════════════════════════════════════════════════════
 *  Lab Engine — Shared types for comparison-sandbox plugins
 *
 *  Every "lab" plugin (Failover Lab, DB Tradeoff Lab, …)
 *  re-uses these generic building blocks so the animation
 *  lifecycle, step engine, and flow executor are consistent.
 * ═══════════════════════════════════════════════════════════ */

/* ── Minimal state contract every lab plugin must satisfy ── */

export interface LabState {
  phase: string;
  explanation: string;
  hotZones: string[];
}

/* ── Flow Beat ────────────────────────────────────────── */

export interface FlowBeat<S> {
  from: string;
  to: string;
  when?: (s: S) => boolean;
  color?: string | ((s: S) => string);
  duration?: number;
  explain?: string;
}

/* ── Step Definition ──────────────────────────────────── */

export interface StepDef<S, K extends string = string> {
  key: K;
  label: string;
  when?: (s: S) => boolean;
  nextButton?: string | ((s: S) => string);
  nextButtonColor?: string;
  processingText?: string;
  phase?: string | ((s: S) => string);
  flow?: FlowBeat<S>[] | ((s: S) => FlowBeat<S>[]);
  delay?: number;
  recalcMetrics?: boolean;
  finalHotZones?: string[] | ((s: S) => string[]);
  explain?: string | ((s: S) => string);
  action?: string;
}

/* ── Tagged Step (visible-step tuple for the Shell) ───── */

export interface TaggedStep<K extends string = string> {
  key: K;
  label: string;
  autoAdvance?: boolean;
  nextButtonText?: string;
  nextButtonColor?: string;
  processingText?: string;
}

/* ── Flow executor dependency bag ─────────────────────── */

export interface FlowExecutorDeps<S> {
  animateParallel: (
    pairs: { from: string; to: string }[],
    duration: number,
    color?: string,
  ) => Promise<void>;
  patch: (p: Partial<S>) => void;
  getState: () => S;
  cancelled: () => boolean;
}

/* ── Action mapping for the generic animation hook ────── */

export interface ActionMapping {
  /** Action creator — the hook calls dispatch(create()) */
  create: () => { type: string };
  /**
   * If true, the step executor finishes immediately after
   * dispatching (e.g. "reset" / "softReset" actions).
   */
  terminal?: boolean;
}
