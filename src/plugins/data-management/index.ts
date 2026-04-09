import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import DataManagementVisualization from "./main";
import DataManagementControls from "./controls";
import dataManagementReducer, {
  type DataManagementState,
  initialState,
  reset,
} from "./dataManagementSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { dataManagement: DataManagementState };

const DataManagementPlugin: DemoPlugin<
  DataManagementState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "data-management",
  name: "Data Management",
  description:
    "Compare microservice data patterns, starting with a step-by-step database-per-service walkthrough.",
  initialState,
  reducer: dataManagementReducer,
  Component: DataManagementVisualization,
  Controls: DataManagementControls,
  restartConfig: { text: "Replay", color: "#0ea5e9" },
  getSteps: (state: DataManagementState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.dataManagement,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default DataManagementPlugin;
