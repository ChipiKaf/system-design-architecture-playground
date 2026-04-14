import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import {
  setUnderstand,
  setSubproblem,
  setRecurrence,
  initArray,
  setBase,
  fillCell,
  showResult,
  patchState,
  type PerfectSquaresState,
} from "./perfectSquaresSlice";

export const usePerfectSquaresAnimation = (
  onAnimationComplete?: () => void,
) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((s: RootState) => s.simulation);
  const runtime = useSelector(
    (s: RootState) => s.perfectSquares,
  ) as PerfectSquaresState;

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

    /* Step 0: Configure */
    if (currentStep === 0) {
      dispatch(
        patchState({
          phase: "intro",
          currentIndex: -1,
          filledUpTo: -1,
          bestJ: -1,
          explanation: `Pick a value for n. We'll find the minimum number of perfect squares that sum to n.`,
        }),
      );
      finish();
      return;
    }

    /* Step 1: Understand the problem */
    if (currentStep === 1) {
      dispatch(setUnderstand());
      finish();
      return;
    }

    /* Step 2: Identify the sub-problem */
    if (currentStep === 2) {
      dispatch(setSubproblem());
      finish();
      return;
    }

    /* Step 3: Discover the recurrence */
    if (currentStep === 3) {
      dispatch(setRecurrence());
      finish();
      return;
    }

    /* Step 4: Create dp array */
    if (currentStep === 4) {
      dispatch(initArray());
      finish();
      return;
    }

    /* Step 5: Base case dp[0] = 0 */
    if (currentStep === 5) {
      dispatch(setBase());
      finish();
      return;
    }

    /* Steps 6+: Fill dp[1] through dp[n] */
    const fillIndex = currentStep - 5; // step 6 → index 1, step 7 → index 2, …
    if (fillIndex >= 1 && fillIndex <= rt.n) {
      dispatch(fillCell({ index: fillIndex }));
      finish();
      return;
    }

    /* Final: Result */
    dispatch(showResult());
    finish();
  }, [currentStep, dispatch, finish]);

  return { runtime, currentStep };
};
