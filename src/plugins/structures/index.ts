import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import StructuresVisualization from "./main";
import StructuresControls from "./controls";
import structuresReducer, {
  type StructuresState,
  initialState,
  reset,
} from "./structuresSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { structures: StructuresState };

const StructuresPlugin: DemoPlugin<
  StructuresState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "structures",
  name: "Structures",
  description:
    "Watch database index structures grow from scratch — page fills, splits, and depth increases step by step.",
  initialState,
  reducer: structuresReducer,
  Component: StructuresVisualization,
  Controls: StructuresControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: StructuresState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.structures,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default StructuresPlugin;
