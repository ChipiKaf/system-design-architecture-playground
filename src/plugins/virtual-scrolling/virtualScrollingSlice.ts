import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type VirtualScrollingPhase =
  | "overview"
  | "browser-render"
  | "overflow-myth"
  | "real-cost"
  | "key-insight"
  | "viewport-container"
  | "calc-visible"
  | "render-visible"
  | "scroll-event"
  | "spacer-trick"
  | "overscan"
  | "summary";

export interface VirtualScrollingState {
  phase: VirtualScrollingPhase;
  explanation: string;
  hotZones: string[];
  showFullTable: boolean;
  showViewport: boolean;
  showVisibleRows: boolean;
  showSpacers: boolean;
  showScrollHandler: boolean;
  showOverscan: boolean;
  showMemoryBar: boolean;
  showLibraries: boolean;
  showDomCount: boolean;
  showRecalc: boolean;
  showOverflowMyth: boolean;
  showRealCost: boolean;
}

export const initialState: VirtualScrollingState = {
  phase: "overview",
  explanation:
    "Welcome — let's learn how virtual scrolling makes huge lists fly. Click Next to begin.",
  hotZones: [],
  showFullTable: false,
  showViewport: false,
  showVisibleRows: false,
  showSpacers: false,
  showScrollHandler: false,
  showOverscan: false,
  showMemoryBar: false,
  showLibraries: false,
  showDomCount: false,
  showRecalc: false,
  showOverflowMyth: false,
  showRealCost: false,
};

const virtualScrollingSlice = createSlice({
  name: "virtualScrolling",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<VirtualScrollingState>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
  },
});

export const { patchState, reset } = virtualScrollingSlice.actions;
export default virtualScrollingSlice.reducer;
