import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import ReactPerformanceVisualization from "./main";
import reactPerformanceReducer, {
  type ReactPerformanceState,
  initialState,
  reset,
} from "./reactPerformanceSlice";

type LocalRootState = { reactPerformance: ReactPerformanceState };

const ReactPerformancePlugin: DemoPlugin<
  ReactPerformanceState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "react-performance",
  name: "React Performance",
  description:
    "Find what's slow, fix memory leaks, and measure everything — the beginner's guide to React speed.",
  initialState,
  reducer: reactPerformanceReducer,
  Component: ReactPerformanceVisualization,
  restartConfig: { text: "Replay", color: "#1e40af" },
  getSteps: (_: ReactPerformanceState): DemoStep[] => [
    {
      label: "The Slow App Problem",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "The Render Cycle",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Wasted Re-renders",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "The Memo Shield",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "useMemo & useCallback",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Split the Bundle",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Memory Leaks: The Drip",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Leak: Forgotten Cleanup",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Leak: Stale Closures",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Finding Leaks: Heap Snapshots",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Lighthouse & Web Vitals",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "The React Profiler",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Your Performance Toolkit",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.reactPerformance,
};

export default ReactPerformancePlugin;
