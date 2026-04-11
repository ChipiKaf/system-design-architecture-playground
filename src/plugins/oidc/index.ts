import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import OidcVisualization from "./main";
import oidcReducer, { type OidcState, initialState, reset } from "./oidcSlice";

type LocalRootState = { oidc: OidcState };

const OidcPlugin: DemoPlugin<
  OidcState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "oidc",
  name: "OpenID Connect (OIDC)",
  description:
    "Learn how OIDC adds an identity layer on top of OAuth 2.0 — distilled for beginners.",
  initialState,
  reducer: oidcReducer,
  Component: OidcVisualization,
  restartConfig: { text: "Replay", color: "#7c3aed" },
  getSteps: (_: OidcState): DemoStep[] => [
    {
      label: "Overview",
      autoAdvance: false,
      nextButtonText: "Begin",
    },
    {
      label: "The Problem",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Enter OIDC",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Redirect to IDP",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "User Authenticates",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Tokens Issued",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Inside the ID Token",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Decode & Verify",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "UserInfo Endpoint",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Session Created",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Summary",
      autoAdvance: false,
    },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.oidc,
};

export default OidcPlugin;
