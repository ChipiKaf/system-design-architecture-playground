import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AiEvolutionPhase =
  | "overview"
  | "traditional-ml"
  | "data-preproc"
  | "prompt-eng"
  | "foundation-llm"
  | "deploy-monitor"
  | "comparison"
  | "summary";

export interface AiEvolutionState {
  phase: AiEvolutionPhase;
  explanation: string;
  hotZones: string[];
  showGenAi: boolean;
  showTraditional: boolean;
}

export const initialState: AiEvolutionState = {
  phase: "overview",
  explanation:
    "The AI architecture landscape has shifted from handcrafted feature pipelines to foundation models and prompt engineering. Walk through each stage to understand how the stack evolved.",
  hotZones: [],
  showGenAi: false,
  showTraditional: false,
};

const aiEvolutionSlice = createSlice({
  name: "aiEvolution",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<AiEvolutionState>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
  },
});

export const { patchState, reset } = aiEvolutionSlice.actions;
export default aiEvolutionSlice.reducer;
