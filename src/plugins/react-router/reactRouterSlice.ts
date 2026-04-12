import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ReactRouterPhase =
  | "overview"
  | "full-reload"
  | "spa-concept"
  | "browser-router"
  | "routes-config"
  | "link-component"
  | "dynamic-segments"
  | "nested-routes"
  | "use-navigate"
  | "search-params"
  | "catch-all"
  | "summary";

export interface ReactRouterState {
  phase: ReactRouterPhase;
  explanation: string;
  hotZones: string[];
  showFullReload: boolean;
  showSpaSwap: boolean;
  showBrowserRouter: boolean;
  showRoutes: boolean;
  showLink: boolean;
  showDynamic: boolean;
  showNested: boolean;
  showNavigate: boolean;
  showSearchParams: boolean;
  showCatchAll: boolean;
}

export const initialState: ReactRouterState = {
  phase: "overview",
  explanation:
    "Welcome — let's learn how React Router lets users move between pages without ever reloading. Click Next to begin.",
  hotZones: [],
  showFullReload: false,
  showSpaSwap: false,
  showBrowserRouter: false,
  showRoutes: false,
  showLink: false,
  showDynamic: false,
  showNested: false,
  showNavigate: false,
  showSearchParams: false,
  showCatchAll: false,
};

const reactRouterSlice = createSlice({
  name: "reactRouter",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<ReactRouterState>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
  },
});

export const { patchState, reset } = reactRouterSlice.actions;
export default reactRouterSlice.reducer;
