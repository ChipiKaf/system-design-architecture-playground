import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import RestApiVisualization from "./main";
import RestApiControls from "./controls";
import restApiReducer, {
  type RestApiState,
  initialState,
  reset,
} from "./restApiSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { restApi: RestApiState };

const RestApiPlugin: DemoPlugin<
  RestApiState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "rest-api",
  name: "REST API Lab",
  description:
    "Explore RESTful API design for microservices — CRUD resources, nested URIs, API versioning, and HATEOAS. See HTTP methods, status codes, and Richardson Maturity levels in action.",
  initialState,
  reducer: restApiReducer,
  Component: RestApiVisualization,
  Controls: RestApiControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: RestApiState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.restApi,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default RestApiPlugin;
