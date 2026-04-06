import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import CapAcidVisualization from "./main";
import CapAcidControls from "./controls";
import capAcidReducer, {
  type CapAcidState,
  initialState,
  reset,
} from "./capAcidSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { capAcid: CapAcidState };

const CapAcidPlugin: DemoPlugin<
  CapAcidState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "cap-acid",
  name: "CAP & ACID Explorer",
  description:
    "Explore how the CAP theorem and ACID guarantees interact across PostgreSQL, MongoDB, and Cassandra — toggle partitions, tune isolation, and watch trade-offs unfold.",
  initialState,
  reducer: capAcidReducer,
  Component: CapAcidVisualization,
  Controls: CapAcidControls,
  restartConfig: {
    text: "Replay",
    color: "#3b82f6",
  },
  getSteps: (state: CapAcidState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.capAcid,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default CapAcidPlugin;
