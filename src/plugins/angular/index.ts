import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import AngularVisualization from "./main";
import AngularControls from "./controls";
import angularReducer, {
  type AngularState,
  initialState,
  reset,
} from "./angularSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { angular: AngularState };

const AngularPlugin: DemoPlugin<
  AngularState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "angular",
  name: "Angular Fundamentals",
  description:
    "Explore Angular concepts — constructor vs ngOnInit, view encapsulation strategies, and more. Switch topics and compare variants side by side.",
  initialState,
  reducer: angularReducer,
  Component: AngularVisualization,
  Controls: AngularControls,
  restartConfig: {
    text: "Replay",
    color: "#dd0031",
  },
  getSteps: (state: AngularState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.angular,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default AngularPlugin;
