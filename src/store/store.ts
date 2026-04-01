import { configureStore } from "@reduxjs/toolkit";
import simulationReducer from "./slices/simulationSlice";
import { pluginReducerMap } from "../registry";

export const store = configureStore({
  reducer: {
    ...pluginReducerMap,
    simulation: simulationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
