import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import PerfectSquaresVisualization from "./main";
import perfectSquaresReducer, {
  type PerfectSquaresState,
  initialState,
  reset,
} from "./perfectSquaresSlice";

type LocalRootState = { perfectSquares: PerfectSquaresState };

/** Pre-compute dp so step labels can show the answer */
function solveDp(n: number): number[] {
  const dp = new Array(n + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j * j <= i; j++) {
      dp[i] = Math.min(dp[i], dp[i - j * j] + 1);
    }
  }
  return dp;
}

function computeSteps(state: PerfectSquaresState): DemoStep[] {
  const { n } = state;
  const dp = solveDp(n);
  const steps: DemoStep[] = [];

  // Step 0: Configure
  steps.push({
    label: "Configure",
    autoAdvance: false,
    nextButtonText: "Let's Begin",
    nextButtonColor: "#f59e0b",
  });

  // Step 1: Understand
  steps.push({
    label: "🧩 Understand",
    autoAdvance: false,
    nextButtonText: "I Get It",
    nextButtonColor: "#818cf8",
  });

  // Step 2: Sub-problem
  steps.push({
    label: "🔍 Sub-problem",
    autoAdvance: false,
    nextButtonText: "What's the formula?",
    nextButtonColor: "#a78bfa",
  });

  // Step 3: Recurrence
  steps.push({
    label: "💡 Recurrence",
    autoAdvance: false,
    nextButtonText: "Let's code it!",
    nextButtonColor: "#c084fc",
  });

  // Step 4: Create array
  steps.push({
    label: "📦 Create Array",
    autoAdvance: false,
    nextButtonText: "Set dp[0]",
    nextButtonColor: "#64748b",
  });

  // Step 5: Base case dp[0] = 0
  steps.push({
    label: "dp[0] = 0",
    autoAdvance: false,
    nextButtonText: "Start filling",
    nextButtonColor: "#22c55e",
  });

  // Steps 6 to n+5: Fill dp[1] through dp[n]
  for (let i = 1; i <= n; i++) {
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
    label: `🎉 Result: ${dp[n]}`,
    autoAdvance: false,
    nextButtonText: "Done",
    nextButtonColor: "#86efac",
  });

  return steps;
}

const PerfectSquaresPlugin: DemoPlugin<
  PerfectSquaresState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "perfect-squares",
  name: "Perfect Squares (DP)",
  description:
    "Visualize the 1D DP approach to find the minimum perfect squares summing to n.",
  initialState,
  reducer: perfectSquaresReducer,
  Component: PerfectSquaresVisualization,
  restartConfig: {
    text: "Try Again",
    color: "#f59e0b",
  },
  getSteps: (state: PerfectSquaresState): DemoStep[] => computeSteps(state),
  init: (dispatch: Dispatch<Action>) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.perfectSquares,
};

export default PerfectSquaresPlugin;
