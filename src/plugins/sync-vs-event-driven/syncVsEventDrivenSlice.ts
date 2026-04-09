import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   Sync vs Event-Driven Lab — Redux Slice

  Compare synchronous chains, aggregation, EKS discovery,
  and a now-implemented event-driven path.
   ══════════════════════════════════════════════════════════ */

export type ArchitectureKey =
  | "sync-chain"
  | "service-aggregator"
  | "eks-discovery"
  | "event-driven";
export type Availability = "available" | "coming-soon";

export interface ArchitectureProfile {
  key: ArchitectureKey;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
  availability: Availability;
  clientCalls: number;
  internalCalls: number;
  coupling: "high" | "medium" | "low";
  strengths: string[];
  weaknesses: string[];
}

export const ARCHITECTURE_PROFILES: Record<
  ArchitectureKey,
  ArchitectureProfile
> = {
  "sync-chain": {
    key: "sync-chain",
    label: "Synchronous Service-to-Service",
    shortLabel: "Sync Chain",
    color: "#ef4444",
    description:
      "A request enters one service, then that service blocks while it calls other services synchronously to assemble a composite response.",
    availability: "available",
    clientCalls: 1,
    internalCalls: 6,
    coupling: "high",
    strengths: [
      "Simple request/response mental model",
      "Works for small, shallow call graphs",
      "Immediate consistency across the active path",
    ],
    weaknesses: [
      "Latency grows with every downstream hop",
      "Upstream services wait idly for downstream responses",
      "One hot service becomes a bottleneck",
      "Services become tightly coupled to each other's APIs",
    ],
  },
  "service-aggregator": {
    key: "service-aggregator",
    label: "Service Aggregator Pattern",
    shortLabel: "Aggregator",
    color: "#f97316",
    description:
      "A dedicated aggregator receives one composite request, discovers the services it needs, dispatches those calls, and combines the results into a single structured response.",
    availability: "available",
    clientCalls: 1,
    internalCalls: 5,
    coupling: "medium",
    strengths: [
      "Reduces deep service-to-service chaining",
      "Client receives one coherent structured response",
      "Core services stay focused on domain logic",
      "Cuts client-side orchestration and chattiness",
    ],
    weaknesses: [
      "Aggregator can become an orchestration hotspot",
      "Still synchronous, so waiting and latency remain",
      "Needs service discovery in dynamic environments",
      "Aggregator owns multiple downstream contracts",
    ],
  },
  "eks-discovery": {
    key: "eks-discovery",
    label: "AWS EKS Service Discovery",
    shortLabel: "EKS Discovery",
    color: "#38bdf8",
    description:
      "On AWS EKS, external traffic usually enters through Route 53 and an ALB or NLB into an ingress or API gateway. Inside the cluster, callers resolve stable Kubernetes Service DNS names through CoreDNS, while Services, EndpointSlices, kube-proxy, and the AWS VPC CNI route requests to healthy pods and on to external systems.",
    availability: "available",
    clientCalls: 1,
    internalCalls: 4,
    coupling: "low",
    strengths: [
      "Stable service DNS names replace hardcoded pod IPs",
      "Built-in discovery through Services, DNS, and health-based endpoints",
      "Clear public entry through Route 53, ALB/NLB, and ingress",
      "Works naturally with elastic pod scale-out and pod replacement",
    ],
    weaknesses: [
      "More infrastructure layers to understand and operate",
      "Ingress, CoreDNS, kube-proxy, and controllers are now critical control points",
      "Discovery solves location, not API compatibility or auth",
      "External egress still needs careful VPC, security group, and endpoint design",
    ],
  },
  "event-driven": {
    key: "event-driven",
    label: "Event-Driven Architecture",
    shortLabel: "Event-Driven",
    color: "#22c55e",
    description:
      "Use this when one request triggers long-running follow-up work or many independent reactions. Keep the edge request short, use a queue for one owner, and use pub/sub when multiple services should react to the same event.",
    availability: "available",
    clientCalls: 1,
    internalCalls: 5,
    coupling: "low",
    strengths: [
      "Fits long-running workflows that should leave the request path quickly",
      "Supports both one-to-one command delegation and one-to-many fan-out",
      "Long-running work leaves the synchronous critical path",
      "Queues and topics buffer work when consumers are slow",
      "New subscribers can react without changing the producer",
      "Consumers can scale independently from the request edge",
    ],
    weaknesses: [
      "Eventual consistency replaces one immediate composite response",
      "Idempotency, retries, and dead-letter handling become mandatory",
      "Tracing the full timeline across producers and consumers is harder",
    ],
  },
};

export const ARCHITECTURE_KEYS = Object.keys(
  ARCHITECTURE_PROFILES,
) as ArchitectureKey[];

export interface SyncVsEventDrivenState extends LabState {
  architecture: ArchitectureKey;
  latencyMs: number;
  internalCalls: number;
  blockedServices: number;
  wastedCapacityPct: number;
}

export function computeMetrics(state: SyncVsEventDrivenState) {
  switch (state.architecture) {
    case "sync-chain":
      state.latencyMs = 540;
      state.internalCalls = 6;
      state.blockedServices = 6;
      state.wastedCapacityPct = 82;
      break;
    case "service-aggregator":
      state.latencyMs = 220;
      state.internalCalls = 5;
      state.blockedServices = 2;
      state.wastedCapacityPct = 34;
      break;
    case "eks-discovery":
      state.latencyMs = 6;
      state.internalCalls = 7;
      state.blockedServices = 6;
      state.wastedCapacityPct = 2;
      break;
    case "event-driven":
      state.latencyMs = 55;
      state.internalCalls = 5;
      state.blockedServices = 0;
      state.wastedCapacityPct = 8;
      break;
  }
}

export const initialState: SyncVsEventDrivenState = {
  architecture: "sync-chain",
  latencyMs: 540,
  internalCalls: 6,
  blockedServices: 6,
  wastedCapacityPct: 82,

  hotZones: [],
  explanation:
    "Start with the synchronous chain path: one request enters the system, then fans into a sequence of blocking service-to-service calls.",
  phase: "overview",
};

computeMetrics(initialState);

const syncVsEventDrivenSlice = createSlice({
  name: "syncVsEventDriven",
  initialState,
  reducers: {
    reset: () => {
      const next = { ...initialState };
      computeMetrics(next);
      return next;
    },
    softResetRun: (state) => {
      state.hotZones = [];
      state.explanation = ARCHITECTURE_PROFILES[state.architecture].description;
      state.phase = "overview";
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<SyncVsEventDrivenState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setArchitecture(state, action: PayloadAction<ArchitectureKey>) {
      if (
        ARCHITECTURE_PROFILES[action.payload].availability === "coming-soon"
      ) {
        return;
      }

      state.architecture = action.payload;
      state.hotZones = [];
      state.explanation = ARCHITECTURE_PROFILES[action.payload].description;
      state.phase = "overview";
      computeMetrics(state);
    },
  },
});

export const {
  reset,
  softResetRun,
  patchState,
  recalcMetrics,
  setArchitecture,
} = syncVsEventDrivenSlice.actions;

export default syncVsEventDrivenSlice.reducer;
