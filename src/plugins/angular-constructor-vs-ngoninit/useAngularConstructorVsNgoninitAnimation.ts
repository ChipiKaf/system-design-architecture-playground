import {
  patchState,
  softResetRun,
  recalcMetrics,
  type AngularConstructorVsNgoninitState,
} from "./angularConstructorVsNgoninitSlice";
import { STEPS, buildSteps, expandToken, type StepKey } from "./flow-engine";
import {
  useLabAnimation,
  type Signal,
  type UseLabAnimationConfig,
} from "../../lib/lab-engine";

export type { Signal };

const labConfig: UseLabAnimationConfig<AngularConstructorVsNgoninitState, StepKey> = {
  selector: (root) => root.angularConstructorVsNgoninit as AngularConstructorVsNgoninitState,
  allSteps: STEPS,
  buildSteps,
  expandToken,
  actions: () => ({
    resetRun: { create: () => softResetRun(), terminal: true },
    // TODO: add more action mappings as needed
  }),
  recalcMetrics: () => recalcMetrics(),
  patchState: (p) => patchState(p),
};

export const useAngularConstructorVsNgoninitAnimation = (onAnimationComplete?: () => void) =>
  useLabAnimation(labConfig, onAnimationComplete);
