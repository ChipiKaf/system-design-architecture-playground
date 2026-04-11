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
    "Learn how micro-frontends let separate teams ship independently — and why Module Federation is the glue that makes it work.",
  initialState,
  reducer: microfrontendsReducer,
  Component: MicrofrontendsVisualization,
  restartConfig: { text: "Replay", color: "#1e40af" },
  getSteps: (_: MicrofrontendsState): DemoStep[] => [
    {
      label: "The Monolith Problem",
      autoAdvance: false,
      nextButtonText: "Begin →",
    },
    {
      label: "Meet the Host Shell",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Independent Team Apps",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "The Glue Problem",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "The Hooks Crash",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Module Federation: The Fix",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Host Reads the Menus",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Load Only What's Needed",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "One Copy of React",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Version Mismatch",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Iframe: Full Isolation",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "When Things Break",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Pick Your Strategy",
      autoAdvance: false,
      nextButtonText: "Done",
    },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.microfrontends,
};

export default MicrofrontendsPlugin;
