import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { dispatchRequest, type LoadBalancerState } from "./loadBalancerSlice";

export const useLoadBalancerAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const loadBalancer = useSelector(
    (state: RootState) => state.loadBalancer,
  ) as LoadBalancerState;

  useEffect(() => {
    if (currentStep === 0) {
      setTimeout(() => onAnimationComplete?.(), 0);
    } else if (currentStep === 1) {
      // Dispatch a single request to demonstrate routing
      dispatch(dispatchRequest());
      setTimeout(() => onAnimationComplete?.(), 600);
    } else if (currentStep === 2) {
      // Dispatch a burst of requests
      const totalRequests = 5;
      let dispatched = 0;
      const interval = setInterval(() => {
        dispatch(dispatchRequest());
        dispatched += 1;
        if (dispatched >= totalRequests) {
          clearInterval(interval);
          setTimeout(() => onAnimationComplete?.(), 400);
        }
      }, 300);
      return () => clearInterval(interval);
    } else {
      setTimeout(() => onAnimationComplete?.(), 0);
    }
  }, [currentStep]);

  return { loadBalancer, currentStep };
};
