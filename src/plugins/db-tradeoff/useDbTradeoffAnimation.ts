import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import type { RootState } from "../../store/store";
import {
  patchState,
  softResetRun,
  recalcMetrics,
  type DbTradeoffState,
} from "./dbTradeoffSlice";
import { STEPS, buildSteps, executeFlow, type StepKey } from "./flow-engine";

export type Signal = { id: string; colorClass?: string } & SignalOverlayParams;

export const useDbTradeoffAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector(
    (state: RootState) => state.dbTradeoff,
  ) as DbTradeoffState;

  const [signals, setSignals] = useState<Signal[]>([]);
  const rafRef = useRef<number>(0);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const onCompleteRef = useRef(onAnimationComplete);
  const runtimeRef = useRef(runtime);

  onCompleteRef.current = onAnimationComplete;
  runtimeRef.current = runtime;

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
    (
      pairs: { from: string; to: string }[],
      duration: number,
      color?: string,
    ) => {
      return new Promise<void>((resolve) => {
        const start = performance.now();
        const colorClass =
          color === "#22c55e"
            ? "viz-signal viz-signal-green"
            : color === "#f59e0b"
              ? "viz-signal viz-signal-amber"
              : undefined;
        const sigs = pairs.map((p, i) => ({
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
      });
    },
    [],
  );

  const steps = buildSteps(runtime);
  const currentKey: StepKey | undefined = steps[currentStep]?.key;

  useEffect(() => {
    let cancelled = false;
    cleanup();

    const finish = () => {
      if (!cancelled) setTimeout(() => onCompleteRef.current?.(), 0);
    };

    const rt = () => runtimeRef.current;
    const doPatch = (p: Partial<DbTradeoffState>) => dispatch(patchState(p));

    const stepDef = STEPS.find((s) => s.key === currentKey);
    if (!stepDef) {
      finish();
      return cleanup;
    }

    const getFhz = (): string[] | undefined => {
      const f = stepDef.finalHotZones;
      if (f === undefined) return undefined;
      return typeof f === "function" ? f(rt()) : f;
    };

    const run = async () => {
      if (stepDef.action === "resetRun") {
        dispatch(softResetRun());
        finish();
        return;
      }

      if (stepDef.recalcMetrics && !stepDef.flow) {
        dispatch(recalcMetrics());
      }

      if (stepDef.phase) {
        const phase =
          typeof stepDef.phase === "function"
            ? stepDef.phase(rt())
            : stepDef.phase;
        doPatch({ phase });
      }

      const fhzNoFlow = getFhz();
      if (fhzNoFlow !== undefined && !stepDef.flow) {
        doPatch({ hotZones: fhzNoFlow });
      }

      if (stepDef.flow) {
        await executeFlow(stepDef.flow, {
          animateParallel,
          patch: doPatch,
          getState: rt,
          cancelled: () => cancelled,
        });
        if (cancelled) return;
      }

      if (stepDef.recalcMetrics && stepDef.flow) {
        dispatch(recalcMetrics());
      }

      if (stepDef.delay) {
        await sleep(stepDef.delay);
        if (cancelled) return;
      }

      const fhz = getFhz();
      if (fhz !== undefined) {
        doPatch({ hotZones: fhz });
      } else if (!stepDef.flow) {
        doPatch({ hotZones: [] });
      }

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
