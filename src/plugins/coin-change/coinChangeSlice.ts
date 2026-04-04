import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type CoinChangePhase =
  | "intro"
  | "filling"
  | "tryingCoin"
  | "chosen"
  | "result";

export interface CoinCandidate {
  coin: number;
  fromAmount: number;
  fromValue: number;
  resultValue: number;
}

export interface FillStep {
  amount: number;
  candidates: CoinCandidate[];
  bestValue: number;
  bestCoin: number | null;
}

export interface CoinChangeState {
  coins: number[];
  target: number;
  dp: number[];
  bestCoin: (number | null)[];
  phase: CoinChangePhase;
  steps: FillStep[];
  revealedCount: number;
  currentAmount: number;
  currentCandidates: CoinCandidate[];
  highlightCandidate: number;
  explanation: string;
}

const DEFAULT_COINS = [1, 3, 4];
const DEFAULT_TARGET = 6;
const INF = Infinity;

function computeSteps(coins: number[], target: number) {
  const dp = new Array(target + 1).fill(INF);
  const best = new Array<number | null>(target + 1).fill(null);
  dp[0] = 0;

  const steps: FillStep[] = [];

  for (let amt = 1; amt <= target; amt++) {
    const candidates: CoinCandidate[] = [];
    let bestVal = INF;
    let bestCoinVal: number | null = null;

    for (const coin of coins) {
      if (coin <= amt && dp[amt - coin] !== INF) {
        const resultValue = dp[amt - coin] + 1;
        candidates.push({
          coin,
          fromAmount: amt - coin,
          fromValue: dp[amt - coin],
          resultValue,
        });
        if (resultValue < bestVal) {
          bestVal = resultValue;
          bestCoinVal = coin;
        }
      }
    }

    if (bestVal < INF) {
      dp[amt] = bestVal;
      best[amt] = bestCoinVal;
    }

    steps.push({
      amount: amt,
      candidates,
      bestValue: dp[amt],
      bestCoin: bestCoinVal,
    });
  }

  return { dp, bestCoin: best, steps };
}

function buildInitialDp(target: number): number[] {
  const arr = new Array(target + 1).fill(INF);
  arr[0] = 0;
  return arr;
}

export const initialState: CoinChangeState = {
  coins: DEFAULT_COINS,
  target: DEFAULT_TARGET,
  dp: buildInitialDp(DEFAULT_TARGET),
  bestCoin: new Array(DEFAULT_TARGET + 1).fill(null),
  phase: "intro",
  steps: [],
  revealedCount: 0,
  currentAmount: -1,
  currentCandidates: [],
  highlightCandidate: -1,
  explanation:
    "The Coin Change problem: find the minimum number of coins to make an amount. We'll build the solution bottom-up.",
};

const coinChangeSlice = createSlice({
  name: "coinChange",
  initialState,
  reducers: {
    reset: () => initialState,

    configure(
      state,
      action: PayloadAction<{ coins: number[]; target: number }>,
    ) {
      const { coins, target } = action.payload;
      state.coins = coins;
      state.target = target;
      state.dp = buildInitialDp(target);
      state.bestCoin = new Array(target + 1).fill(null);
      state.phase = "intro";
      state.steps = [];
      state.revealedCount = 0;
      state.currentAmount = -1;
      state.currentCandidates = [];
      state.highlightCandidate = -1;
      state.explanation = `Coins: [${coins.join(", ")}], Target: ${target}. Ready to compute.`;
    },

    prepareSteps(state) {
      const { dp, bestCoin, steps } = computeSteps(state.coins, state.target);
      // We store precomputed steps but keep dp at initial for visual reveal
      state.steps = steps;
      // dp and bestCoin will be revealed incrementally
      void dp;
      void bestCoin;
    },

    revealAmount(state) {
      const idx = state.revealedCount;
      if (idx >= state.steps.length) return;
      const step = state.steps[idx];
      state.currentAmount = step.amount;
      state.currentCandidates = step.candidates;
      state.highlightCandidate = -1;
      state.phase = "filling";
      state.explanation =
        step.candidates.length > 0
          ? `Computing dp[${step.amount}]: trying each coin...`
          : `dp[${step.amount}]: no coin fits — stays ∞.`;
    },

    highlightCoinCandidate(state, action: PayloadAction<number>) {
      const ci = action.payload;
      state.highlightCandidate = ci;
      state.phase = "tryingCoin";
      if (ci >= 0 && ci < state.currentCandidates.length) {
        const c = state.currentCandidates[ci];
        const current = state.dp[state.currentAmount];
        const isBetter = c.resultValue < current;
        if (isBetter) {
          state.dp[state.currentAmount] = c.resultValue;
          state.bestCoin[state.currentAmount] = c.coin;
          state.explanation = `Try coin ${c.coin}: dp[${c.fromAmount}] + 1 = ${c.fromValue} + 1 = ${c.resultValue}. That's better than ${current === Infinity ? "∞" : current} → update dp[${state.currentAmount}] = ${c.resultValue}!`;
        } else {
          state.explanation = `Try coin ${c.coin}: dp[${c.fromAmount}] + 1 = ${c.fromValue} + 1 = ${c.resultValue}. Not better than current ${current} — skip.`;
        }
      }
    },

    lockInBest(state) {
      const idx = state.revealedCount;
      if (idx >= state.steps.length) return;
      const step = state.steps[idx];
      state.dp[step.amount] = step.bestValue;
      state.bestCoin[step.amount] = step.bestCoin;
      state.revealedCount = idx + 1;
      state.phase = "chosen";
      state.highlightCandidate = -1;

      if (step.bestCoin !== null) {
        state.explanation = `dp[${step.amount}] = ${step.bestValue} (using coin ${step.bestCoin}). Best choice locked in!`;
      } else {
        state.explanation = `dp[${step.amount}] = ∞ — no valid combination.`;
      }
    },

    setResult(state) {
      state.phase = "result";
      state.currentAmount = -1;
      state.currentCandidates = [];
      state.highlightCandidate = -1;
      const ans = state.dp[state.target];
      if (ans === INF) {
        state.explanation = `No solution! Cannot make ${state.target} with coins [${state.coins.join(", ")}].`;
      } else {
        // Trace back the coins used
        const used: number[] = [];
        let rem = state.target;
        while (rem > 0 && state.bestCoin[rem] !== null) {
          used.push(state.bestCoin[rem]!);
          rem -= state.bestCoin[rem]!;
        }
        state.explanation = `✓ Minimum coins for ${state.target} = ${ans}. Coins used: [${used.join(", ")}].`;
      }
    },

    patchState(state, action: PayloadAction<Partial<CoinChangeState>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const {
  reset,
  configure,
  prepareSteps,
  revealAmount,
  highlightCoinCandidate,
  lockInBest,
  setResult,
  patchState,
} = coinChangeSlice.actions;

export default coinChangeSlice.reducer;

/* ── Sub-step flattening ─────────────────────────────────
 *  Each amount expands into:
 *    1  "reveal"       – highlight the cell we're filling
 *    N  "tryCandidate" – one per candidate coin
 *    1  "lockIn"       – commit the best value
 *  Amounts with 0 candidates collapse to reveal + lockIn.
 * ──────────────────────────────────────────────────────── */

export type SubStep =
  | { type: "reveal"; amtIndex: number }
  | { type: "tryCandidate"; amtIndex: number; candidateIndex: number }
  | { type: "lockIn"; amtIndex: number };

export function flattenSubSteps(steps: FillStep[]): SubStep[] {
  const result: SubStep[] = [];
  for (let ai = 0; ai < steps.length; ai++) {
    result.push({ type: "reveal", amtIndex: ai });
    for (let ci = 0; ci < steps[ai].candidates.length; ci++) {
      result.push({ type: "tryCandidate", amtIndex: ai, candidateIndex: ci });
    }
    result.push({ type: "lockIn", amtIndex: ai });
  }
  return result;
}
