import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import EcommerceCapVisualization from "./main";
import EcommerceCapControls from "./controls";
import ecommerceCapReducer, {
  type EcommerceCapState,
  initialState,
  reset,
} from "./ecommerceCapSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { ecommerceCap: EcommerceCapState };

const EcommerceCapPlugin: DemoPlugin<
  EcommerceCapState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "ecommerce-cap",
  name: "CAP in E-Commerce",
  description:
    "Compare why catalog, inventory, payments, orders, and notifications choose different CAP trade-offs.",
  initialState,
  reducer: ecommerceCapReducer,
  Component: EcommerceCapVisualization,
  Controls: EcommerceCapControls,
  restartConfig: { text: "Replay", color: "#0ea5e9" },
  getSteps: (state: EcommerceCapState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.ecommerceCap,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default EcommerceCapPlugin;
