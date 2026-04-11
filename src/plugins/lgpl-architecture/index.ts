import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import LgplArchitectureVisualization from "./main";
import lgplArchitectureReducer, {
  type LgplArchitectureState,
  initialState,
  reset,
} from "./lgplArchitectureSlice";

type LocalRootState = { lgplArchitecture: LgplArchitectureState };

const LgplArchitecturePlugin: DemoPlugin<
  LgplArchitectureState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "lgpl-architecture",
  name: "LGPL Architecture",
  description:
    "Layers, Gates, Pipes, and Loops — a modular architecture pattern for building scalable, composable systems.",
  initialState,
  reducer: lgplArchitectureReducer,
  Component: LgplArchitectureVisualization,
  restartConfig: { text: "Replay", color: "#1e40af" },
  getSteps: (_: LgplArchitectureState): DemoStep[] => [
    { label: "Overview", autoAdvance: false, nextButtonText: "Begin" },
    { label: "Layers", autoAdvance: false, processingText: "Highlighting…" },
    { label: "Layer Detail", autoAdvance: false, processingText: "Expanding…" },
    { label: "Gates", autoAdvance: false, processingText: "Highlighting…" },
    { label: "Gate Routing", autoAdvance: false, processingText: "Routing…" },
    { label: "Pipes", autoAdvance: false, processingText: "Highlighting…" },
    {
      label: "Pipe Transforms",
      autoAdvance: false,
      processingText: "Transforming…",
    },
    { label: "Loops", autoAdvance: false, processingText: "Highlighting…" },
    { label: "Loop Feedback", autoAdvance: false, processingText: "Looping…" },
    { label: "Full Flow", autoAdvance: false, processingText: "Running…" },
    { label: "Summary", autoAdvance: false },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.lgplArchitecture,
};

export default LgplArchitecturePlugin;
