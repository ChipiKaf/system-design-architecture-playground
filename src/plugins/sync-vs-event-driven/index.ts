import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import SyncVsEventDrivenVisualization from "./main";
import SyncVsEventDrivenControls from "./controls";
import syncVsEventDrivenReducer, {
  type SyncVsEventDrivenState,
  initialState,
  reset,
} from "./syncVsEventDrivenSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { syncVsEventDriven: SyncVsEventDrivenState };

const SyncVsEventDrivenPlugin: DemoPlugin<
  SyncVsEventDrivenState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "sync-vs-event-driven",
  name: "Service Interaction Lab",
  description:
    "Compare deep synchronous chaining, service aggregation, AWS EKS service discovery, and an event-driven handoff path in one lab.",
  initialState,
  reducer: syncVsEventDrivenReducer,
  Component: SyncVsEventDrivenVisualization,
  Controls: SyncVsEventDrivenControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: SyncVsEventDrivenState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.syncVsEventDriven,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default SyncVsEventDrivenPlugin;
