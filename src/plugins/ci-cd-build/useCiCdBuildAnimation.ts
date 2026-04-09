import {
  patchState,
  softResetRun,
  recalcMetrics,
  type CiCdBuildState,
} from "./ciCdBuildSlice";
import { STEPS, buildSteps, expandToken, type StepKey } from "./flow-engine";
import {
  useLabAnimation,
  type Signal,
  type UseLabAnimationConfig,
} from "../../lib/lab-engine";

export type { Signal };

const labConfig: UseLabAnimationConfig<CiCdBuildState, StepKey> = {
  selector: (root) => root.ciCdBuild as CiCdBuildState,
  allSteps: STEPS,
  buildSteps,
  expandToken,
  actions: () => ({
    resetRun: { create: () => softResetRun(), terminal: true },
  }),
  recalcMetrics: () => recalcMetrics(),
  patchState: (p) => patchState(p),
};

export const useCiCdBuildAnimation = (onAnimationComplete?: () => void) =>
  useLabAnimation(labConfig, onAnimationComplete);
