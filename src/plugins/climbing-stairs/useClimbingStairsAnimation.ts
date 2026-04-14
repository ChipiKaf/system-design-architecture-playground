import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import {
  setUnderstand,
  setSubproblem,
  setRecurrence,
  initArray,
  setBase0,
  setBase1,
  fillCell,
  showResult,
  patchState,
  type ClimbingStairsState,
} from "./climbingStairsSlice";

export const useClimbingStairsAnimation = (
  onAnimationComplete?: () => void,
) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((s: RootState) => s.simulation);
  const runtime = useSelector(
    (s: RootState) => s.climbingStairs,
  ) as ClimbingStairsState;

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

    /* ── Step 0: Configure ─────────────────────────── */
    if (currentStep === 0) {
      dispatch(
        patchState({
          phase: "intro",
          currentIndex: -1,
          filledUpTo: -1,
          explanation: `Pick a value for n (the number of stairs). We'll walk through solving this step by step.`,
        }),
      );
      finish();
      return;
    }

    /* ── Step 1: Understand the problem ────────────── */
    if (currentStep === 1) {
      dispatch(setUnderstand());
      finish();
      return;
    }

    /* ── Step 2: Identify the sub-problem ─────────── */
    if (currentStep === 2) {
      dispatch(setSubproblem());
      finish();
      return;
    }

    /* ── Step 3: Discover the recurrence ──────────── */
    if (currentStep === 3) {
      dispatch(setRecurrence());
      finish();
      return;
    }

    /* ── Step 4: Create the dp array ──────────────── */
    if (currentStep === 4) {
      dispatch(initArray());
      finish();
      return;
    }

    /* ── Step 5: Base case dp[0] = 1 ─────────────── */
    if (currentStep === 5) {
      dispatch(setBase0());
      finish();
      return;
    }

    /* ── Step 6: Base case dp[1] = 1 ─────────────── */
    if (currentStep === 6) {
      dispatch(setBase1());
      finish();
      return;
    }

    /* ── Steps 7+: Fill dp[2] through dp[n] ─────── */
    const fillIndex = currentStep - 5; // step 7 → index 2, step 8 → index 3, etc.
    if (fillIndex >= 2 && fillIndex <= rt.n) {
      dispatch(fillCell({ index: fillIndex }));
      finish();
      return;
    }

    /* ── Final: Result ─────────────────────────────── */
    dispatch(showResult());
    finish();
  }, [currentStep, dispatch, finish]);

  return { runtime, currentStep };
};
