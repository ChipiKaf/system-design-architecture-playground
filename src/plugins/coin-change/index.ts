import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import CoinChangeVisualization from "./main";
import coinChangeReducer, {
  type CoinChangeState,
  initialState,
  reset,
  flattenSubSteps,
} from "./coinChangeSlice";

type LocalRootState = { coinChange: CoinChangeState };

const CoinChangePlugin: DemoPlugin<
  CoinChangeState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "coin-change",
  name: "Coin Change (DP)",
  description:
    "Visualize the classic dynamic programming coin change problem — watch the DP table fill bottom-up as each amount is solved.",
  initialState,
  reducer: coinChangeReducer,
  Component: CoinChangeVisualization,
  restartConfig: {
    text: "Try Again",
    color: "#f59e0b",
  },
  getSteps: (state: CoinChangeState): DemoStep[] => {
    const subSteps = flattenSubSteps(state.steps);

    const fillSteps: DemoStep[] = subSteps.map((sub, i) => {
      const isLast = i === subSteps.length - 1;
      const step = state.steps[sub.amtIndex];

      if (sub.type === "reveal") {
        return {
          label: `dp[${step.amount}]`,
          autoAdvance: false,
          nextButtonText: step.candidates.length > 0 ? "Try Coins" : "Lock In",
          processingText: "Computing...",
          nextButtonColor: "#f59e0b",
        };
      }

      if (sub.type === "tryCandidate") {
        const cand = step.candidates[sub.candidateIndex];
        const isLastCandidate =
          sub.candidateIndex === step.candidates.length - 1;
        return {
          label: `Try coin ${cand.coin} for dp[${step.amount}]`,
          autoAdvance: false,
          nextButtonText: isLastCandidate ? "Lock In Best" : "Try Next Coin",
          processingText: "Evaluating...",
          nextButtonColor: "#a78bfa",
        };
      }

      // lockIn
      return {
        label: `Lock dp[${step.amount}] = ${step.bestValue === Infinity ? "∞" : step.bestValue}`,
        autoAdvance: false,
        nextButtonText: isLast ? "See Result" : "Next Amount",
        processingText: "Locking...",
        nextButtonColor: step.bestValue !== Infinity ? "#22c55e" : "#ef4444",
      };
    });

    return [
      {
        label: "Configure",
        autoAdvance: false,
        nextButtonText: "Start DP",
        nextButtonColor: "#f59e0b",
      },
      {
        label: "Initialize Table",
        autoAdvance: false,
        nextButtonText: "Fill Table",
        processingText: "Setting up...",
        nextButtonColor: "#3b82f6",
      },
      ...fillSteps,
      {
        label: "Result",
        autoAdvance: false,
      },
    ];
  },
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.coinChange,
};

export default CoinChangePlugin;
