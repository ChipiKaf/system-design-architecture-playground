import { configureStore } from "@reduxjs/toolkit";
import simulationReducer from "./slices/simulationSlice";
import LoadBalancerPlugin from "../plugins/load-balancer";
import EventStreamingPlugin from "../plugins/event-streaming";

export const store = configureStore({
  reducer: {
    loadBalancer: LoadBalancerPlugin.reducer,
    eventStreaming: EventStreamingPlugin.reducer,
    simulation: simulationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
