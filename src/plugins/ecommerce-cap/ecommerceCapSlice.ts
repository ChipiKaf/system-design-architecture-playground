import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter } from "./ecommerce-cap-adapters";

export type ServiceType =
  | "catalog"
  | "inventory"
  | "payments"
  | "orders"
  | "notifications";

export type CapMode = "AP" | "CP" | "Hybrid";

export interface EcommerceCapState extends LabState {
  serviceType: ServiceType;
  capMode: CapMode;
  availabilityBias: number;
  consistencyBias: number;
  staleBudget: string;
  readPolicy: string;
  writePolicy: string;
  partitionPolicy: string;
  businessPriority: string;
  customerImpact: string;
  acceptedRisk: string;
}

export function computeMetrics(state: EcommerceCapState) {
  const adapter = getAdapter(state.serviceType);
  adapter.computeMetrics(state);
}

export const initialState: EcommerceCapState = {
  serviceType: "catalog",
  capMode: "AP",
  availabilityBias: 94,
  consistencyBias: 42,
  staleBudget: "5-30s",
  readPolicy: "Serve reads from the nearest cache.",
  writePolicy: "Replicate updates asynchronously.",
  partitionPolicy: "Prefer local reads during a split.",
  businessPriority: "Keep discovery available.",
  customerImpact: "Browsing stays up.",
  acceptedRisk: "Short-lived stale catalog data is acceptable.",

  hotZones: [],
  explanation:
    "Different e-commerce services make different CAP trade-offs. Pick one and step through the partition.",
  phase: "overview",
};

computeMetrics(initialState);

const ecommerceCapSlice = createSlice({
  name: "ecommerceCap",
  initialState,
  reducers: {
    reset: () => {
      const next = { ...initialState };
      computeMetrics(next);
      return next;
    },
    softResetRun: (state) => {
      const adapter = getAdapter(state.serviceType);
      adapter.softReset(state);
      state.hotZones = [];
      state.phase = "overview";
      state.explanation = adapter.profile.description;
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<EcommerceCapState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setServiceType(state, action: PayloadAction<ServiceType>) {
      const adapter = getAdapter(action.payload);
      state.serviceType = action.payload;
      state.hotZones = [];
      state.phase = "overview";
      state.explanation = adapter.profile.description;
      computeMetrics(state);
    },
  },
});

export const {
  reset,
  softResetRun,
  patchState,
  recalcMetrics,
  setServiceType,
} = ecommerceCapSlice.actions;

export default ecommerceCapSlice.reducer;
