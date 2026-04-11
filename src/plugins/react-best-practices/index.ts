import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import ReactBestPracticesVisualization from "./main";
import reactBestPracticesReducer, {
  type ReactBestPracticesState,
  initialState,
  reset,
} from "./reactBestPracticesSlice";

type LocalRootState = { reactBestPractices: ReactBestPracticesState };

const ReactBestPracticesPlugin: DemoPlugin<
  ReactBestPracticesState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "react-best-practices",
  name: "React Best Practices",
  description:
    "Clean, fast, and accessible React — learn the practices that separate messy code from production-ready apps.",
  initialState,
  reducer: reactBestPracticesReducer,
  Component: ReactBestPracticesVisualization,
  restartConfig: { text: "Replay", color: "#1e40af" },
  getSteps: (_: ReactBestPracticesState): DemoStep[] => [
    {
      label: "The React Jungle",
      autoAdvance: false,
      nextButtonText: "Begin →",
    },
    {
      label: "Functions, Not Classes",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "One Job Per Component",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Stop Wasted Renders",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "The Virtual DOM Trick",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Organise by Feature",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Custom Hooks = DRY",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Styled & Reusable",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Clean Code Rules",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "For Everyone & Safe",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Your React Toolkit",
      autoAdvance: false,
      nextButtonText: "Finish ✓",
    },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.reactBestPractices,
};

export default ReactBestPracticesPlugin;
