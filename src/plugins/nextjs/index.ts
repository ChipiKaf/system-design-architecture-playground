import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import NextjsVisualization from "./main";
import NextjsControls from "./controls";
import nextjsReducer, {
  type NextjsState,
  initialState,
  reset,
} from "./nextjsSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { nextjs: NextjsState };

const NextjsPlugin: DemoPlugin<
  NextjsState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "nextjs",
  name: "Next.js Internals",
  description:
    "Explore rendering strategies, server & client components, file-based routing, nested layouts, data fetching, and caching in the App Router.",
  initialState,
  reducer: nextjsReducer,
  Component: NextjsVisualization,
  Controls: NextjsControls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: NextjsState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.nextjs,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default NextjsPlugin;
