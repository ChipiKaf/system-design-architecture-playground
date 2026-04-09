import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import CommPatternsVisualization from "./main";
import CommPatternsControls from "./controls";
import commPatternsReducer, {
  type CommPatternsState,
  initialState,
  reset,
} from "./commPatternsSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { commPatterns: CommPatternsState };

const CommPatternsPlugin: DemoPlugin<
    "Compare communication patterns — direct calls, gateway routing, aggregation, offloading, and BFF. See how each pattern changes client coupling, latency, and complexity.",
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "comm-patterns",
  name: "Communication Patterns Lab",
  description:
    "Compare API Gateway patterns — direct calls, routing, aggregation, and offloading. See how each pattern changes client coupling, latency, and complexity.",
  initialState,
  reducer: commPatternsReducer,
  Component: CommPatternsVisualization,
  Controls: CommPatternsControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: CommPatternsState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.commPatterns,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default CommPatternsPlugin;
