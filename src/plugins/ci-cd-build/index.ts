import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import CiCdBuildVisualization from "./main";
import CiCdBuildControls from "./controls";
import ciCdBuildReducer, {
  type CiCdBuildState,
  initialState,
  reset,
} from "./ciCdBuildSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { ciCdBuild: CiCdBuildState };

const CiCdBuildPlugin: DemoPlugin<
  CiCdBuildState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "ci-cd-build",
  name: "CI/CD Build Lab",
  description:
    "Compare Nx and Turborepo — see how build caching, affected detection, tree-shaking, and task parallelism work in a CI/CD pipeline.",
  initialState,
  reducer: ciCdBuildReducer,
  Component: CiCdBuildVisualization,
  Controls: CiCdBuildControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: CiCdBuildState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.ciCdBuild,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default CiCdBuildPlugin;
