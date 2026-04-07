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
    "Compare round robin, least connections, IP hash, weighted routing, and sticky-session affinity across a small server pool.",
  initialState,
  reducer: loadBalancerReducer,
  Component: LoadBalancerVisualization,
  restartConfig: {
    text: "Reset",
  },
  getSteps: (_state: LoadBalancerState) => [
    {
      label: "Choose Strategy",
      autoAdvance: false,
      nextButtonText: "Route First Request",
    },
    {
      label: "Single Request Routed",
      autoAdvance: false,
      nextButtonText: "Replay Mixed Traffic",
      processingText: "Routing the first client...",
    },
    {
      label: "Burst of 6 Timed Requests",
      autoAdvance: true,
      processingText: "Replaying traffic with slower pacing...",
    },
    { label: "Compare Outcome", autoAdvance: false },
  ],
  init: (dispatch) => {
    dispatch(releaseConnections());
  },
  selector: (state: LocalRootState) => state.loadBalancer,
};

export default LoadBalancerPlugin;
