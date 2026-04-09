import {
  patchState,
  softResetRun,
  recalcMetrics,
  type DataManagementState,
} from "./dataManagementSlice";
import { STEPS, buildSteps, expandToken, type StepKey } from "./flow-engine";
import {
  useLabAnimation,
  type Signal,
  type UseLabAnimationConfig,
} from "../../lib/lab-engine";

export type { Signal };

const labConfig: UseLabAnimationConfig<DataManagementState, StepKey> = {
  selector: (root) => root.dataManagement as DataManagementState,
  allSteps: STEPS,
  buildSteps,
  expandToken,
  actions: () => ({
    resetRun: { create: () => softResetRun(), terminal: true },
  }),
  recalcMetrics: () => recalcMetrics(),
  patchState: (p) => patchState(p),
};

export const useDataManagementAnimation = (onAnimationComplete?: () => void) =>
  useLabAnimation(labConfig, onAnimationComplete);
