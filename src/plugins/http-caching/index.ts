import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import HttpCachingVisualization from "./main";
import HttpCachingControls from "./controls";
import httpCachingReducer, {
  type HttpCachingState,
  initialState,
  reset,
} from "./httpCachingSlice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { httpCaching: HttpCachingState };

const HttpCachingPlugin: DemoPlugin<
  HttpCachingState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "http-caching",
  name: "HTTP Caching",
  description:
    "Explore how Browser Cache, CDN, and Cache-Control headers determine where requests are served from — and how fast.",
  initialState,
  reducer: httpCachingReducer,
  Component: HttpCachingVisualization,
  Controls: HttpCachingControls,
  restartConfig: {
    text: "Replay",
    color: "#3b82f6",
  },
  getSteps: (state: HttpCachingState): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.httpCaching,
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default HttpCachingPlugin;
