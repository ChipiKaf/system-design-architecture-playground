import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface SimulationState {
  currentStep: number;
  passCount: number;
  isPlaying: boolean;
}

const initialState: SimulationState = {
  currentStep: 0,
  passCount: 1,
  isPlaying: false,
};

const simulationSlice = createSlice({
  name: "simulation",
  initialState,
  reducers: {
    nextStep(state, action: PayloadAction<number>) {
      // action.payload is maxSteps
      state.currentStep = Math.min(state.currentStep + 1, action.payload);
    },
    setStep(state, action: PayloadAction<number>) {
      state.currentStep = action.payload;
    },
    incrementPass(state) {
      state.passCount += 1;
    },
    resetSimulation(state) {
      state.currentStep = 0;
      state.passCount = 1;
      state.isPlaying = false;
    },
    setIsPlaying(state, action: PayloadAction<boolean>) {
      state.isPlaying = action.payload;
    },
  },
});

export const {
  nextStep,
  setStep,
  incrementPass,
  resetSimulation,
  setIsPlaying,
} = simulationSlice.actions;
export default simulationSlice.reducer;
