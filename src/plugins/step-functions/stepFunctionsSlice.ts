import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type StepFunctionsPhase =
  | "overview"
  | "triggering"
  | "validating"
  | "choosing"
  | "assessing"
  | "approving"
  | "uploading"
  | "notifying"
  | "complete"
  | "rejecting"
  | "failed"
  | "summary";

export interface StepFunctionsState {
  phase: StepFunctionsPhase;
  explanation: string;
  hotZones: string[];
  currentStateName: string;
  choicePath: "pending" | "yes" | "no";
  workflowStatus: "idle" | "running" | "succeeded" | "failed";
}

export const initialState: StepFunctionsState = {
  phase: "overview",
  explanation:
    "This is how an insurance company processes claims automatically using AWS Step Functions. " +
    "Think of it like a checklist — each step does one job (check the policy, calculate the payout, store the paperwork, tell the customer), " +
    "and Step Functions makes sure every step happens in the right order without anyone writing glue code to connect them.",
  hotZones: [],
  currentStateName: "",
  choicePath: "pending",
  workflowStatus: "idle",
};

const stepFunctionsSlice = createSlice({
  name: "stepFunctions",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<StepFunctionsState>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
  },
});

export const { patchState, reset } = stepFunctionsSlice.actions;
export default stepFunctionsSlice.reducer;
