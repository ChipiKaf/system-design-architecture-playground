import {
  patchState,
  softResetRun,
  recalcMetrics,
  type CommPatternsState,
} from "./commPatternsSlice";
import { STEPS, buildSteps, expandToken, type StepKey } from "./flow-engine";
import {
  useLabAnimation,
  type Signal,
  type UseLabAnimationConfig,
} from "../../lib/lab-engine";

export type { Signal };

const labConfig: UseLabAnimationConfig<CommPatternsState, StepKey> = {
  selector: (root) => root.commPatterns as CommPatternsState,
  allSteps: STEPS,
  buildSteps,
  expandToken,
  actions: () => ({
    resetRun: { create: () => softResetRun(), terminal: true },
  }),
  recalcMetrics: () => recalcMetrics(),
  patchState: (p) => patchState(p),
};

export const useCommPatternsAnimation = (onAnimationComplete?: () => void) =>
  useLabAnimation(labConfig, onAnimationComplete);
