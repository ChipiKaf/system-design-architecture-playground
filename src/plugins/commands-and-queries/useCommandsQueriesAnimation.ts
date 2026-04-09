import {
  patchState,
  softResetRun,
  recalcMetrics,
  type CommandsQueriesState,
} from "./commandsQueriesSlice";
import { STEPS, buildSteps, expandToken, type StepKey } from "./flow-engine";
import {
  useLabAnimation,
  type Signal,
  type UseLabAnimationConfig,
} from "../../lib/lab-engine";

export type { Signal };

const labConfig: UseLabAnimationConfig<CommandsQueriesState, StepKey> = {
  selector: (root) => root.commandsAndQueries as CommandsQueriesState,
  allSteps: STEPS,
  buildSteps,
  expandToken,
  actions: () => ({
    resetRun: { create: () => softResetRun(), terminal: true },
  }),
  recalcMetrics: () => recalcMetrics(),
  patchState: (patch) => patchState(patch),
};

export const useCommandsQueriesAnimation = (onAnimationComplete?: () => void) =>
  useLabAnimation(labConfig, onAnimationComplete);
