import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import ServiceEvolutionVisualization from "./main";
import ServiceEvolutionControls from "./controls";
import serviceEvolutionReducer, {
  type ServiceEvolutionState,
  initialState,
  reset,
} from "./serviceEvolutionSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { serviceEvolution: ServiceEvolutionState };

const ServiceEvolutionPlugin: DemoPlugin<
  ServiceEvolutionState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "service-evolution",
  name: "Monolith → Serverless",
  description:
    "Compare Monolith, Macroservices, Microservices and Serverless — deploy, scale, and fault-inject each architecture to feel the real trade-offs.",
  initialState,
  reducer: serviceEvolutionReducer,
  Component: ServiceEvolutionVisualization,
  Controls: ServiceEvolutionControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: ServiceEvolutionState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.serviceEvolution,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default ServiceEvolutionPlugin;
