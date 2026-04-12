import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import StepFunctionsVisualization from "./main";
import stepFunctionsReducer, {
  type StepFunctionsState,
  initialState,
  reset,
} from "./stepFunctionsSlice";

type LocalRootState = { stepFunctions: StepFunctionsState };

const StepFunctionsPlugin: DemoPlugin<
  StepFunctionsState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "step-functions",
  name: "Step Functions",
  description:
    "See how AWS Step Functions orchestrates an insurance claims workflow — state by state, one transition at a time.",
  initialState,
  reducer: stepFunctionsReducer,
  Component: StepFunctionsVisualization,
  restartConfig: { text: "Replay", color: "#f97316" },
  getSteps: (_: StepFunctionsState): DemoStep[] => [
    {
      label: "Architecture Overview",
      autoAdvance: false,
      nextButtonText: "Start Workflow",
    },
    {
      label: "Client → Resolver",
      autoAdvance: false,
      nextButtonText: "Resolve Mutation",
      processingText: "Submitting...",
      nextButtonColor: "#06b6d4",
    },
    {
      label: "Resolver → ClaimService",
      autoAdvance: false,
      nextButtonText: "Delegate to Service",
      processingText: "Resolving...",
      nextButtonColor: "#e879f9",
    },
    {
      label: "ClaimService → SDK Client",
      autoAdvance: false,
      nextButtonText: "Call putEvents",
      processingText: "Publishing...",
      nextButtonColor: "#d946ef",
    },
    {
      label: "SDK → Event Bus",
      autoAdvance: false,
      nextButtonText: "Enter Bus",
      processingText: "Sending event...",
      nextButtonColor: "#a855f7",
    },
    {
      label: "Bus → Rule Engine",
      autoAdvance: false,
      nextButtonText: "Match Rule",
      processingText: "Matching...",
      nextButtonColor: "#8b5cf6",
    },
    {
      label: "Rule → Target",
      autoAdvance: false,
      nextButtonText: "Route to Target",
      processingText: "Routing...",
      nextButtonColor: "#7c3aed",
    },
    {
      label: "Target → Validate Claim",
      autoAdvance: false,
      nextButtonText: "Call Lambda",
      processingText: "Starting...",
      nextButtonColor: "#5b21b6",
    },
    {
      label: "Validate → Lambda",
      autoAdvance: false,
      nextButtonText: "Get Result",
      processingText: "Calling Lambda...",
      nextButtonColor: "#f97316",
    },
    {
      label: "Validate → Choice State",
      autoAdvance: false,
      nextButtonText: "Evaluate Condition",
      processingText: "Returning...",
      nextButtonColor: "#f59e0b",
    },
    {
      label: "Choice → Assess Claim",
      autoAdvance: false,
      nextButtonText: "Call Assessment Lambda",
      processingText: "Choosing...",
      nextButtonColor: "#22c55e",
    },
    {
      label: "Assess → Lambda",
      autoAdvance: false,
      nextButtonText: "Assessment Done",
      processingText: "Calculating payout...",
      nextButtonColor: "#f97316",
    },
    {
      label: "Assess → Wait for Approval",
      autoAdvance: false,
      nextButtonText: "Send Token",
      processingText: "Transitioning...",
      nextButtonColor: "#fbbf24",
    },
    {
      label: "Wait → Admin Dashboard",
      autoAdvance: false,
      nextButtonText: "Adjuster Reviews",
      processingText: "Sending token...",
      nextButtonColor: "#fbbf24",
    },
    {
      label: "Admin → Approve Claim",
      autoAdvance: false,
      nextButtonText: "Resume Workflow",
      processingText: "Reviewing...",
      nextButtonColor: "#22c55e",
    },
    {
      label: "Approval → Store Documents",
      autoAdvance: false,
      nextButtonText: "Upload to S3",
      processingText: "Resuming...",
      nextButtonColor: "#22c55e",
    },
    {
      label: "Store Docs → S3",
      autoAdvance: false,
      nextButtonText: "Documents Stored",
      processingText: "Uploading...",
      nextButtonColor: "#2563eb",
    },
    {
      label: "Store Docs → Notify Customer",
      autoAdvance: false,
      nextButtonText: "Send Notification",
      processingText: "Transitioning...",
      nextButtonColor: "#818cf8",
    },
    {
      label: "Notify → SNS",
      autoAdvance: false,
      nextButtonText: "Notification Sent",
      processingText: "Publishing...",
      nextButtonColor: "#e11d48",
    },
    {
      label: "Notify → Claim Approved",
      autoAdvance: false,
      nextButtonText: "Show Fail Path",
      processingText: "Completing...",
      nextButtonColor: "#22c55e",
    },
    {
      label: "Choice → Reject Claim",
      autoAdvance: false,
      nextButtonText: "End Workflow",
      processingText: "Rejecting...",
      nextButtonColor: "#ef4444",
    },
    {
      label: "Reject → Claim Denied",
      autoAdvance: false,
      nextButtonText: "View Summary",
      processingText: "Failing...",
      nextButtonColor: "#ef4444",
    },
    {
      label: "Summary",
      autoAdvance: false,
    },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.stepFunctions,
};

export default StepFunctionsPlugin;
