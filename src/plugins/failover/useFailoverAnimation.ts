import {
  patchState,
  reset,
  softReset,
  recalcMetrics,
  failPrimary,
  promoteSecondary,
  completeFailover,
  type FailoverState,
} from "./failoverSlice";
import { STEPS, buildSteps, expandToken, type StepKey } from "./flow-engine";
import {
  useLabAnimation,
  type Signal,
  type UseLabAnimationConfig,
} from "../../lib/lab-engine";

export type { Signal };

const labConfig: UseLabAnimationConfig<FailoverState, StepKey> = {
  selector: (root) => root.failover as FailoverState,
  allSteps: STEPS,
  buildSteps,
  expandToken,
  actions: () => ({
    reset: { create: () => reset(), terminal: true },
    softReset: { create: () => softReset(), terminal: true },
    failPrimary: { create: () => failPrimary() },
    promoteSecondary: { create: () => promoteSecondary() },
    completeFailover: { create: () => completeFailover() },
  }),
  recalcMetrics: () => recalcMetrics(),
  patchState: (p) => patchState(p),
};

export const useFailoverAnimation = (onAnimationComplete?: () => void) =>
  useLabAnimation(labConfig, onAnimationComplete);
