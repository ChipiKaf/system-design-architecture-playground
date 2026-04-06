/* ═══════════════════════════════════════════════════════════
 *  Lab Engine — Generic animation hook
 *
 *  useLabAnimation() provides the common step-executor
 *  lifecycle shared by every comparison-sandbox plugin:
 *
 *    cleanup → action → phase → hotZones → flow → recalc →
 *    delay → finalHotZones → explain → finish
 * ═══════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { UnknownAction } from "@reduxjs/toolkit";
import type { SignalOverlayParams } from "vizcraft";
import type { RootState } from "../../store/store";
import { executeFlow } from "./flow-engine";
import type {
  ActionMapping,
  FlowBeat,
  LabState,
  StepDef,
  TaggedStep,
} from "./types";

/* ── Signal type (shared across all labs) ─────────────── */

export type Signal = { id: string; colorClass?: string } & SignalOverlayParams;

/* ── Hook configuration ───────────────────────────────── */

export interface UseLabAnimationConfig<S extends LabState, K extends string> {
  /** Redux selector that returns the plugin's state slice */
  selector: (root: RootState) => S;

  /** The full step-definition array (un-filtered) */
  allSteps: StepDef<S, K>[];

  /** Build the visible, ordered steps for the current state */
  buildSteps: (state: S) => TaggedStep<K>[];

  /** Expand `$tokens` in FlowBeat from/to fields */
  expandToken: (token: string, state: S) => string[];

  /** Map of action key → { create(), terminal? } */
  actions: (
    dispatch: ReturnType<typeof useDispatch>,
  ) => Record<string, ActionMapping>;

  /** Dispatch to recalculate metrics */
  recalcMetrics: () => UnknownAction;

  /** Dispatch to patch partial state */
  patchState: (p: Partial<S>) => UnknownAction;
}

/* ── The hook ─────────────────────────────────────────── */

export function useLabAnimation<S extends LabState, K extends string>(
  config: UseLabAnimationConfig<S, K>,
  onAnimationComplete?: () => void,
) {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((s: RootState) => s.simulation);
  const runtime = useSelector(config.selector) as S;

  const [signals, setSignals] = useState<Signal[]>([]);
  const rafRef = useRef<number>(0);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const onCompleteRef = useRef(onAnimationComplete);
  const runtimeRef = useRef(runtime);

  onCompleteRef.current = onAnimationComplete;
  runtimeRef.current = runtime;

  /* ── Utilities ──────────────────────────────────────── */

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
    setSignals([]);
  }, []);

  const sleep = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, ms);
        timeoutsRef.current.push(id);
      }),
    [],
  );

  const animateParallel = useCallback(
    (pairs: { from: string; to: string }[], duration: number, color?: string) =>
      new Promise<void>((resolve) => {
        const start = performance.now();
        const colorClass =
          color === "#22c55e"
            ? "viz-signal viz-signal-green"
            : color === "#f59e0b"
              ? "viz-signal viz-signal-amber"
              : undefined;
        const sigs: Signal[] = pairs.map((p, i) => ({
          id: `sig-${Date.now()}-${i}`,
          from: p.from,
          to: p.to,
          progress: 0,
          magnitude: 0.85,
          ...(color ? { color, glowColor: color } : {}),
          ...(colorClass ? { colorClass } : {}),
        }));

        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setSignals(sigs.map((s) => ({ ...s, progress: p })));
          if (p < 1) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };
        rafRef.current = requestAnimationFrame(tick);
      }),
    [],
  );

  /* ── Resolve current step ──────────────────────────── */

  const steps = config.buildSteps(runtime);
  const currentKey: K | undefined = steps[currentStep]?.key;

  /* ── Build action map ──────────────────────────────── */

  const actionsRef = useRef(config.actions(dispatch));
  actionsRef.current = config.actions(dispatch);

  /* ── Generic step executor ─────────────────────────── */

  useEffect(() => {
    let cancelled = false;
    cleanup();

    const finish = () => {
      if (!cancelled) setTimeout(() => onCompleteRef.current?.(), 0);
    };
    const rt = () => runtimeRef.current;
    const doPatch = (p: Partial<S>) => dispatch(config.patchState(p));

    const stepDef = config.allSteps.find((s) => s.key === currentKey);
    if (!stepDef) {
      finish();
      return cleanup;
    }

    /* Resolve helpers that may be literal or function */
    const resolveFhz = (): string[] | undefined => {
      const f = stepDef.finalHotZones;
      if (f === undefined) return undefined;
      return typeof f === "function" ? f(rt()) : f;
    };

    const run = async () => {
      /* 1. Dispatch actions */
      if (stepDef.action) {
        const mapping = actionsRef.current[stepDef.action];
        if (mapping) {
          dispatch(mapping.create() as UnknownAction);
          if (mapping.terminal) {
            finish();
            return;
          }
        }
      }

      /* 2. Resolve flow */
      const resolvedFlow: FlowBeat<S>[] | undefined =
        typeof stepDef.flow === "function" ? stepDef.flow(rt()) : stepDef.flow;

      /* 3. Recalc metrics early (non-flow steps) */
      if (stepDef.recalcMetrics && !resolvedFlow) {
        dispatch(config.recalcMetrics());
      }

      /* 4. Set phase */
      if (stepDef.phase) {
        const phase =
          typeof stepDef.phase === "function"
            ? stepDef.phase(rt())
            : stepDef.phase;
        doPatch({ phase } as Partial<S>);
      }

      /* 5. Set initial hot zones for non-flow steps */
      const fhzNoFlow = resolveFhz();
      if (fhzNoFlow !== undefined && !resolvedFlow) {
        doPatch({ hotZones: fhzNoFlow } as Partial<S>);
      }

      /* 6. Execute flow beats */
      if (resolvedFlow && resolvedFlow.length > 0) {
        await executeFlow(
          resolvedFlow,
          {
            animateParallel,
            patch: doPatch,
            getState: rt,
            cancelled: () => cancelled,
          },
          config.expandToken,
        );
        if (cancelled) return;
      }

      /* 7. Recalc metrics after flow */
      if (stepDef.recalcMetrics && resolvedFlow) {
        dispatch(config.recalcMetrics());
      }

      /* 8. Delay */
      if (stepDef.delay) {
        await sleep(stepDef.delay);
        if (cancelled) return;
      }

      /* 9. Final hot zones */
      const fhz = resolveFhz();
      if (fhz !== undefined) {
        doPatch({ hotZones: fhz } as Partial<S>);
      } else if (!resolvedFlow) {
        doPatch({ hotZones: [] as string[] } as Partial<S>);
      }

      /* 10. Final explanation */
      if (stepDef.explain) {
        const explanation =
          typeof stepDef.explain === "function"
            ? stepDef.explain(rt())
            : stepDef.explain;
        doPatch({ explanation } as Partial<S>);
      }

      finish();
    };

    run();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [currentStep, currentKey, cleanup, dispatch, sleep, animateParallel]);

  return { runtime, signals };
}
