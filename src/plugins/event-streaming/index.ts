import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import eventStreamingReducer, {
  type EventStreamingState,
  initialState,
  reset,
} from "./eventStreamingSlice";
import EventStreamingVisualization from "./main";
import type { Action, Dispatch } from "@reduxjs/toolkit";

type LocalRootState = { eventStreaming: EventStreamingState };

const EventStreamingPlugin: DemoPlugin<
  EventStreamingState,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "event-streaming",
  name: "Event Streaming",
  description:
    "Explore how producers, brokers, partitions, and consumer groups work in an event-driven architecture — with load-balanced and fan-out consumption patterns.",
  initialState,
  reducer: eventStreamingReducer,
  Component: EventStreamingVisualization,
  restartConfig: {
    text: "Reset",
  },
  getSteps: (_: EventStreamingState): DemoStep[] => [
    {
      label: "Architecture Overview",
      autoAdvance: false,
      nextButtonText: "Publish Event",
    },
    { label: "Produce Event", autoAdvance: true },
    {
      label: "Partition Assignment",
      autoAdvance: false,
      nextButtonText: "Consume (Workers)",
    },
    {
      label: "Load-Balanced Consumption",
      autoAdvance: false,
      nextButtonText: "Consume (Broadcast)",
      processingText: "Routing...",
    },
    {
      label: "Fan-Out Broadcast",
      autoAdvance: false,
      nextButtonText: "Send Burst",
      processingText: "Broadcasting...",
    },
    {
      label: "Burst of Events",
      autoAdvance: true,
      processingText: "Streaming...",
    },
    { label: "Summary", autoAdvance: false },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.eventStreaming,
};

export default EventStreamingPlugin;
