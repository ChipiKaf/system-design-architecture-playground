import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import {
  getBinaryTargetIndex,
  resetScene,
  setBinaryFrameIndex,
  setBinaryFrames,
  setLinearChecks,
  setPhase,
  setQuadraticPreviewCount,
} from "./bigOSlice";

const buildBinaryFrames = (size: number, target: number) => {
  const frames: {
    low: number;
    high: number;
    mid: number;
    decision: "left" | "right" | "found";
  }[] = [];

  let low = 0;
  let high = size - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (mid === target) {
      frames.push({ low, high, mid, decision: "found" });
      break;
    }

    if (mid < target) {
      frames.push({ low, high, mid, decision: "right" });
      low = mid + 1;
    } else {
      frames.push({ low, high, mid, decision: "left" });
      high = mid - 1;
    }
  }

  return frames;
};

export const useBigOAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const bigO = useSelector((state: RootState) => state.bigO);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined!);
  const onCompleteRef = useRef(onAnimationComplete);

  onCompleteRef.current = onAnimationComplete;

  const cleanup = useCallback(() => {
    clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    cleanup();
    dispatch(resetScene());

    if (currentStep === 0) {
      dispatch(setPhase("intro"));
      timeoutRef.current = setTimeout(() => onCompleteRef.current?.(), 0);
      return cleanup;
    }

    if (currentStep === 1) {
      dispatch(setPhase("constant"));
      timeoutRef.current = setTimeout(() => onCompleteRef.current?.(), 300);
      return cleanup;
    }

    if (currentStep === 2) {
      dispatch(setPhase("logarithmic"));
      const frames = buildBinaryFrames(
        bigO.inputSize,
        getBinaryTargetIndex(bigO.inputSize),
      );
      dispatch(setBinaryFrames(frames));

      let frameIndex = 0;
      const advance = () => {
        frameIndex += 1;

        if (frameIndex < frames.length) {
          dispatch(setBinaryFrameIndex(frameIndex));
          timeoutRef.current = setTimeout(advance, 760);
          return;
        }

        timeoutRef.current = setTimeout(() => onCompleteRef.current?.(), 420);
      };

      timeoutRef.current = setTimeout(advance, 760);
      return cleanup;
    }

    if (currentStep === 3) {
      dispatch(setPhase("linear"));
      let checked = 0;
      const jump = bigO.inputSize <= 16 ? 1 : bigO.inputSize <= 32 ? 2 : 4;

      const tick = () => {
        checked = Math.min(bigO.inputSize, checked + jump);
        dispatch(setLinearChecks(checked));

        if (checked < bigO.inputSize) {
          timeoutRef.current = setTimeout(tick, 95);
          return;
        }

        timeoutRef.current = setTimeout(() => onCompleteRef.current?.(), 320);
      };

      timeoutRef.current = setTimeout(tick, 180);
      return cleanup;
    }

    if (currentStep === 4) {
      dispatch(setPhase("quadratic"));
      const previewSize = Math.min(bigO.inputSize, 12);
      const previewTotal = previewSize * previewSize;
      const jump = Math.max(1, Math.ceil(previewTotal / 18));
      let shown = 0;

      const tick = () => {
        shown = Math.min(previewTotal, shown + jump);
        dispatch(setQuadraticPreviewCount(shown));

        if (shown < previewTotal) {
          timeoutRef.current = setTimeout(tick, 95);
          return;
        }

        timeoutRef.current = setTimeout(() => onCompleteRef.current?.(), 420);
      };

      timeoutRef.current = setTimeout(tick, 180);
      return cleanup;
    }

    if (currentStep === 5) {
      dispatch(setPhase("summary"));
      timeoutRef.current = setTimeout(() => onCompleteRef.current?.(), 0);
      return cleanup;
    }

    return cleanup;
  }, [bigO.inputSize, cleanup, currentStep, dispatch]);

  return {
    bigO,
    currentStep,
  };
};
