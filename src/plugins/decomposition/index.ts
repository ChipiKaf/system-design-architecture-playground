import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import DecompositionVisualization from "./main";
import DecompositionControls from "./controls";
import decompositionReducer, {
  type DecompositionState,
  initialState,
  reset,
} from "./decompositionSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { decomposition: DecompositionState };

const DecompositionPlugin: DemoPlugin<
  DecompositionState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "decomposition",
  name: "Microservices Decomposition",
  description:
    "Step through three strategies — Business Capability, Subdomain/DDD, and Size-Based — for decomposing an e-shop monolith into microservices. Each step does exactly one thing.",
  initialState,
  reducer: decompositionReducer,
  Component: DecompositionVisualization,
  Controls: DecompositionControls,
  restartConfig: { text: "Replay", color: "#818cf8" },
  getSteps: (state: DecompositionState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.decomposition,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default DecompositionPlugin;
