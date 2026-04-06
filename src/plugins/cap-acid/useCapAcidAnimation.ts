import {
  patchState,
  softResetRun,
  recalcMetrics,
  togglePartition,
  type CapAcidState,
} from "./capAcidSlice";
import { STEPS, buildSteps, expandToken, type StepKey } from "./flow-engine";
import {
  useLabAnimation,
  type Signal,
  type UseLabAnimationConfig,
} from "../../lib/lab-engine";

export type { Signal };

const labConfig: UseLabAnimationConfig<CapAcidState, StepKey> = {
  selector: (root) => root.capAcid as CapAcidState,
  allSteps: STEPS,
  buildSteps,
  expandToken,
  actions: () => ({
    resetRun: { create: () => softResetRun(), terminal: true },
    triggerPartition: { create: () => togglePartition(), terminal: false },
  }),
  recalcMetrics: () => recalcMetrics(),
  patchState: (p) => patchState(p),
};

export const useCapAcidAnimation = (onAnimationComplete?: () => void) =>
  useLabAnimation(labConfig, onAnimationComplete);
