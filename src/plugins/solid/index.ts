import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import SolidVisualization from "./main";
import SolidControls from "./controls";
import solidReducer, {
  type SolidState,
  initialState,
  reset,
} from "./solidSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { solid: SolidState };

const SolidPlugin: DemoPlugin<
  SolidState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "solid",
  name: "SOLID Principles",
  description:
    "Visualise the five SOLID OOP principles — SRP, OCP, LSP, ISP, DIP — with before / after class diagrams.",
  initialState,
  reducer: solidReducer,
  Component: SolidVisualization,
  Controls: SolidControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: SolidState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.solid,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default SolidPlugin;
