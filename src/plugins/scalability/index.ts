import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import ScalabilityVisualization from "./main";
import ScalabilityControls from "./controls";
import scalabilityReducer, {
  type ScalabilityState,
  initialState,
  reset,
} from "./scalabilitySlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { scalability: ScalabilityState };

const ScalabilityPlugin: DemoPlugin<
  ScalabilityState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "scalability",
  name: "Scalability",
  description:
    "Build a scalable architecture step by step — scale servers up or out, add a database, load balancer, and cache to compare performance and cost.",
  initialState,
  reducer: scalabilityReducer,
  Component: ScalabilityVisualization,
  Controls: ScalabilityControls,
  restartConfig: {
    text: "Replay",
    color: "#3b82f6",
  },
  getSteps: (state: ScalabilityState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.scalability,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default ScalabilityPlugin;
