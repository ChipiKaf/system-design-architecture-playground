import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AwsCognitoPhase =
  | "idle"
  | "user-pool-setup"
  | "signup"
  | "verification"
  | "signin"
  | "tokens-issued"
  | "authorizer-config"
  | "api-request"
  | "token-validation"
  | "lambda-invoke"
  | "response"
  | "summary";

export interface AwsCognitoState {
  phase: AwsCognitoPhase;
  explanation: string;
  hotZones: string[];
  idToken: string;
  accessToken: string;
  refreshToken: string;
  userStatus: string;
  apiResponse: string;
}

export const initialState: AwsCognitoState = {
  phase: "idle",
  explanation:
    "Welcome! This walkthrough shows how AWS Cognito handles login, tokens, and API security — so your app never touches a password. Tap Begin to start.",
  hotZones: [],
  idToken: "",
  accessToken: "",
  refreshToken: "",
  userStatus: "",
  apiResponse: "",
};

const awsCognitoSlice = createSlice({
  name: "awsCognito",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<AwsCognitoState>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
  },
});

export const { patchState, reset } = awsCognitoSlice.actions;
export default awsCognitoSlice.reducer;
