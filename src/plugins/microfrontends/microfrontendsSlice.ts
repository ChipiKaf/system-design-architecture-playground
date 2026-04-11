import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type MicrofrontendsPhase =
  | "overview"
  | "host-shell"
  | "remotes"
  | "expose"
  | "discovery"
  | "lazy-load"
  | "shared-deps"
  | "iframe"
  | "failure"
  | "summary";

export interface MicrofrontendsState {
  phase: MicrofrontendsPhase;
  explanation: string;
  hotZones: string[];
  showEntries: boolean;
  showShared: boolean;
  showIframe: boolean;
  failedRemote: string;
  showFallback: boolean;
}

export const initialState: MicrofrontendsState = {
  phase: "overview",
  explanation:
    "A micro-frontend architecture splits a monolithic SPA into independently deployable frontend modules, each owned by a separate team.",
  hotZones: [],
  showEntries: false,
  showShared: false,
  showIframe: false,
  failedRemote: "",
  showFallback: false,
};

const microfrontendsSlice = createSlice({
  name: "microfrontends",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<MicrofrontendsState>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
  },
});

export const { patchState, reset } = microfrontendsSlice.actions;
export default microfrontendsSlice.reducer;
