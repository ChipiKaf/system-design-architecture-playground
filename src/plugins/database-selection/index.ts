import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import DatabaseSelectionVisualization from "./main";
import DatabaseSelectionControls from "./controls";
import databaseSelectionReducer, {
  type DatabaseSelectionState,
  initialState,
  reset,
} from "./databaseSelectionSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { databaseSelection: DatabaseSelectionState };

const DatabaseSelectionPlugin: DemoPlugin<
  DatabaseSelectionState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "database-selection",
  name: "Database Selection Lab",
  description:
    "Explore database-family selection, CAP trade-offs, and partitioning patterns for microservice data design.",
  initialState,
  reducer: databaseSelectionReducer,
  Component: DatabaseSelectionVisualization,
  Controls: DatabaseSelectionControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: DatabaseSelectionState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.databaseSelection,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default DatabaseSelectionPlugin;
