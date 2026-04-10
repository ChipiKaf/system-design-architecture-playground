import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import GraphqlVisualization from "./main";
import GraphqlControls from "./controls";
import graphqlReducer, {
  type GraphqlState,
  initialState,
  reset,
} from "./graphqlSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { graphql: GraphqlState };

const GraphqlPlugin: DemoPlugin<
  GraphqlState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "graphql",
  name: "GraphQL",
  description:
    "Explore GraphQL concepts through interactive visualizations — queries, schemas, resolvers, and more.",
  initialState,
  reducer: graphqlReducer,
  Component: GraphqlVisualization,
  Controls: GraphqlControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: GraphqlState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.graphql,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default GraphqlPlugin;
