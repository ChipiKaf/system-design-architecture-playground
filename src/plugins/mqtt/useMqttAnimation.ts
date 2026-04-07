import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import {
  patchState,
  reset,
  recalcMetrics,
  incrementMessages,
  type MqttState,
} from "./mqttSlice";
import { STEPS, buildSteps, executeFlow, type StepKey } from "./flow-engine";

export type Signal = { id: string; color?: string } & SignalOverlayParams;

export const useMqttAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector((state: RootState) => state.mqtt) as MqttState;
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

  const steps = buildSteps(runtime);
  const currentKey: StepKey | undefined = steps[currentStep]?.key;

  useEffect(() => {
    let cancelled = false;
    cleanup();

    const finish = () => {
      if (!cancelled) setTimeout(() => onCompleteRef.current?.(), 0);
    };
    const rt = () => runtimeRef.current;
    const doPatch = (p: Partial<MqttState>) => dispatch(patchState(p));

    const stepDef = STEPS.find((s) => s.key === currentKey);
    if (!stepDef) {
      finish();
      return cleanup;
    }

    const run = async () => {
      // 1. Special actions
      if (stepDef.action === "reset") {
        dispatch(reset());
        finish();
        return;
      }

      // 2. Recalc metrics early (non-flow steps)
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

      // 4. Hot zones for non-flow steps
      if (stepDef.finalHotZones !== undefined && !stepDef.flow) {
        doPatch({ hotZones: stepDef.finalHotZones });
      }

      // 5. Execute flow beats
      if (stepDef.flow) {
        await executeFlow(stepDef.flow, {
          animateParallel,
          patch: doPatch,
          getState: rt,
          cancelled: () => cancelled,
        });
        if (cancelled) return;
      }

      // 6. Recalc after flow
      if (stepDef.recalcMetrics && stepDef.flow) {
        dispatch(recalcMetrics());
      }

      // 7. Increment message counter after publish→deliver
      if (stepDef.key === "broker-deliver") {
        dispatch(incrementMessages());
      }

      // 8. Delay
      if (stepDef.delay) {
        await sleep(stepDef.delay);
        if (cancelled) return;
      }

      // 9. Final hot zones
      if (stepDef.finalHotZones !== undefined) {
        doPatch({ hotZones: stepDef.finalHotZones });
      } else if (!stepDef.flow) {
        doPatch({ hotZones: [] });
      }

      // 10. Final explanation
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
