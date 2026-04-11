import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type MicrofrontendsPhase =
  | "overview"
  | "host-shell"
  | "remotes"
  | "glue-problem"
  | "hooks-crash"
  | "expose"
  | "discovery"
  | "lazy-load"
  | "shared-deps"
  | "version-mismatch"
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
  showDuplicateDeps: boolean;
  showHooksCrash: boolean;
  showVersionMismatch: boolean;
  failedRemote: string;
  showFallback: boolean;
}

export const initialState: MicrofrontendsState = {
  phase: "overview",
  explanation:
    "Imagine one massive app where every team's code is tangled together. One team's bug can break the whole thing. Let's see how micro-frontends fix this.",
  hotZones: [],
  showEntries: false,
  showShared: false,
  showIframe: false,
  showDuplicateDeps: false,
  showHooksCrash: false,
  showVersionMismatch: false,
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
