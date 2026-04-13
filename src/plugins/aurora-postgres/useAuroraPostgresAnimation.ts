import {
  patchState,
  softResetRun,
  recalcMetrics,
  type AuroraPostgresState,
} from "./auroraPostgresSlice";
import { STEPS, buildSteps, expandToken, type StepKey } from "./flow-engine";
import {
  useLabAnimation,
  type Signal,
  type UseLabAnimationConfig,
} from "../../lib/lab-engine";

export type { Signal };

const labConfig: UseLabAnimationConfig<AuroraPostgresState, StepKey> = {
  selector: (root) => root.auroraPostgres as AuroraPostgresState,
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

export const useAuroraPostgresAnimation = (onAnimationComplete?: () => void) =>
  useLabAnimation(labConfig, onAnimationComplete);
