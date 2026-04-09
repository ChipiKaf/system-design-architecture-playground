import {
  patchState,
  softResetRun,
  recalcMetrics,
  type SyncVsEventDrivenState,
} from "./syncVsEventDrivenSlice";
import { STEPS, buildSteps, expandToken, type StepKey } from "./flow-engine";
import {
  useLabAnimation,
  type Signal,
  type UseLabAnimationConfig,
} from "../../lib/lab-engine";

export type { Signal };

const labConfig: UseLabAnimationConfig<SyncVsEventDrivenState, StepKey> = {
  selector: (root) => root.syncVsEventDriven as SyncVsEventDrivenState,
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

export const useSyncVsEventDrivenAnimation = (onAnimationComplete?: () => void) =>
  useLabAnimation(labConfig, onAnimationComplete);
