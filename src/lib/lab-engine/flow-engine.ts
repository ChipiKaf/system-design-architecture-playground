/* ═══════════════════════════════════════════════════════════
 *  Lab Engine — Generic flow engine
 *
 *  buildSteps()   — filter + reorder active steps
 *  executeFlow()  — iterate beats, expand tokens, animate
 * ═══════════════════════════════════════════════════════════ */

import type {
  FlowBeat,
  FlowExecutorDeps,
  LabState,
  StepDef,
  TaggedStep,
} from "./types";

/* ── Build active steps from config ───────────────────── */

export function buildSteps<S extends LabState, K extends string>(
  allSteps: StepDef<S, K>[],
  state: S,
  opts?: {
    /** Optional post-filter reorder (e.g. adapter.reorderSteps) */
    reorder?: (steps: StepDef<S, K>[], state: S) => StepDef<S, K>[];
    /** Optional per-step label transform */
    relabel?: (step: StepDef<S, K>, state: S) => string;
  },
): TaggedStep<K>[] {
  let active = allSteps.filter((s) => !s.when || s.when(state));

  if (opts?.reorder) {
    active = opts.reorder(active, state);
  }

  return active.map((step, i) => {
    const nextStep = active[i + 1];

    let nextButtonText: string | undefined;
    if (typeof step.nextButton === "function") {
      nextButtonText = step.nextButton(state);
    } else if (typeof step.nextButton === "string") {
      nextButtonText = step.nextButton;
    } else if (nextStep) {
      nextButtonText = nextStep.label;
    }

    const label = opts?.relabel ? opts.relabel(step, state) : step.label;

    return {
      key: step.key,
      label,
      autoAdvance: false,
      nextButtonText,
      nextButtonColor: step.nextButtonColor,
      processingText: step.processingText,
    };
  });
}

/* ── Flow executor ────────────────────────────────────── */

export async function executeFlow<S extends LabState>(
  beats: FlowBeat<S>[],
  deps: FlowExecutorDeps<S>,
  expandToken: (token: string, state: S) => string[],
): Promise<void> {
  for (const beat of beats) {
    if (deps.cancelled()) return;

    const state = deps.getState();
    if (beat.when && !beat.when(state)) continue;

    const froms = expandToken(beat.from, state);
    const tos = expandToken(beat.to, state);

    const pairs: { from: string; to: string }[] = [];
    for (const f of froms) {
      for (const t of tos) {
        if (f !== t) pairs.push({ from: f, to: t });
      }
    }
    if (pairs.length === 0) continue;

    const hotZones = [...new Set([...froms, ...tos])];
    const update: Partial<S> = { hotZones } as Partial<S>;
    if (beat.explain)
      (update as Record<string, unknown>).explanation = beat.explain;
    deps.patch(update);

    const color =
      typeof beat.color === "function" ? beat.color(state) : beat.color;
    await deps.animateParallel(pairs, beat.duration ?? 650, color);
  }
}
