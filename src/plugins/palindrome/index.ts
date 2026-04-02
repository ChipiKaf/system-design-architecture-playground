import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import PalindromeVisualization from "./main";
import palindromeReducer, {
  type PalindromeState,
  initialState,
  reset,
} from "./palindromeSlice";

type LocalRootState = { palindrome: PalindromeState };

const PalindromePlugin: DemoPlugin<
  PalindromeState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "palindrome",
  name: "Palindrome Check",
  description:
    "Visualize the two-pointer palindrome algorithm step by step — watch pointers walk inward comparing characters.",
  initialState,
  reducer: palindromeReducer,
  Component: PalindromeVisualization,
  restartConfig: {
    text: "Try Another",
    color: "#8b5cf6",
  },
  getSteps: (state: PalindromeState): DemoStep[] => {
    const compSteps: DemoStep[] = state.steps.map((s, i) => ({
      label: `Compare [${s.left}] vs [${s.right}]`,
      autoAdvance: false,
      nextButtonText:
        i < state.steps.length - 1 ? "Next Comparison" : "See Result",
      processingText: "Comparing...",
      nextButtonColor: s.isMatch ? "#22c55e" : "#ef4444",
    }));

    return [
      {
        label: "Enter Input",
        autoAdvance: false,
        nextButtonText: "Start Check",
        nextButtonColor: "#8b5cf6",
      },
      {
        label: "Set Up Pointers",
        autoAdvance: false,
        nextButtonText: compSteps.length > 0 ? "Compare" : "See Result",
        processingText: "Setting up...",
        nextButtonColor: "#3b82f6",
      },
      ...compSteps,
      {
        label: "Result",
        autoAdvance: false,
      },
    ];
  },
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.palindrome,
};

export default PalindromePlugin;
