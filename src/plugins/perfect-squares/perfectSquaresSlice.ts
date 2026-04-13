import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type PerfectSquaresPhase =
  | "intro"
  | "understand"
  | "subproblem"
  | "recurrence"
  | "init-array"
  | "base-case"
  | "filling"
  | "result";

export interface PerfectSquaresState {
  n: number;
  dp: number[];
  phase: PerfectSquaresPhase;
  /** Index of last filled cell (-1 = none) */
  filledUpTo: number;
  /** Currently highlighted outer cell (-1 = none) */
  currentIndex: number;
  /** The j value whose j² gave the best result for currentIndex */
  bestJ: number;
  explanation: string;
}

const DEFAULT_N = 12;

function buildEmptyDp(n: number): number[] {
  return new Array(n + 1).fill(Infinity);
}

export const initialState: PerfectSquaresState = {
  n: DEFAULT_N,
  dp: buildEmptyDp(DEFAULT_N),
  phase: "intro",
  filledUpTo: -1,
  currentIndex: -1,
  bestJ: -1,
  explanation:
    "Perfect Squares: given an integer n, find the minimum number of " +
    "perfect square numbers (1, 4, 9, 16, …) that sum to n.",
};

const perfectSquaresSlice = createSlice({
  name: "perfectSquares",
  initialState,
  reducers: {
    reset: () => initialState,

    configure(state, action: PayloadAction<{ n: number }>) {
      const { n } = action.payload;
      state.n = n;
      state.dp = buildEmptyDp(n);
      state.phase = "intro";
      state.filledUpTo = -1;
      state.currentIndex = -1;
      state.bestJ = -1;
      state.explanation = `n = ${n}. What is the minimum number of perfect squares that sum to ${n}?`;
    },

    setUnderstand(state) {
      state.phase = "understand";
      state.explanation =
        `You have the number ${state.n}. ` +
        "You can use any perfect squares (1, 4, 9, 16, 25, …) and add them together. " +
        "What's the fewest squares you need to reach exactly n?";
    },

    setSubproblem(state) {
      state.phase = "subproblem";
      state.explanation =
        "Key insight: to build sum i using the fewest squares, " +
        "try subtracting every possible square j² from i. " +
        "If we already know the answer for (i − j²), we just add 1 more square. " +
        "dp[i] = the minimum number of perfect squares that sum to i.";
    },

    setRecurrence(state) {
      state.phase = "recurrence";
      state.explanation =
        "For each i, try every j where j² ≤ i: " +
        "dp[i] = min(dp[i − j²] + 1) over all valid j. " +
        "We pick the square that gives the smallest total count.";
    },

    initArray(state) {
      state.phase = "init-array";
      state.dp = new Array(state.n + 1).fill(Infinity);
      state.explanation =
        `Create dp array of size ${state.n + 1}, filled with ∞ (meaning "not solved yet"). ` +
        "We'll replace each ∞ with the actual minimum.";
    },

    setBase(state) {
      state.phase = "base-case";
      state.dp[0] = 0;
      state.filledUpTo = 0;
      state.currentIndex = 0;
      state.bestJ = -1;
      state.explanation =
        "dp[0] = 0 — to make the sum 0, you need zero squares. " +
        "This anchors the entire recurrence.";
    },

    fillCell(state, action: PayloadAction<{ index: number }>) {
      const { index } = action.payload;
      if (index < 1 || index > state.n) return;

      let best = Infinity;
      let bestJVal = 1;
      for (let j = 1; j * j <= index; j++) {
        const candidate = state.dp[index - j * j] + 1;
        if (candidate < best) {
          best = candidate;
          bestJVal = j;
        }
      }

      state.dp[index] = best;
      state.phase = "filling";
      state.filledUpTo = index;
      state.currentIndex = index;
      state.bestJ = bestJVal;

      const tried: string[] = [];
      for (let j = 1; j * j <= index; j++) {
        const sq = j * j;
        const remaining = index - sq;
        const candidate = state.dp[remaining] + 1;
        const marker = j === bestJVal ? " ✓ best" : "";
        tried.push(`${j}² = ${sq} → dp[${remaining}] + 1 = ${candidate}${marker}`);
      }

      state.explanation =
        `dp[${index}]: try each square j² ≤ ${index}:\n` +
        tried.join("\n") +
        `\n→ Best: use ${bestJVal}² = ${bestJVal * bestJVal}, so dp[${index}] = ${best}.`;
    },

    showResult(state) {
      state.phase = "result";
      state.currentIndex = state.n;
      state.bestJ = -1;
      state.explanation =
        `✅ Answer: dp[${state.n}] = ${state.dp[state.n]}. ` +
        `You need at minimum ${state.dp[state.n]} perfect square${state.dp[state.n] > 1 ? "s" : ""} to sum to ${state.n}.`;
    },

    patchState(state, action: PayloadAction<Partial<PerfectSquaresState>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const {
  reset,
  configure,
  setUnderstand,
  setSubproblem,
  setRecurrence,
  initArray,
  setBase,
  fillCell,
  showResult,
  patchState,
} = perfectSquaresSlice.actions;

export default perfectSquaresSlice.reducer;
