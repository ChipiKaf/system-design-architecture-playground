import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import EcsAutoscalingVisualization from "./main";
import ecsAutoscalingReducer, {
  type EcsAutoscalingState,
  initialState,
  reset,
} from "./ecsAutoscalingSlice";

type LocalRootState = { ecsAutoscaling: EcsAutoscalingState };

const EcsAutoscalingPlugin: DemoPlugin<
  EcsAutoscalingState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "ecs-autoscaling",
  name: "ECS Autoscaling",
  description:
    "See how AWS ECS scales containers up and down in response to load — CloudWatch alarms, scaling policies, ECR image pulls, and ALB target registration.",
  initialState,
  reducer: ecsAutoscalingReducer,
  Component: EcsAutoscalingVisualization,
  restartConfig: {
    text: "Replay",
    color: "#f97316",
  },
  getSteps: (state: EcsAutoscalingState): DemoStep[] => {
    const baseSteps: DemoStep[] = [
      {
        label: "Architecture Overview",
        autoAdvance: false,
        nextButtonText: "Send Request",
      },
      {
        label: "Clients → ALB",
        autoAdvance: false,
        nextButtonText: "Route to Task 1",
        processingText: "Sending...",
        nextButtonColor: "#2563eb",
      },
      {
        label: "ALB → Task 1",
        autoAdvance: false,
        nextButtonText: "Route to Task 2",
        processingText: "Routing...",
        nextButtonColor: "#2563eb",
      },
      {
        label: "ALB → Task 2",
        autoAdvance: false,
        nextButtonText: "Query Database",
        processingText: "Routing...",
        nextButtonColor: "#2563eb",
      },
      {
        label: "Task → Database",
        autoAdvance: false,
        nextButtonText: "Send Metrics",
        processingText: "Querying...",
        nextButtonColor: "#22c55e",
      },
      {
        label: "Task 1 → CloudWatch",
        autoAdvance: false,
        nextButtonText: "More Metrics",
        processingText: "Reporting...",
        nextButtonColor: "#e11d48",
      },
      {
        label: "Task 2 → CloudWatch",
        autoAdvance: false,
        nextButtonText:
          state.scalingPath === "no-scaling" ? "View Result" : "Check Alarm",
        processingText: "Evaluating...",
        nextButtonColor: "#e11d48",
      },
    ];

    /* ── No scaling needed: short path ─────────────── */
    if (state.scalingPath === "no-scaling") {
      return [
        ...baseSteps,
        {
          label: "No Scaling Needed",
          autoAdvance: false,
          nextButtonText: "Done",
          nextButtonColor: "#22c55e",
        },
      ];
    }

    /* ── Scale-out path (pending or confirmed) ─────── */
    const scaleOutSteps: DemoStep[] = [
      ...baseSteps,
      {
        label: "Alarm → Scaling Policy",
        autoAdvance: false,
        nextButtonText: "Set Desired Count",
        processingText: "Alerting...",
        nextButtonColor: "#ef4444",
      },
      {
        label: "Policy → ECS Service",
        autoAdvance: false,
        nextButtonText: "Pull Image (Task 3)",
        processingText: "Scaling...",
        nextButtonColor: "#8b5cf6",
      },
      {
        label: "ECR → Task 3",
        autoAdvance: false,
        nextButtonText: "Pull Image (Task 4)",
        processingText: "Pulling...",
        nextButtonColor: "#f97316",
      },
      {
        label: "ECR → Task 4",
        autoAdvance: false,
        nextButtonText: "Register with ALB",
        processingText: "Pulling...",
        nextButtonColor: "#f97316",
      },
      {
        label: "ALB Registers Tasks",
        autoAdvance: false,
        nextButtonText: "View Balanced State",
        processingText: "Registering...",
        nextButtonColor: "#22c55e",
      },
      {
        label: "System Balanced",
        autoAdvance: false,
        nextButtonText:
          state.scaleInPath === "no-scale-in"
            ? "View Result"
            : "Evaluate Scale-In",
        nextButtonColor: "#0ea5e9",
      },
    ];

    /* ── Scale-in sub-path ─────────────────────────── */
    if (state.scaleInPath === "no-scale-in") {
      return [
        ...scaleOutSteps,
        {
          label: "No Scale-In Needed",
          autoAdvance: false,
          nextButtonText: "Done",
          nextButtonColor: "#22c55e",
        },
      ];
    }

    return [
      ...scaleOutSteps,
      {
        label: "Scale In — Drain Tasks",
        autoAdvance: false,
        nextButtonText: "Summary",
        processingText: "Draining...",
        nextButtonColor: "#0ea5e9",
      },
      {
        label: "Summary",
        autoAdvance: false,
      },
    ];
  },
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.ecsAutoscaling,
};

export default EcsAutoscalingPlugin;
