import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import langgraphReducer, {
  type LanggraphState,
  initialState,
  reset,
} from "./langgraphSlice";
import LanggraphVisualization from "./main";
import type { Action, Dispatch } from "@reduxjs/toolkit";

type LocalRootState = { langgraph: LanggraphState };

const LanggraphPlugin: DemoPlugin<
  LanggraphState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "langgraph",
  name: "LangGraph",
  description:
    "Visualize how LangGraph orchestrates LLM calls through a stateful directed graph — with conditional routing, parallel fan-out, merge reducers, and human-in-the-loop interrupts.",
  initialState,
  reducer: langgraphReducer,
  Component: LanggraphVisualization,
  restartConfig: {
    text: "Reset",
  },
  getSteps: (_: LanggraphState): DemoStep[] => [
    {
      label: "Graph Overview",
      autoAdvance: false,
      nextButtonText: "Run Graph",
    },
    {
      label: "Classify Input (LLM)",
      autoAdvance: true,
      processingText: "Classifying…",
    },
    {
      label: "Conditional Routing",
      autoAdvance: false,
      nextButtonText: "Continue",
      processingText: "Routing…",
    },
    {
      label: "Plan Tasks (LLM)",
      autoAdvance: true,
      processingText: "Planning…",
    },
    {
      label: "Parallel Fan-Out",
      autoAdvance: false,
      nextButtonText: "Merge Results",
      processingText: "Executing…",
    },
    {
      label: "Interrupt — Human Review",
      autoAdvance: false,
      nextButtonText: "Approve & Resume",
      nextButtonColor: "#dc2626",
      processingText: "Pausing…",
    },
    {
      label: "Complete",
      autoAdvance: false,
    },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.langgraph,
};

export default LanggraphPlugin;
