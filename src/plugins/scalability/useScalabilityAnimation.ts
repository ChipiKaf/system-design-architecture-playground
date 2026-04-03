import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import {
  patchState,
  reset,
  recalcMetrics,
  type ScalabilityState,
} from "./scalabilitySlice";
import { STEPS, buildSteps, executeFlow, type StepKey } from "./flow-engine";

export type Signal = { id: string; color?: string } & SignalOverlayParams;

/* ──────────────────────────────────────────────────────────
   Declarative animation hook.

   Reads step config from STEPS, resolves the current step
   key, then uses executeFlow to run the declared beats.
   No per-step imperative code needed.
   ────────────────────────────────────────────────────────── */

export const useScalabilityAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector(
    (state: RootState) => state.scalability,
  ) as ScalabilityState;
  const [signals, setSignals] = useState<Signal[]>([]);
  const rafRef = useRef<number>(0);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const onCompleteRef = useRef(onAnimationComplete);
  const runtimeRef = useRef(runtime);

  onCompleteRef.current = onAnimationComplete;
  runtimeRef.current = runtime;

  /* ── Helpers ──────────────────────────────────────── */
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
    (pairs: { from: string; to: string }[], duration: number) => {
      return new Promise<void>((resolve) => {
        const start = performance.now();
        const sigs = pairs.map((p, i) => ({
          id: `par-${i}-${Date.now()}`,
          from: p.from,
          to: p.to,
          progress: 0,
          magnitude: 0.8,
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
      });
    },
    [],
  );

  /* ── Resolve current step ─────────────────────────── */
  const steps = buildSteps(runtime);
  const currentKey: StepKey | undefined = steps[currentStep]?.key;

  /* ── Generic step executor ────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    cleanup();

    const finish = () => {
      if (!cancelled) setTimeout(() => onCompleteRef.current?.(), 0);
    };
    const rt = () => runtimeRef.current;
    const doPatch = (p: Partial<ScalabilityState>) => dispatch(patchState(p));

    // Find the step definition
    const stepDef = STEPS.find((s) => s.key === currentKey);
    if (!stepDef) {
      finish();
      return cleanup;
    }

    const run = async () => {
      // 1. Special actions (escape hatch)
      if (stepDef.action === "reset") {
        dispatch(reset());
        finish();
        return;
      }

      // 2. Recalc metrics early (for steps that read derived state, e.g. observe-metrics)
      if (stepDef.recalcMetrics && !stepDef.flow) {
        dispatch(recalcMetrics());
      }

      // 3. Set phase
      if (stepDef.phase) {
        const phase =
          typeof stepDef.phase === "function"
            ? stepDef.phase(rt())
            : stepDef.phase;
        doPatch({ phase });
      }

      // 4. Set initial hot zones for non-flow steps
      if (stepDef.finalHotZones !== undefined && !stepDef.flow) {
        doPatch({ hotZones: stepDef.finalHotZones });
      }

      // 5. Execute flow beats (if any)
      if (stepDef.flow) {
        await executeFlow(stepDef.flow, {
          animateParallel,
          patch: doPatch,
          getState: rt,
          cancelled: () => cancelled,
        });
        if (cancelled) return;
      }

      // 6. Recalc after flow (for steps like send-traffic)
      if (stepDef.recalcMetrics && stepDef.flow) {
        dispatch(recalcMetrics());
      }

      // 7. Delay (if specified)
      if (stepDef.delay) {
        await sleep(stepDef.delay);
        if (cancelled) return;
      }

      // 8. Final hot zones (after flow clears its own)
      if (stepDef.finalHotZones !== undefined) {
        doPatch({ hotZones: stepDef.finalHotZones });
      } else if (!stepDef.flow) {
        // No flow and no explicit zones → clear
        doPatch({ hotZones: [] });
      }

      // 9. Final explanation
      if (stepDef.explain) {
        const explanation =
          typeof stepDef.explain === "function"
            ? stepDef.explain(rt())
            : stepDef.explain;
        doPatch({ explanation });
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
};
