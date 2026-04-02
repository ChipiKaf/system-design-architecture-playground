import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import EventLoopVisualization from "./main";
import eventLoopReducer, {
  type EventLoopState,
  initialState,
  reset,
} from "./eventLoopSlice";

type LocalRootState = { eventLoop: EventLoopState };

const EventLoopPlugin: DemoPlugin<
  EventLoopState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "event-loop",
  name: "JS Event Loop",
  description:
    "Visualize how JavaScript moves work through the call stack, Web APIs, microtask queue, task queue, and browser render step.",
  initialState,
  reducer: eventLoopReducer,
  Component: EventLoopVisualization,
  restartConfig: {
    text: "Replay",
    color: "#0f766e",
  },
  getSteps: (_: EventLoopState): DemoStep[] => [
    {
      label: "Runtime Overview",
      autoAdvance: false,
      nextButtonText: "Start Script",
    },
    // ── Sync execution ──────────────────
    {
      label: "Script enters Call Stack",
      autoAdvance: false,
      nextButtonText: "Run line 1",
      processingText: "Moving...",
      nextButtonColor: "#2563eb",
    },
    {
      label: 'Log "A"',
      autoAdvance: false,
      nextButtonText: "Run line 2",
      processingText: "Logging...",
      nextButtonColor: "#2563eb",
    },
    {
      label: "Register setTimeout",
      autoAdvance: false,
      nextButtonText: "Timer fires",
      processingText: "Registering...",
      nextButtonColor: "#ea580c",
    },
    {
      label: "Timer callback queued",
      autoAdvance: false,
      nextButtonText: "Run line 3",
      processingText: "Queuing...",
      nextButtonColor: "#16a34a",
    },
    {
      label: "Queue Promise.then",
      autoAdvance: false,
      nextButtonText: "Run line 7",
      processingText: "Queuing...",
      nextButtonColor: "#7c3aed",
    },
    {
      label: 'Log "B"',
      autoAdvance: false,
      nextButtonText: "Stack empties",
      processingText: "Logging...",
      nextButtonColor: "#2563eb",
    },
    {
      label: "Stack empty — check queues",
      autoAdvance: false,
      nextButtonText: "Drain microtasks",
    },
    // ── Microtask drain ─────────────────
    {
      label: "Promise callback runs",
      autoAdvance: false,
      nextButtonText: 'Log "promise"',
      processingText: "Moving...",
      nextButtonColor: "#7c3aed",
    },
    {
      label: 'Log "promise"',
      autoAdvance: false,
      nextButtonText: "Queue nested microtask",
      processingText: "Logging...",
      nextButtonColor: "#7c3aed",
    },
    {
      label: "Nested microtask queued",
      autoAdvance: false,
      nextButtonText: "Run nested microtask",
      processingText: "Queuing...",
      nextButtonColor: "#7c3aed",
    },
    {
      label: "Nested microtask runs",
      autoAdvance: false,
      nextButtonText: 'Log "microtask"',
      processingText: "Moving...",
      nextButtonColor: "#7c3aed",
    },
    {
      label: 'Log "microtask"',
      autoAdvance: false,
      nextButtonText: "Microtasks drained",
      processingText: "Logging...",
      nextButtonColor: "#7c3aed",
    },
    // ── Render ──────────────────────────
    {
      label: "Render opportunity",
      autoAdvance: false,
      nextButtonText: "Pick next task",
      processingText: "Painting...",
      nextButtonColor: "#0f766e",
    },
    // ── Task queue ──────────────────────
    {
      label: "Timer callback runs",
      autoAdvance: false,
      nextButtonText: 'Log "timeout"',
      processingText: "Moving...",
      nextButtonColor: "#16a34a",
    },
    {
      label: 'Log "timeout"',
      autoAdvance: false,
      nextButtonText: "Show summary",
      processingText: "Logging...",
      nextButtonColor: "#16a34a",
    },
    // ── Summary ─────────────────────────
    {
      label: "Final Order",
      autoAdvance: false,
    },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.eventLoop,
};

export default EventLoopPlugin;
