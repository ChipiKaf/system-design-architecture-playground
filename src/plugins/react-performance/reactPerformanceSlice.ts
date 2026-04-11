import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ReactPerformancePhase =
  | "overview"
  | "render-cycle"
  | "wasted-renders"
  | "memo-shield"
  | "memo-hooks"
  | "code-splitting"
  | "memory-leak-intro"
  | "leak-cleanup"
  | "leak-closure"
  | "heap-snapshot"
  | "lighthouse"
  | "profiler"
  | "summary";

export interface ReactPerformanceState {
  phase: ReactPerformancePhase;
  explanation: string;
  hotZones: string[];
  showRenderWave: boolean;
  showWastedRender: boolean;
  showMemoShield: boolean;
  showLazyChunks: boolean;
  showLeakDrip: boolean;
  showTimerLeak: boolean;
  showClosureLeak: boolean;
  showHeapGrowth: boolean;
  showLighthouse: boolean;
  showProfiler: boolean;
  showCleanup: boolean;
}

export const initialState: ReactPerformanceState = {
  phase: "overview",
  explanation:
    "Your app works… but it's slow, stuttering, and eating more memory every minute. Let's find out why — and fix it, one step at a time.",
  hotZones: [],
  showRenderWave: false,
  showWastedRender: false,
  showMemoShield: false,
  showLazyChunks: false,
  showLeakDrip: false,
  showTimerLeak: false,
  showClosureLeak: false,
  showHeapGrowth: false,
  showLighthouse: false,
  showProfiler: false,
  showCleanup: false,
};

const reactPerformanceSlice = createSlice({
  name: "reactPerformance",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<ReactPerformanceState>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
  },
});

export const { patchState, reset } = reactPerformanceSlice.actions;
export default reactPerformanceSlice.reducer;
