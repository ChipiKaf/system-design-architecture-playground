import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type LcsPhase =
  | "intro"
  | "init-null"
  | "init-zero"
  | "filling"
  | "match"
  | "noMatch"
  | "chosen"
  | "result";

export interface CellStep {
  row: number;
  col: number;
  char1: string;
  char2: string;
  isMatch: boolean;
  value: number;
  /** Where the value came from */
  from: "diagonal" | "up" | "left";
}

export interface LcsState {
  text1: string;
  text2: string;
  /** dp[i][j] — rows = text1.length+1, cols = text2.length+1 */
  dp: number[][];
  phase: LcsPhase;
  /** Tracks which init sub-phase the base row/col is in:
   *  'none' = not started, 'null' = showing null, 'zero' = showing 0 */
  initPhase: "none" | "null" | "zero";
  steps: CellStep[];
  revealedCount: number;
  currentRow: number;
  currentCol: number;
  explanation: string;
  /** The LCS string itself (computed at result) */
  lcsString: string;
  /** Cells on the back-trace path */
  tracePath: { row: number; col: number }[];
}

const DEFAULT_TEXT1 = "abcde";
const DEFAULT_TEXT2 = "ace";

function buildEmptyDp(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
}

function computeSteps(t1: string, t2: string) {
  const rows = t1.length + 1;
  const cols = t2.length + 1;
  const dp = buildEmptyDp(rows, cols);
  const steps: CellStep[] = [];

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const isMatch = t1[i - 1] === t2[j - 1];
      let value: number;
      let from: CellStep["from"];

      if (isMatch) {
        value = dp[i - 1][j - 1] + 1;
        from = "diagonal";
      } else {
        if (dp[i - 1][j] >= dp[i][j - 1]) {
          value = dp[i - 1][j];
          from = "up";
        } else {
          value = dp[i][j - 1];
          from = "left";
        }
      }
      dp[i][j] = value;

      steps.push({
        row: i,
        col: j,
        char1: t1[i - 1],
        char2: t2[j - 1],
        isMatch,
        value,
        from,
      });
    }
  }

  return { dp, steps };
}

function traceback(dp: number[][], t1: string, t2: string) {
  const path: { row: number; col: number }[] = [];
  let i = t1.length;
  let j = t2.length;
  const chars: string[] = [];

  while (i > 0 && j > 0) {
    path.push({ row: i, col: j });
    if (t1[i - 1] === t2[j - 1]) {
      chars.push(t1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return { lcsString: chars.reverse().join(""), tracePath: path.reverse() };
}

export const initialState: LcsState = {
  text1: DEFAULT_TEXT1,
  text2: DEFAULT_TEXT2,
  dp: buildEmptyDp(DEFAULT_TEXT1.length + 1, DEFAULT_TEXT2.length + 1),
  phase: "intro",
  initPhase: "none",
  steps: [],
  revealedCount: 0,
  currentRow: -1,
  currentCol: -1,
  explanation:
    "The Longest Common Subsequence problem: find the longest sequence of characters that appears in both strings (in order, but not necessarily contiguous).",
  lcsString: "",
  tracePath: [],
};

const lcsSlice = createSlice({
  name: "lcs",
  initialState,
  reducers: {
    reset: () => initialState,

    configure(state, action: PayloadAction<{ text1: string; text2: string }>) {
      const { text1, text2 } = action.payload;
      state.text1 = text1;
      state.text2 = text2;
      state.dp = buildEmptyDp(text1.length + 1, text2.length + 1);
      state.phase = "intro";
      state.initPhase = "none";
      state.steps = [];
      state.revealedCount = 0;
      state.currentRow = -1;
      state.currentCol = -1;
      state.lcsString = "";
      state.tracePath = [];
      state.explanation = `Strings: "${text1}" and "${text2}". Ready to compute.`;
    },

    prepareSteps(state) {
      const { steps } = computeSteps(state.text1, state.text2);
      state.steps = steps;
    },

    revealCell(state) {
      const idx = state.revealedCount;
      if (idx >= state.steps.length) return;
      const step = state.steps[idx];
      state.currentRow = step.row;
      state.currentCol = step.col;
      state.phase = "filling";
      state.explanation = step.isMatch
        ? `Cell (${step.row}, ${step.col}): "${step.char1}" === "${step.char2}" — characters match!`
        : `Cell (${step.row}, ${step.col}): "${step.char1}" ≠ "${step.char2}" — no match.`;
    },

    resolveCell(state) {
      const idx = state.revealedCount;
      if (idx >= state.steps.length) return;
      const step = state.steps[idx];

      state.dp[step.row][step.col] = step.value;
      state.revealedCount = idx + 1;
      state.phase = step.isMatch ? "match" : "noMatch";

      if (step.isMatch) {
        state.explanation = `✓ Match! dp[${step.row}][${step.col}] = dp[${step.row - 1}][${step.col - 1}] + 1 = ${step.value}. Extend the subsequence.`;
      } else if (step.from === "up") {
        state.explanation = `↑ No match. dp[${step.row}][${step.col}] = dp[${step.row - 1}][${step.col}] = ${step.value}. Carry best from above.`;
      } else {
        state.explanation = `← No match. dp[${step.row}][${step.col}] = dp[${step.row}][${step.col - 1}] = ${step.value}. Carry best from left.`;
      }
    },

    setResult(state) {
      // Build the full dp for traceback
      const { dp } = computeSteps(state.text1, state.text2);
      const { lcsString, tracePath } = traceback(dp, state.text1, state.text2);
      state.phase = "result";
      state.currentRow = -1;
      state.currentCol = -1;
      state.lcsString = lcsString;
      state.tracePath = tracePath;
      state.explanation =
        lcsString.length > 0
          ? `✓ LCS = "${lcsString}" (length ${lcsString.length}). The highlighted path shows how we traced it back.`
          : `No common subsequence found.`;
    },

    patchState(state, action: PayloadAction<Partial<LcsState>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const {
  reset,
  configure,
  prepareSteps,
  revealCell,
  resolveCell,
  setResult,
  patchState,
} = lcsSlice.actions;

export default lcsSlice.reducer;
