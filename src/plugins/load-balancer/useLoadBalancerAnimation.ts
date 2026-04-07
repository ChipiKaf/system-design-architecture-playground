import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { dispatchRequest, releaseConnections } from "./loadBalancerSlice";

const SINGLE_REQUEST_CLIENT = "client-a";
const BURST_SEQUENCE = [
  "client-a",
  "client-b",
  "client-a",
  "client-c",
  "client-b",
  "client-d",
];
const SINGLE_REQUEST_DELAY_MS = 900;
const BURST_INTERVAL_MS = 850;
const BURST_SETTLE_DELAY_MS = 900;

export const useLoadBalancerAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep, passCount } = useSelector(
    (state: RootState) => state.simulation,
  );
  const loadBalancer = useSelector((state: RootState) => state.loadBalancer);

  const onCompleteRef = useRef(onAnimationComplete);
  useEffect(() => {
    onCompleteRef.current = onAnimationComplete;
  });

  useEffect(() => {
    let completionTimer: number | undefined;
    const done = () => onCompleteRef.current?.();

    if (currentStep === 0) {
      dispatch(releaseConnections());
      completionTimer = window.setTimeout(done, 0);

      return () => {
        if (completionTimer !== undefined) {
          window.clearTimeout(completionTimer);
        }
      };
    }

    if (currentStep === 1) {
      dispatch(dispatchRequest({ clientId: SINGLE_REQUEST_CLIENT }));
      completionTimer = window.setTimeout(done, SINGLE_REQUEST_DELAY_MS);

      return () => {
        if (completionTimer !== undefined) {
          window.clearTimeout(completionTimer);
        }
      };
    }

    if (currentStep === 2) {
      dispatch(dispatchRequest({ clientId: BURST_SEQUENCE[0] }));

      let nextRequestIndex = 1;
      const interval = window.setInterval(() => {
        dispatch(
          dispatchRequest({ clientId: BURST_SEQUENCE[nextRequestIndex] }),
        );
        nextRequestIndex += 1;

        if (nextRequestIndex >= BURST_SEQUENCE.length) {
          window.clearInterval(interval);
          completionTimer = window.setTimeout(done, BURST_SETTLE_DELAY_MS);
        }
      }, BURST_INTERVAL_MS);

      return () => {
        window.clearInterval(interval);

        if (completionTimer !== undefined) {
          window.clearTimeout(completionTimer);
        }
      };
    }

    completionTimer = window.setTimeout(done, 0);

    return () => {
      if (completionTimer !== undefined) {
        window.clearTimeout(completionTimer);
      }
    };
  }, [currentStep, dispatch, passCount]);

  return { loadBalancer, currentStep };
};
