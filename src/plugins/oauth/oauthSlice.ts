import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type OauthPhase =
  | "idle"
  | "registration"
  | "login"
  | "redirect"
  | "authenticate"
  | "code-callback"
  | "token-exchange"
  | "token-granted"
  | "api-call"
  | "validation"
  | "summary";

export interface OauthState {
  phase: OauthPhase;
  explanation: string;
  hotZones: string[];
  authCode: string;
  accessToken: string;
  scopes: string[];
  tokenExpiry: string;
}

export const initialState: OauthState = {
  phase: "idle",
  explanation:
    "Welcome! This walkthrough shows how OAuth lets apps do things on your behalf — without ever knowing your password. Tap Begin to start.",
  hotZones: [],
  authCode: "",
  accessToken: "",
  scopes: [],
  tokenExpiry: "",
};

const oauthSlice = createSlice({
  name: "oauth",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<OauthState>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
  },
});

export const { patchState, reset } = oauthSlice.actions;
export default oauthSlice.reducer;
