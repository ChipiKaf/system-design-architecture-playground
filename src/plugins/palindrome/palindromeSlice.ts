import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type PalindromePhase =
  | "intro"
  | "comparing"
  | "match"
  | "mismatch"
  | "result";

export interface ComparisonStep {
  left: number;
  right: number;
  charLeft: string;
  charRight: string;
  isMatch: boolean;
}

export interface PalindromeState {
  /** The string being checked */
  input: string;
  /** Cleaned (lowercased, alphanumeric only) version */
  cleaned: string;
  phase: PalindromePhase;
  /** All comparison steps pre-computed */
  steps: ComparisonStep[];
  /** How many comparison steps have been revealed so far */
  revealedCount: number;
  /** Current left pointer index (in cleaned string) */
  left: number;
  /** Current right pointer index (in cleaned string) */
  right: number;
  /** Final verdict: null = not yet decided */
  isPalindrome: boolean | null;
  /** Explanation text */
  explanation: string;
}

const DEFAULT_INPUT = "racecar";

function cleanString(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function computeSteps(cleaned: string): ComparisonStep[] {
  const result: ComparisonStep[] = [];
  let l = 0;
  let r = cleaned.length - 1;
  while (l < r) {
    const isMatch = cleaned[l] === cleaned[r];
    result.push({
      left: l,
      right: r,
      charLeft: cleaned[l],
      charRight: cleaned[r],
      isMatch,
    });
    if (!isMatch) break; // stop at first mismatch
    l++;
    r--;
  }
  return result;
}

export const initialState: PalindromeState = {
  input: DEFAULT_INPUT,
  cleaned: cleanString(DEFAULT_INPUT),
  phase: "intro",
  steps: [],
  revealedCount: 0,
  left: -1,
  right: -1,
  isPalindrome: null,
  explanation:
    "A palindrome reads the same forwards and backwards. We'll use two pointers to check.",
};

const palindromeSlice = createSlice({
  name: "palindrome",
  initialState,
  reducers: {
    reset: () => initialState,

    setInput(state, action: PayloadAction<string>) {
      const input = action.payload;
      const cleaned = cleanString(input);
      state.input = input;
      state.cleaned = cleaned;
      state.phase = "intro";
      state.steps = computeSteps(cleaned);
      state.revealedCount = 0;
      state.left = -1;
      state.right = -1;
      state.isPalindrome = null;
      state.explanation = `"${input}" → cleaned: "${cleaned}" (${cleaned.length} chars). Ready to check.`;
    },

    prepareSteps(state) {
      state.steps = computeSteps(state.cleaned);
      state.revealedCount = 0;
      state.left = 0;
      state.right = state.cleaned.length - 1;
    },

    revealNextComparison(state) {
      const idx = state.revealedCount;
      if (idx >= state.steps.length) return;
      const step = state.steps[idx];
      state.left = step.left;
      state.right = step.right;
      state.revealedCount = idx + 1;
      state.phase = step.isMatch ? "match" : "mismatch";
      state.explanation = step.isMatch
        ? `'${step.charLeft}' === '${step.charRight}' ✓  Pointers move inward.`
        : `'${step.charLeft}' !== '${step.charRight}' ✗  Not a palindrome!`;
    },

    setResult(state) {
      const allMatch = state.steps.every((s) => s.isMatch);
      state.phase = "result";
      state.isPalindrome = allMatch;
      state.left = -1;
      state.right = -1;
      state.explanation = allMatch
        ? `✓ "${state.input}" IS a palindrome! All pointer pairs matched.`
        : `✗ "${state.input}" is NOT a palindrome. A mismatch was found.`;
    },

    patchState(state, action: PayloadAction<Partial<PalindromeState>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const {
  reset,
  setInput,
  prepareSteps,
  revealNextComparison,
  setResult,
  patchState,
} = palindromeSlice.actions;

export default palindromeSlice.reducer;
