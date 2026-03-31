import { configureStore } from "@reduxjs/toolkit";
import simulationReducer from "./slices/simulationSlice";
import LoadBalancerPlugin from "../plugins/load-balancer";

export const store = configureStore({
  reducer: {
    loadBalancer: LoadBalancerPlugin.reducer,
    simulation: simulationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
