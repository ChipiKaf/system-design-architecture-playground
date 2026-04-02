import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import {
  prepareSteps,
  revealNextComparison,
  setResult,
  patchState,
  type PalindromeState,
} from "./palindromeSlice";

export const usePalindromeAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector(
    (state: RootState) => state.palindrome,
  ) as PalindromeState;
  const onCompleteRef = useRef(onAnimationComplete);
  const runtimeRef = useRef(runtime);

  onCompleteRef.current = onAnimationComplete;
  runtimeRef.current = runtime;

  useEffect(() => {
    const finish = () => {
      setTimeout(() => onCompleteRef.current?.(), 0);
    };

    const rt = runtimeRef.current;

    /* ── 0: Intro ──────────────────────────────────────── */
    if (currentStep === 0) {
      dispatch(
        patchState({
          phase: "intro",
          left: -1,
          right: -1,
          revealedCount: 0,
          isPalindrome: null,
          explanation:
            "A palindrome reads the same forwards and backwards. " +
            "We use two pointers — one at each end — and walk them inward, comparing characters. " +
            "Type a word above and press Start!",
        }),
      );
      finish();
      return;
    }

    /* ── 1: Set up pointers ────────────────────────────── */
    if (currentStep === 1) {
      dispatch(prepareSteps());
      dispatch(
        patchState({
          phase: "comparing",
          explanation:
            `Left pointer at index 0, right pointer at index ${rt.cleaned.length - 1}. ` +
            `We'll compare characters moving inward.`,
        }),
      );
      finish();
      return;
    }

    /* ── 2+: Comparison steps ──────────────────────────── */
    // Steps 2 through N+1 each reveal one comparison
    const compIndex = currentStep - 2;
    if (compIndex >= 0 && compIndex < rt.steps.length) {
      dispatch(revealNextComparison());
      finish();
      return;
    }

    /* ── Final: Result ─────────────────────────────────── */
    if (compIndex >= rt.steps.length) {
      dispatch(setResult());
      finish();
      return;
    }
  }, [currentStep, dispatch]);

  return { runtime, currentStep };
};
