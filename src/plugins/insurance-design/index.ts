import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import InsuranceDesignVisualization from "./main";
import InsuranceDesignControls from "./controls";
import insuranceDesignReducer, {
  type InsuranceDesignState,
  initialState,
  reset,
} from "./insuranceDesignSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { insuranceDesign: InsuranceDesignState };

const InsuranceDesignPlugin: DemoPlugin<
  InsuranceDesignState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "insurance-design",
  name: "Insurance Design",
  description:
    "Design and implement systems for an insurance company — AI, security, database, and more.",
  initialState,
  reducer: insuranceDesignReducer,
  Component: InsuranceDesignVisualization,
  Controls: InsuranceDesignControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: InsuranceDesignState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.insuranceDesign,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default InsuranceDesignPlugin;
