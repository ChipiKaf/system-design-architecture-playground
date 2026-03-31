import type { DemoPlugin } from "../../types/ModelPlugin";
import loadBalancerReducer, {
  type LoadBalancerState,
  initialState,
  releaseConnections,
} from "./loadBalancerSlice";
import LoadBalancerVisualization from "./main";
import type { Action, Dispatch } from "@reduxjs/toolkit";

type LocalRootState = { loadBalancer: LoadBalancerState };

const LoadBalancerPlugin: DemoPlugin<
  LoadBalancerState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "load-balancer",
  name: "Load Balancer",
  description:
    "Visualize how a load balancer distributes incoming requests across multiple server instances using different strategies.",
  initialState,
  reducer: loadBalancerReducer,
  Component: LoadBalancerVisualization,
  restartConfig: {
    text: "Reset",
  },
  getSteps: (_state: LoadBalancerState) => [
    { label: "Setup", autoAdvance: false, nextButtonText: "Send Request" },
    {
      label: "Single Request Routed",
      autoAdvance: false,
      nextButtonText: "Send Burst",
    },
    { label: "Burst of 5 Requests", autoAdvance: true },
    { label: "Analysis", autoAdvance: false },
  ],
  init: (dispatch) => {
    dispatch(releaseConnections());
  },
  selector: (state: LocalRootState) => state.loadBalancer,
};

export default LoadBalancerPlugin;
