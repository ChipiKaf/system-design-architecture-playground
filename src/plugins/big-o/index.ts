import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import BigOVisualization from "./main";
import bigOReducer, { type BigOState, initialState, reset } from "./bigOSlice";

type LocalRootState = { bigO: BigOState };

const BigOPlugin: DemoPlugin<
  BigOState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "big-o",
  name: "Big O Notation",
  description:
    "Learn what Big O means through interactive, kid-friendly examples of O(1), O(log n), O(n), and O(n^2).",
  initialState,
  reducer: bigOReducer,
  Component: BigOVisualization,
  restartConfig: {
    text: "Start Over",
  },
  getSteps: (_: BigOState): DemoStep[] => [
    {
      label: "What Big O Means",
      autoAdvance: false,
      nextButtonText: "Show O(1)",
    },
    {
      label: "O(1) One Magic Peek",
      autoAdvance: false,
      nextButtonText: "Show O(log n)",
      processingText: "Peeking...",
      nextButtonColor: "#0ea5e9",
    },
    {
      label: "O(log n) Halve The Search",
      autoAdvance: false,
      nextButtonText: "Show O(n)",
      processingText: "Cutting in half...",
      nextButtonColor: "#8b5cf6",
    },
    {
      label: "O(n) Check One By One",
      autoAdvance: false,
      nextButtonText: "Show O(n^2)",
      processingText: "Checking boxes...",
      nextButtonColor: "#22c55e",
    },
    {
      label: "O(n^2) Comparison Explosion",
      autoAdvance: false,
      nextButtonText: "Compare Them",
      processingText: "Comparing everything...",
      nextButtonColor: "#ef4444",
    },
    {
      label: "Summary Race",
      autoAdvance: false,
    },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.bigO,
};

export default BigOPlugin;
