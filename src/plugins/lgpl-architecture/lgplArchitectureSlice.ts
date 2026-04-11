import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type LgplArchitecturePhase =
  | "overview"
  | "layers"
  | "layer-detail"
  | "gates"
  | "gate-routing"
  | "pipes"
  | "pipe-transform"
  | "loops"
  | "loop-feedback"
  | "full-flow"
  | "summary";

export interface LgplArchitectureState {
  phase: LgplArchitecturePhase;
  explanation: string;
  hotZones: string[];
  showLayers: boolean;
  showGates: boolean;
  showPipes: boolean;
  showLoops: boolean;
}

export const initialState: LgplArchitectureState = {
  phase: "overview",
  explanation:
    "Welcome — explore the LGPL architecture pattern: Layers, Gates, Pipes, and Loops.",
  hotZones: [],
  showLayers: false,
  showGates: false,
  showPipes: false,
  showLoops: false,
};

const lgplArchitectureSlice = createSlice({
  name: "lgplArchitecture",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<LgplArchitectureState>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
  },
});

export const { patchState, reset } = lgplArchitectureSlice.actions;
export default lgplArchitectureSlice.reducer;
