import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import PostgresqlVisualization from "./main";
import PostgresqlControls from "./controls";
import postgresqlReducer, {
  type PostgresqlState,
  initialState,
  reset,
} from "./postgresqlSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { postgresql: PostgresqlState };

const PostgresqlPlugin: DemoPlugin<
  PostgresqlState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "postgresql",
  name: "PostgreSQL",
  description:
    "Modular PostgreSQL deep dive, starting with how to choose the right index strategy for real query patterns.",
  initialState,
  reducer: postgresqlReducer,
  Component: PostgresqlVisualization,
  Controls: PostgresqlControls,
  restartConfig: { text: "Replay", color: "#336791" },
  getSteps: (state: PostgresqlState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.postgresql,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default PostgresqlPlugin;
