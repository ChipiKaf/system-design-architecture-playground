import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ReactBestPracticesPhase =
  | "overview"
  | "functional"
  | "small-units"
  | "memo-callback"
  | "virtual-dom"
  | "feature-folders"
  | "custom-hooks"
  | "styling"
  | "code-quality"
  | "accessibility"
  | "summary";

export interface ReactBestPracticesState {
  phase: ReactBestPracticesPhase;
  explanation: string;
  hotZones: string[];
  showClassBad: boolean;
  showFuncGood: boolean;
  showMemoShield: boolean;
  showVdomDiff: boolean;
  showFolders: boolean;
  showHookExtract: boolean;
  showTheme: boolean;
  showLint: boolean;
  showA11y: boolean;
}

export const initialState: ReactBestPracticesState = {
  phase: "overview",
  explanation:
    "Imagine React is a kitchen. Without best practices, pots are everywhere and nobody knows where anything is. Let's organise this kitchen — one rule at a time.",
  hotZones: [],
  showClassBad: false,
  showFuncGood: false,
  showMemoShield: false,
  showVdomDiff: false,
  showFolders: false,
  showHookExtract: false,
  showTheme: false,
  showLint: false,
  showA11y: false,
};

const reactBestPracticesSlice = createSlice({
  name: "reactBestPractices",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<ReactBestPracticesState>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
  },
});

export const { patchState, reset } = reactBestPracticesSlice.actions;
export default reactBestPracticesSlice.reducer;
