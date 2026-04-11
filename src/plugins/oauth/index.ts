import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import OauthVisualization from "./main";
import oauthReducer, {
  type OauthState,
  initialState,
  reset,
} from "./oauthSlice";

type LocalRootState = { oauth: OauthState };

const OauthPlugin: DemoPlugin<
  OauthState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "oauth",
  name: "OAuth 2.0 (Authorization Code)",
  description:
    "Learn how OAuth lets apps access your stuff without knowing your password — explained for beginners.",
  initialState,
  reducer: oauthReducer,
  Component: OauthVisualization,
  restartConfig: { text: "Replay", color: "#7c3aed" },
  getSteps: (_: OauthState): DemoStep[] => [
    { label: "Overview", autoAdvance: false, nextButtonText: "Begin" },
    {
      label: "Register the App",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "You Click Login",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Redirect to Login Page",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "You Enter Your Password",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Claim Ticket Issued",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Trade Ticket for Token",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Access Token Received",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Show Wristband to API",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "API Checks Permissions",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    { label: "Summary", autoAdvance: false, nextButtonText: "Done" },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.oauth,
};

export default OauthPlugin;
