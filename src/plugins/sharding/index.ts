import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import ShardingVisualization from "./main";
import ShardingControls from "./controls";
import shardingReducer, {
  type ShardingState,
  initialState,
  reset,
} from "./shardingSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { sharding: ShardingState };

const ShardingPlugin: DemoPlugin<
  ShardingState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "sharding",
  name: "Sharding Lab",
  description:
    "Explore horizontal database scaling: route queries to shards, observe hotspots, and feel the cost of cross-shard joins.",
  initialState,
  reducer: shardingReducer,
  Component: ShardingVisualization,
  Controls: ShardingControls,
  restartConfig: { text: "Replay", color: "#0ea5e9" },
  getSteps: (state: ShardingState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.sharding,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default ShardingPlugin;
