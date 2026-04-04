import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import {
  prepareSteps,
  revealCell,
  resolveCell,
  setResult,
  patchState,
  type LcsState,
} from "./lcsSlice";

export const useLcsAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((s: RootState) => s.simulation);
  const runtime = useSelector((s: RootState) => s.lcs) as LcsState;

  const onCompleteRef = useRef(onAnimationComplete);
  const runtimeRef = useRef(runtime);

  useEffect(() => {
    onCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);

  const finish = useCallback(() => {
    setTimeout(() => onCompleteRef.current?.(), 0);
  }, []);

  useEffect(() => {
    const rt = runtimeRef.current;

    /* ── Step 0: Intro ─────────────────────────────── */
    if (currentStep === 0) {
      dispatch(
        patchState({
          phase: "intro",
          currentRow: -1,
          currentCol: -1,
          revealedCount: 0,
          lcsString: "",
          tracePath: [],
          explanation:
            "The Longest Common Subsequence problem: find the longest sequence of characters " +
            "that appears in both strings (in order, but not necessarily contiguous). " +
            "We build a 2D DP table to solve it.",
        }),
      );
      finish();
      return;
    }

    /* ── Step 1: Array(m+1).fill(null) ────────────── */
    if (currentStep === 1) {
      dispatch(
        patchState({
          phase: "init-null",
          initPhase: "null",
          explanation:
            "Array(m+1).fill(null) creates a flat 1D array: [null, null, …]. " +
            "Each element will become one row of our 2D table. " +
            'We need m+1 rows (one per character of text1, plus one for the empty string "").',
        }),
      );
      finish();
      return;
    }

    /* ── Step 2: .map(() => Array(n+1).fill(0)) ──── */
    if (currentStep === 2) {
      dispatch(prepareSteps());
      dispatch(
        patchState({
          phase: "init-zero",
          initPhase: "zero",
          explanation:
            ".map(() => Array(n+1).fill(0)) replaces each null with a new array of zeros, " +
            'forming a 2D table. Row 0 and column 0 are the "" (empty string) base cases — ' +
            'comparing anything against "" always gives LCS length 0.',
        }),
      );
      finish();
      return;
    }

    /* ── Steps 3+: each cell gets 2 sub-steps ──────
     *   even offsets → revealCell (highlight + compare)
     *   odd offsets  → resolveCell (fill value)
     * ────────────────────────────────────────────── */
    const cellOffset = currentStep - 3;
    const cellIndex = Math.floor(cellOffset / 2);
    const isResolve = cellOffset % 2 === 1;

    if (cellIndex >= 0 && cellIndex < rt.steps.length) {
      if (!isResolve) {
        dispatch(revealCell());
      } else {
        dispatch(resolveCell());
      }
      finish();
      return;
    }

    /* ── Final: Result ─────────────────────────────── */
    const totalCellSteps = rt.steps.length * 2;
    if (cellOffset >= totalCellSteps) {
      dispatch(setResult());
      finish();
      return;
    }
  }, [currentStep, dispatch, finish]);

  return { runtime, currentStep };
};
