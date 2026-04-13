import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ClimbingStairsPhase =
  | "intro"
  | "understand"
  | "subproblem"
  | "recurrence"
  | "init-array"
  | "base-0"
  | "base-1"
  | "filling"
  | "result";

export interface ClimbingStairsState {
  n: number;
  dp: number[];
  phase: ClimbingStairsPhase;
  /** Index of last filled cell (-1 = none) */
  filledUpTo: number;
  /** Currently highlighted cell (-1 = none) */
  currentIndex: number;
  explanation: string;
}

const DEFAULT_N = 5;

function buildEmptyDp(n: number): number[] {
  return new Array(n + 1).fill(0);
}

export const initialState: ClimbingStairsState = {
  n: DEFAULT_N,
  dp: buildEmptyDp(DEFAULT_N),
  phase: "intro",
  filledUpTo: -1,
  currentIndex: -1,
  explanation:
    "Climbing Stairs: given n steps, each time you can climb 1 or 2 steps. " +
    "How many distinct ways can you reach the top?",
};

const climbingStairsSlice = createSlice({
  name: "climbingStairs",
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
      state.explanation = `n = ${n}. How many distinct ways to climb ${n} stairs?`;
    },

    setUnderstand(state) {
      state.phase = "understand";
      state.explanation =
        `You're at the bottom of a staircase with ${state.n} steps. ` +
        "Each move you pick: go up 1 step, or go up 2 steps. " +
        "How many different sequences of 1s and 2s add up to n?";
    },

    setSubproblem(state) {
      state.phase = "subproblem";
      state.explanation =
        "Key insight: to reach step i, you must have come from step i−1 (took 1 step) " +
        "or step i−2 (took 2 steps). So the number of ways to reach step i depends " +
        "on how many ways there were to reach those earlier steps. " +
        "That's the sub-problem! dp[i] = number of distinct ways to reach step i.";
    },

    setRecurrence(state) {
      state.phase = "recurrence";
      state.explanation =
        "Since you can only arrive at step i from step i−1 or step i−2: " +
        "dp[i] = dp[i−1] + dp[i−2]. " +
        "This is exactly the same as the Fibonacci sequence!";
    },

    initArray(state) {
      state.phase = "init-array";
      state.dp = new Array(state.n + 1).fill(0);
      state.explanation =
        `We create an array dp of size ${state.n + 1} (indices 0 through ${state.n}). ` +
        "Each index represents a step number, and the value will hold " +
        "the number of ways to reach that step.";
    },

    setBase0(state) {
      state.phase = "base-0";
      state.dp[0] = 1;
      state.filledUpTo = 0;
      state.currentIndex = 0;
      state.explanation =
        "dp[0] = 1 — there is exactly ONE way to be at the ground (step 0): " +
        "do nothing. This might feel odd, but we need it so the formula works for step 2.";
    },

    setBase1(state) {
      state.phase = "base-1";
      state.dp[1] = 1;
      state.filledUpTo = 1;
      state.currentIndex = 1;
      state.explanation =
        "dp[1] = 1 — there is exactly ONE way to reach step 1: " +
        "take a single step from the ground. No other option.";
    },

    fillCell(state, action: PayloadAction<{ index: number }>) {
      const { index } = action.payload;
      if (index < 2 || index > state.n) return;
      const prev1 = state.dp[index - 1];
      const prev2 = state.dp[index - 2];
      const val = prev1 + prev2;
      state.dp[index] = val;
      state.phase = "filling";
      state.filledUpTo = index;
      state.currentIndex = index;
      state.explanation =
        `dp[${index}] = dp[${index - 1}] + dp[${index - 2}] = ${prev1} + ${prev2} = ${val}.\n` +
        `→ There were ${prev1} way${prev1 > 1 ? "s" : ""} to reach step ${index - 1} (then take +1), ` +
        `and ${prev2} way${prev2 > 1 ? "s" : ""} to reach step ${index - 2} (then take +2). ` +
        `Combined: ${val} distinct ways to reach step ${index}.`;
    },

    showResult(state) {
      state.phase = "result";
      state.currentIndex = state.n;
      state.explanation =
        `✅ Answer: dp[${state.n}] = ${state.dp[state.n]}. ` +
        `There are ${state.dp[state.n]} distinct ways to climb ${state.n} stairs!`;
    },

    patchState(state, action: PayloadAction<Partial<ClimbingStairsState>>) {
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
  setBase0,
  setBase1,
  fillCell,
  showResult,
  patchState,
} = climbingStairsSlice.actions;

export default climbingStairsSlice.reducer;
