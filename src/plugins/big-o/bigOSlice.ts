import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type BigOInputSize = 8 | 16 | 32 | 64;
export type BigOPhase =
  | "intro"
  | "constant"
  | "logarithmic"
  | "linear"
  | "quadratic"
  | "summary";

export interface BinaryFrame {
  low: number;
  high: number;
  mid: number;
  decision: "left" | "right" | "found";
}

export interface BigOState {
  inputSize: BigOInputSize;
  phase: BigOPhase;
  linearChecks: number;
  binaryFrames: BinaryFrame[];
  binaryFrameIndex: number;
  quadraticPreviewCount: number;
}

export const getConstantPeekIndex = (size: BigOInputSize) =>
  Math.min(3, size - 1);

export const getBinaryTargetIndex = (size: BigOInputSize) =>
  Math.max(1, Math.min(size - 2, Math.floor(size * 0.72)));

export const getLinearTargetIndex = (size: BigOInputSize) => size - 1;

export const initialState: BigOState = {
  inputSize: 16,
  phase: "intro",
  linearChecks: 0,
  binaryFrames: [],
  binaryFrameIndex: 0,
  quadraticPreviewCount: 0,
};

const bigOSlice = createSlice({
  name: "bigO",
  initialState,
  reducers: {
    reset: () => initialState,

    resetScene(state) {
      state.phase = "intro";
      state.linearChecks = 0;
      state.binaryFrames = [];
      state.binaryFrameIndex = 0;
      state.quadraticPreviewCount = 0;
    },

    setInputSize(state, action: PayloadAction<BigOInputSize>) {
      state.inputSize = action.payload;
      state.phase = "intro";
      state.linearChecks = 0;
      state.binaryFrames = [];
      state.binaryFrameIndex = 0;
      state.quadraticPreviewCount = 0;
    },

    setPhase(state, action: PayloadAction<BigOPhase>) {
      state.phase = action.payload;
    },

    setLinearChecks(state, action: PayloadAction<number>) {
      state.linearChecks = action.payload;
    },

    setBinaryFrames(state, action: PayloadAction<BinaryFrame[]>) {
      state.binaryFrames = action.payload;
      state.binaryFrameIndex = 0;
    },

    setBinaryFrameIndex(state, action: PayloadAction<number>) {
      state.binaryFrameIndex = action.payload;
    },

    setQuadraticPreviewCount(state, action: PayloadAction<number>) {
      state.quadraticPreviewCount = action.payload;
    },
  },
});

export const {
  reset,
  resetScene,
  setInputSize,
  setPhase,
  setLinearChecks,
  setBinaryFrames,
  setBinaryFrameIndex,
  setQuadraticPreviewCount,
} = bigOSlice.actions;

export default bigOSlice.reducer;
