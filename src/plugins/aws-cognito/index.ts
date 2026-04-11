import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import AwsCognitoVisualization from "./main";
import awsCognitoReducer, {
  type AwsCognitoState,
  initialState,
  reset,
} from "./awsCognitoSlice";

type LocalRootState = { awsCognito: AwsCognitoState };

const AwsCognitoPlugin: DemoPlugin<
  AwsCognitoState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "aws-cognito",
  name: "AWS Cognito + API Gateway",
  description:
    "How Amazon's login system (Cognito) protects your APIs — explained for absolute beginners.",
  initialState,
  reducer: awsCognitoReducer,
  Component: AwsCognitoVisualization,
  restartConfig: { text: "Replay", color: "#ff9900" },
  getSteps: (_: AwsCognitoState): DemoStep[] => [
    { label: "Overview", autoAdvance: false, nextButtonText: "Begin" },
    {
      label: "User Pool Setup",
      autoAdvance: false,
      processingText: "Creating pool…",
      nextButtonText: "Next →",
    },
    {
      label: "User Signs Up",
      autoAdvance: false,
      processingText: "Signing up…",
      nextButtonText: "Next →",
    },
    {
      label: "Email Verification",
      autoAdvance: false,
      processingText: "Verifying…",
      nextButtonText: "Next →",
    },
    {
      label: "User Signs In",
      autoAdvance: false,
      processingText: "Authenticating…",
      nextButtonText: "Next →",
    },
    {
      label: "Tokens Issued",
      autoAdvance: false,
      processingText: "Issuing tokens…",
      nextButtonText: "Next →",
    },
    {
      label: "Authorizer Config",
      autoAdvance: false,
      processingText: "Configuring…",
      nextButtonText: "Next →",
    },
    {
      label: "API Request",
      autoAdvance: false,
      processingText: "Sending request…",
      nextButtonText: "Next →",
    },
    {
      label: "Token Validation",
      autoAdvance: false,
      processingText: "Validating…",
      nextButtonText: "Next →",
    },
    {
      label: "Lambda Invoked",
      autoAdvance: false,
      processingText: "Invoking…",
      nextButtonText: "Next →",
    },
    {
      label: "Response",
      autoAdvance: false,
      processingText: "Returning data…",
      nextButtonText: "Next →",
    },
    { label: "Summary", autoAdvance: false, nextButtonText: "Done" },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.awsCognito,
};

export default AwsCognitoPlugin;
