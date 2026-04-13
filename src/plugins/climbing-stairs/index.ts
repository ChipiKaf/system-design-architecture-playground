import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import ClimbingStairsVisualization from "./main";
import climbingStairsReducer, {
  type ClimbingStairsState,
  initialState,
  reset,
} from "./climbingStairsSlice";

type LocalRootState = { climbingStairs: ClimbingStairsState };

function computeSteps(state: ClimbingStairsState): DemoStep[] {
  const { n } = state;

  // Pre-compute dp for step labels
  const dp = [1, 1];
  for (let i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];

  const steps: DemoStep[] = [];

  // Step 0: Configure
  steps.push({
    label: "Configure",
    autoAdvance: false,
    nextButtonText: "Let's Begin",
    nextButtonColor: "#f59e0b",
  });

  // Step 1: Understand the problem
  steps.push({
    label: "🧩 Understand",
    autoAdvance: false,
    nextButtonText: "I Get It",
    nextButtonColor: "#818cf8",
  });

  // Step 2: Identify the sub-problem
  steps.push({
    label: "🔍 Sub-problem",
    autoAdvance: false,
    nextButtonText: "What's the formula?",
    nextButtonColor: "#a78bfa",
  });

  // Step 3: Discover the recurrence
  steps.push({
    label: "💡 Recurrence",
    autoAdvance: false,
    nextButtonText: "Let's code it!",
    nextButtonColor: "#c084fc",
  });

  // Step 4: Create the array
  steps.push({
    label: "📦 Create Array",
    autoAdvance: false,
    nextButtonText: "Set dp[0]",
    nextButtonColor: "#64748b",
  });

  // Step 5: Base case dp[0]
  steps.push({
    label: "dp[0] = 1",
    autoAdvance: false,
    nextButtonText: "Set dp[1]",
    nextButtonColor: "#22c55e",
  });

  // Step 6: Base case dp[1]
  steps.push({
    label: "dp[1] = 1",
    autoAdvance: false,
    nextButtonText: "Start the loop",
    nextButtonColor: "#22c55e",
  });

  // Steps 7 to n+5: Fill dp[2] through dp[n]
  for (let i = 2; i <= n; i++) {
    const isLast = i === n;
    steps.push({
      label: `🔄 dp[${i}] = ${dp[i]}`,
      autoAdvance: false,
      nextButtonText: isLast ? "See Result" : `Fill dp[${i + 1}]`,
      nextButtonColor: "#3b82f6",
    });
  }

  // Final: Result
  steps.push({
    label: `🎉 Result: ${dp[n]} ways`,
    autoAdvance: false,
    nextButtonText: "Done",
    nextButtonColor: "#86efac",
  });

  return steps;
}

const ClimbingStairsPlugin: DemoPlugin<
  ClimbingStairsState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "climbing-stairs",
  name: "Climbing Stairs (DP)",
  description:
    "Visualize the 1D dynamic programming approach to count distinct ways to climb n stairs.",
  initialState,
  reducer: climbingStairsReducer,
  Component: ClimbingStairsVisualization,
  restartConfig: {
    text: "Try Again",
    color: "#f59e0b",
  },
  getSteps: (state: ClimbingStairsState): DemoStep[] => computeSteps(state),
  init: (dispatch: Dispatch<Action>) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.climbingStairs,
};

export default ClimbingStairsPlugin;
