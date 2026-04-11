import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type OidcPhase =
  | "idle"
  | "problem"
  | "oauth-recap"
  | "oidc-layer"
  | "login-redirect"
  | "authentication"
  | "tokens-issued"
  | "id-token-decoded"
  | "userinfo"
  | "session-created"
  | "summary";

export interface OidcState {
  phase: OidcPhase;
  explanation: string;
  hotZones: string[];
  idToken: string;
  accessToken: string;
  userName: string;
}

export const initialState: OidcState = {
  phase: "idle",
  explanation:
    "Welcome — tap Begin to learn how OIDC lets apps know who you are.",
  hotZones: [],
  idToken: "",
  accessToken: "",
  userName: "",
};

const oidcSlice = createSlice({
  name: "oidc",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<OidcState>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
  },
});

export const { patchState, reset } = oidcSlice.actions;
export default oidcSlice.reducer;
