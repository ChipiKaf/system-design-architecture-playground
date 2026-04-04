import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import {
  prepareSteps,
  revealAmount,
  highlightCoinCandidate,
  lockInBest,
  setResult,
  patchState,
  flattenSubSteps,
  type CoinChangeState,
} from "./coinChangeSlice";

export const useCoinChangeAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((s: RootState) => s.simulation);
  const runtime = useSelector(
    (s: RootState) => s.coinChange,
  ) as CoinChangeState;

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
          currentAmount: -1,
          revealedCount: 0,
          highlightCandidate: -1,
          explanation:
            "The Coin Change problem: find the minimum number of coins to make a target amount. " +
            "We build a DP table bottom-up. dp[0] = 0 (base case), all others start at ∞.",
        }),
      );
      finish();
      return;
    }

    /* ── Step 1: Initialize table ──────────────────── */
    if (currentStep === 1) {
      dispatch(prepareSteps());
      dispatch(
        patchState({
          phase: "filling",
          explanation: `Coins: [${rt.coins.join(", ")}], Target: ${rt.target}. dp[0] = 0 is our base case. Let's fill the rest.`,
        }),
      );
      finish();
      return;
    }

    /* ── Steps 2+: mapped from flattened sub-steps ── */
    const subSteps = flattenSubSteps(rt.steps);
    const subIdx = currentStep - 2;

    if (subIdx >= 0 && subIdx < subSteps.length) {
      const sub = subSteps[subIdx];

      if (sub.type === "reveal") {
        dispatch(revealAmount());
        finish();
        return;
      }

      if (sub.type === "tryCandidate") {
        dispatch(highlightCoinCandidate(sub.candidateIndex));
        finish();
        return;
      }

      if (sub.type === "lockIn") {
        dispatch(lockInBest());
        finish();
        return;
      }
    }

    /* ── Final: Result ─────────────────────────────── */
    if (subIdx >= subSteps.length) {
      dispatch(setResult());
      finish();
      return;
    }
  }, [currentStep, dispatch, finish]);

  return { runtime, currentStep };
};
