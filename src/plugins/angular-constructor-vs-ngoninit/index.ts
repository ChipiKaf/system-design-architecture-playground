import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import AngularConstructorVsNgoninitVisualization from "./main";
import AngularConstructorVsNgoninitControls from "./controls";
import angularConstructorVsNgoninitReducer, {
  type AngularConstructorVsNgoninitState,
  initialState,
  reset,
} from "./angularConstructorVsNgoninitSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { angularConstructorVsNgoninit: AngularConstructorVsNgoninitState };

const AngularConstructorVsNgoninitPlugin: DemoPlugin<
  AngularConstructorVsNgoninitState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "angular-constructor-vs-ngoninit",
  name: "AngularConstructorVsNgoninit",
  description: "Describe what this comparison lab teaches.",
  initialState,
  reducer: angularConstructorVsNgoninitReducer,
  Component: AngularConstructorVsNgoninitVisualization,
  Controls: AngularConstructorVsNgoninitControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: AngularConstructorVsNgoninitState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.angularConstructorVsNgoninit,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default AngularConstructorVsNgoninitPlugin;
