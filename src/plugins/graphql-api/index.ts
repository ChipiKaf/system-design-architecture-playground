import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import GraphqlApiVisualization from "./main";
import GraphqlApiControls from "./controls";
import graphqlApiReducer, {
  type GraphqlApiState,
  initialState,
  reset,
} from "./graphqlApiSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { graphqlApi: GraphqlApiState };

const GraphqlApiPlugin: DemoPlugin<
  GraphqlApiState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "graphql-api",
  name: "GraphqlApi",
  description: "Describe what this comparison lab teaches.",
  initialState,
  reducer: graphqlApiReducer,
  Component: GraphqlApiVisualization,
  Controls: GraphqlApiControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: GraphqlApiState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.graphqlApi,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default GraphqlApiPlugin;
