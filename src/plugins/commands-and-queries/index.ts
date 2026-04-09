import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import CommandsQueriesVisualization from "./main";
import CommandsQueriesControls from "./controls";
import commandsQueriesReducer, {
  type CommandsQueriesState,
  initialState,
  reset,
} from "./commandsQueriesSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { commandsAndQueries: CommandsQueriesState };

const CommandsQueriesPlugin: DemoPlugin<
  CommandsQueriesState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "commands-and-queries",
  name: "Commands and Queries Lab",
  description:
    "Explore command and query separation for microservices, starting with a materialized-view read model.",
  initialState,
  reducer: commandsQueriesReducer,
  Component: CommandsQueriesVisualization,
  Controls: CommandsQueriesControls,
  restartConfig: { text: "Replay", color: "#22c55e" },
  getSteps: (state: CommandsQueriesState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.commandsAndQueries,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default CommandsQueriesPlugin;
