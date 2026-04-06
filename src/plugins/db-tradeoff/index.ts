import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import DbTradeoffVisualization from "./main";
import DbTradeoffControls from "./controls";
import dbTradeoffReducer, {
  type DbTradeoffState,
  initialState,
  reset,
} from "./dbTradeoffSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { dbTradeoff: DbTradeoffState };

const DbTradeoffPlugin: DemoPlugin<
  DbTradeoffState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "db-tradeoff",
  name: "Database Tradeoff Lab",
  description:
    "Compare PostgreSQL, MongoDB, and Cassandra across different workloads — see how latency, consistency, and availability shift.",
  initialState,
  reducer: dbTradeoffReducer,
  Component: DbTradeoffVisualization,
  Controls: DbTradeoffControls,
  restartConfig: {
    text: "Replay",
    color: "#3b82f6",
  },
  getSteps: (state: DbTradeoffState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.dbTradeoff,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default DbTradeoffPlugin;
