import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import ReactRouterVisualization from "./main";
import reactRouterReducer, {
  type ReactRouterState,
  initialState,
  reset,
} from "./reactRouterSlice";

type LocalRootState = { reactRouter: ReactRouterState };

const ReactRouterPlugin: DemoPlugin<
  ReactRouterState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "react-router",
  name: "React Router",
  description:
    "Dynamic routing = the app reads the URL and instantly shows the right page, no reload needed. Here's how.",
  initialState,
  reducer: reactRouterReducer,
  Component: ReactRouterVisualization,
  restartConfig: { text: "Replay", color: "#1e40af" },
  getSteps: (_: ReactRouterState): DemoStep[] => [
    {
      label: "What Is Dynamic Routing?",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Watch the Reload Happen",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "The SPA Idea",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "BrowserRouter: The URL Watcher",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Routes: The Directory",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "<Link>: No-Reload Navigation",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "One Route, Infinite Pages",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Nested Routes & <Outlet>",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "useNavigate(): Move from Code",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Search Params: ?key=value",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Catch-All: 404 Pages",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Your Dynamic Routing Toolkit",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.reactRouter,
};

export default ReactRouterPlugin;
