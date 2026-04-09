import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import DistributedTransactionsVisualization from "./main";
import DistributedTransactionsControls from "./controls";
import distributedTransactionsReducer, {
  type DistributedTransactionsState,
  initialState,
  reset,
} from "./distributedTransactionsSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { distributedTransactions: DistributedTransactionsState };

const DistributedTransactionsPlugin: DemoPlugin<
  DistributedTransactionsState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "distributed-transactions",
  name: "Distributed Transactions Lab",
  description:
    "Compare saga and transactional outbox as distributed transaction building blocks: local commits, reliable publish, and failure handling.",
  initialState,
  reducer: distributedTransactionsReducer,
  Component: DistributedTransactionsVisualization,
  Controls: DistributedTransactionsControls,
  restartConfig: { text: "Replay", color: "#60a5fa" },
  getSteps: (state: DistributedTransactionsState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.distributedTransactions,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default DistributedTransactionsPlugin;
