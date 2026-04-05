import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import FailoverVisualization from "./main";
import FailoverControls from "./controls";
import failoverReducer, {
  type FailoverState,
  initialState,
  softReset,
} from "./failoverSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { failover: FailoverState };

const FailoverPlugin: DemoPlugin<
  FailoverState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "failover",
  name: "Failover Lab",
  description:
    "Compare cold, warm, hot standby and active-active strategies — see RTO, RPO, cost, and data loss tradeoffs in real time.",
  initialState,
  reducer: failoverReducer,
  Component: FailoverVisualization,
  Controls: FailoverControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: FailoverState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(softReset());
  },
  selector: (state: LocalRootState) => state.failover,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default FailoverPlugin;
