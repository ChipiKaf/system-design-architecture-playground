import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import LcsVisualization from "./main";
import lcsReducer, { type LcsState, initialState, reset } from "./lcsSlice";

type LocalRootState = { lcs: LcsState };

/** Compute step count from the given state. */
function computeSteps(state: LcsState): DemoStep[] {
  const m = state.text1.length;
  const n = state.text2.length;
  const totalCells = m * n;

  // Pre-compute the DP to get step data for labels
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  interface StepInfo {
    row: number;
    col: number;
    isMatch: boolean;
    value: number;
  }
  const cellSteps: StepInfo[] = [];

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const isMatch = state.text1[i - 1] === state.text2[j - 1];
      let value: number;
      if (isMatch) {
        value = dp[i - 1][j - 1] + 1;
      } else {
        value = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
      dp[i][j] = value;
      cellSteps.push({ row: i, col: j, isMatch, value });
    }
  }

  const steps: DemoStep[] = [];

  // Step 0: Intro
  steps.push({
    label: "Configure",
    autoAdvance: false,
    nextButtonText: "Start DP",
    nextButtonColor: "#f59e0b",
  });

  // Step 1: Array(m+1).fill(null)
  steps.push({
    label: "Create Array",
    autoAdvance: false,
    nextButtonText: "Fill with 0s",
    nextButtonColor: "#64748b",
  });

  // Step 2: .map(() => Array(n+1).fill(0))
  steps.push({
    label: "Fill Zeros",
    autoAdvance: false,
    nextButtonText: "Start Filling",
    nextButtonColor: "#3b82f6",
  });

  // Each cell → 2 steps (reveal + resolve)
  for (let idx = 0; idx < totalCells; idx++) {
    const cell = cellSteps[idx];
    const isLast = idx === totalCells - 1;

    // Reveal (compare chars)
    steps.push({
      label: `Compare (${cell.row},${cell.col})`,
      autoAdvance: false,
      nextButtonText: cell.isMatch ? "Match!" : "No Match",
      processingText: "Comparing...",
      nextButtonColor: cell.isMatch ? "#a78bfa" : "#60a5fa",
    });

    // Resolve (fill value)
    steps.push({
      label: `Fill (${cell.row},${cell.col}) = ${cell.value}`,
      autoAdvance: false,
      nextButtonText: isLast ? "See Result" : "Next Cell",
      processingText: "Filling...",
      nextButtonColor: "#22c55e",
    });
  }

  // Final: result
  steps.push({
    label: "Result",
    autoAdvance: false,
    nextButtonText: "Done",
    nextButtonColor: "#86efac",
  });

  return steps;
}

const LcsPlugin: DemoPlugin<
  LcsState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "lcs",
  name: "Longest Common Subsequence (DP)",
  description:
    "Visualize the 2D dynamic programming approach to find the longest common subsequence of two strings.",
  initialState,
  reducer: lcsReducer,
  Component: LcsVisualization,
  restartConfig: {
    text: "Try Again",
    color: "#3b82f6",
  },
  getSteps: (state: LcsState): DemoStep[] => computeSteps(state),
  init: (dispatch: Dispatch<Action>) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.lcs,
};

export default LcsPlugin;
