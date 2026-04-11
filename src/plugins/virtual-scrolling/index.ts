import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import VirtualScrollingVisualization from "./main";
import virtualScrollingReducer, {
  type VirtualScrollingState,
  initialState,
  reset,
} from "./virtualScrollingSlice";

type LocalRootState = { virtualScrolling: VirtualScrollingState };

const VirtualScrollingPlugin: DemoPlugin<
  VirtualScrollingState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "virtual-scrolling",
  name: "Virtual Scrolling",
  description:
    "Render 10,000 rows with the DOM cost of 10 — the beginner's guide to windowed lists.",
  initialState,
  reducer: virtualScrollingReducer,
  Component: VirtualScrollingVisualization,
  restartConfig: { text: "Replay", color: "#1e40af" },
  getSteps: (_: VirtualScrollingState): DemoStep[] => [
    {
      label: "The Problem: 10,000 Rows",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Every Row = A Real DOM Node",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: '"But overflow:auto hides them!"',
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Where the Real Cost Is",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "The Key Insight",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "The Viewport Container",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Calculating Visible Items",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Rendering Only What's Visible",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Scroll → Recalculate",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "The Spacer Trick",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Overscan Buffer",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
    {
      label: "Your Virtual Scrolling Toolkit",
      autoAdvance: false,
      nextButtonText: "Next →",
    },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.virtualScrolling,
};

export default VirtualScrollingPlugin;
