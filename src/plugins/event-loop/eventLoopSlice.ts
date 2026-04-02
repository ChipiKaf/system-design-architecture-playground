import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface LoopItem {
  id: string;
  label: string;
  detail?: string;
}

export type EventLoopPhase =
  | "overview"
  | "sync"
  | "microtasks"
  | "render"
  | "tasks"
  | "summary";

export interface EventLoopState {
  phase: EventLoopPhase;
  currentLine: number | null;
  explanation: string;
  hotZones: string[];
  callStack: LoopItem[];
  webApis: LoopItem[];
  microtaskQueue: LoopItem[];
  taskQueue: LoopItem[];
  consoleOutput: string[];
  renderCount: number;
}

export const initialState: EventLoopState = {
  phase: "overview",
  currentLine: null,
  explanation:
    "JavaScript runs one thing at a time on the call stack. Async work waits outside the stack until the event loop can bring it back.",
  hotZones: [],
  callStack: [],
  webApis: [],
  microtaskQueue: [],
  taskQueue: [],
  consoleOutput: [],
  renderCount: 0,
};

const eventLoopSlice = createSlice({
  name: "eventLoop",
  initialState,
  reducers: {
    reset: () => initialState,

    patchState(state, action: PayloadAction<Partial<EventLoopState>>) {
      Object.assign(state, action.payload);
    },

    pushConsoleOutput(state, action: PayloadAction<string>) {
      state.consoleOutput.push(action.payload);
    },
  },
});

export const { reset, patchState, pushConsoleOutput } = eventLoopSlice.actions;

export default eventLoopSlice.reducer;
