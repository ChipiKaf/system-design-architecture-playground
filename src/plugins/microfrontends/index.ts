import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import MicrofrontendsVisualization from "./main";
import microfrontendsReducer, {
  type MicrofrontendsState,
  initialState,
  reset,
} from "./microfrontendsSlice";

type LocalRootState = { microfrontends: MicrofrontendsState };

const MicrofrontendsPlugin: DemoPlugin<
  MicrofrontendsState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "microfrontends",
  name: "Microfrontends",
  description:
    "How micro-frontends are composed at runtime — Module Federation, shared dependencies, iframe isolation, and failure handling.",
  initialState,
  reducer: microfrontendsReducer,
  Component: MicrofrontendsVisualization,
  restartConfig: { text: "Replay", color: "#1e40af" },
  getSteps: (_: MicrofrontendsState): DemoStep[] => [
    {
      label: "Architecture Overview",
      autoAdvance: false,
      nextButtonText: "Begin",
    },
    { label: "Host Shell", autoAdvance: true, processingText: "Highlighting…" },
    {
      label: "Remote Modules",
      autoAdvance: true,
      processingText: "Highlighting…",
    },
    {
      label: "Module Federation — Expose",
      autoAdvance: true,
      processingText: "Building…",
    },
    {
      label: "Runtime Discovery",
      autoAdvance: true,
      processingText: "Fetching manifests…",
    },
    {
      label: "Lazy Loading",
      autoAdvance: true,
      processingText: "Loading remote…",
    },
    {
      label: "Shared Dependencies",
      autoAdvance: true,
      processingText: "Resolving…",
    },
    {
      label: "Iframe Isolation",
      autoAdvance: true,
      processingText: "Isolating…",
    },
    {
      label: "Failure & Fallback",
      autoAdvance: true,
      processingText: "Simulating failure…",
    },
    { label: "Strategy Comparison", autoAdvance: true },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.microfrontends,
};

export default MicrofrontendsPlugin;
