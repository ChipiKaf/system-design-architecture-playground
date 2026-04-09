import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";

export type VariantKey =
  | "database-per-service"
  | "shared-database"
  | "api-composition"
  | "cqrs"
  | "event-sourcing"
  | "saga";

export interface VariantProfile {
  key: VariantKey;
  label: string;
  shortLabel: string;
  accentText: string;
  color: string;
  description: string;
  status: "implemented" | "placeholder";
  dataOwnership: string;
  readPattern: string;
  writePattern: string;
  transactionPattern: string;
  serviceCount: number;
  dataStoreCount: number;
  ownershipStrength: number;
  coordinationCost: number;
  benefits?: string[];
  drawbacks?: string[];
  decisionRule?: string;
  placeholderNote?: string;
}

export const VARIANT_PROFILES: Record<VariantKey, VariantProfile> = {
  "database-per-service": {
    key: "database-per-service",
    label: "Database per Service",
    shortLabel: "DB / Service",
    accentText: "Private store per service",
    color: "#38bdf8",
    description:
      "Each microservice owns and hides its private database. Other services must go through an API or an event stream instead of joining directly across stores.",
    status: "implemented",
    dataOwnership: "Each service owns its schema and runtime data.",
    readPattern: "Cross-service reads happen through APIs or replicated views.",
    writePattern: "Writes stay inside the owning service boundary.",
    transactionPattern:
      "Local ACID inside one service; multi-service workflows need Sagas or outbox patterns.",
    serviceCount: 4,
    dataStoreCount: 4,
    ownershipStrength: 5,
    coordinationCost: 4,
    benefits: [
      "Strong data ownership and clearer service boundaries.",
      "Better fault isolation because one service does not share another service's tables.",
      "Each service can scale and evolve its storage independently.",
    ],
    drawbacks: [
      "Cross-service reads need APIs, projections, or replicated views.",
      "Multi-service write flows are more explicit and operationally harder.",
    ],
  },
  "shared-database": {
    key: "shared-database",
    label: "Shared Database",
    shortLabel: "Shared DB",
    accentText: "Convenient joins, weak boundaries",
    color: "#fb7185",
    description:
      "Multiple services share one schema. Local transactions and joins feel easier, but the shared database becomes the real integration surface instead of service APIs.",
    status: "implemented",
    dataOwnership:
      "Ownership is blurred because all services depend on the same schema and migrations.",
    readPattern:
      "Services can query and join other services' tables directly, often without an API hop.",
    writePattern:
      "Writes converge in one database, so local ACID is easy but team boundaries weaken.",
    transactionPattern:
      "One database makes local transactions simple, but coupling moves into SQL, locks, and schema evolution.",
    serviceCount: 3,
    dataStoreCount: 1,
    ownershipStrength: 1,
    coordinationCost: 2,
    benefits: [
      "Cross-service joins and one-database ACID transactions are straightforward.",
      "Less duplicated data or projection infrastructure early on.",
      "Fewer moving parts on day one because every service reaches the same schema.",
    ],
    drawbacks: [
      "Services stop being independently deployable because schema changes ripple across teams.",
      "The database becomes both the scaling bottleneck and the single point of failure.",
      "Service APIs look separate, but the true contract is the shared SQL schema.",
    ],
    decisionRule:
      "If a shared database still feels like the easiest option, that is often a signal that a modular monolith may fit better than microservices right now.",
  },
  "api-composition": {
    key: "api-composition",
    label: "API Composition",
    shortLabel: "API Comp",
    accentText: "Compose reads at request time",
    color: "#14b8a6",
    description:
      "A composer or BFF fans out to multiple services on the read path and stitches the response without breaking private data ownership.",
    status: "placeholder",
    dataOwnership: "Services keep private stores and public contracts.",
    readPattern: "A composition layer assembles one view from many APIs.",
    writePattern: "Writes still go to the owning service only.",
    transactionPattern:
      "This solves read aggregation, not distributed write coordination.",
    serviceCount: 4,
    dataStoreCount: 4,
    ownershipStrength: 4,
    coordinationCost: 3,
    placeholderNote:
      "Comparison scaffold is in place. Request-time fan-out flow still needs step-by-step implementation.",
  },
  cqrs: {
    key: "cqrs",
    label: "CQRS",
    shortLabel: "CQRS",
    accentText: "Separate writes from reads",
    color: "#84cc16",
    description:
      "Command Query Responsibility Segregation splits the write model from the read model so each side can scale and optimize independently.",
    status: "placeholder",
    dataOwnership: "The write side owns commands; read models own query views.",
    readPattern: "Queries hit denormalized projections tuned for reads.",
    writePattern: "Commands update the authoritative write model.",
    transactionPattern:
      "Read models are typically eventually consistent with the write side.",
    serviceCount: 3,
    dataStoreCount: 2,
    ownershipStrength: 4,
    coordinationCost: 4,
    placeholderNote:
      "The scene shows the write/read split. Detailed projection and lag walkthrough still needs implementation.",
  },
  "event-sourcing": {
    key: "event-sourcing",
    label: "Event Sourcing",
    shortLabel: "Event Log",
    accentText: "Facts first, state later",
    color: "#f59e0b",
    description:
      "State is derived from an immutable stream of events. You gain auditability and replay, but modeling and tooling become more demanding.",
    status: "placeholder",
    dataOwnership: "The event stream is the source of truth.",
    readPattern: "Projections build queryable views from the event log.",
    writePattern: "Commands append immutable domain events.",
    transactionPattern:
      "Consistency centers on appending events and managing projection lag.",
    serviceCount: 3,
    dataStoreCount: 2,
    ownershipStrength: 5,
    coordinationCost: 5,
    placeholderNote:
      "The structural comparison is ready. Replay, projection, and rebuild steps are still placeholders.",
  },
  saga: {
    key: "saga",
    label: "Saga",
    shortLabel: "Saga",
    accentText: "Compensating workflow across services",
    color: "#818cf8",
    description:
      "A Saga coordinates a business process across local transactions. Instead of a global transaction, it drives forward steps and compensations.",
    status: "placeholder",
    dataOwnership: "Each service still owns its own local database.",
    readPattern: "Read strategy depends on the participating services.",
    writePattern: "Each step commits locally inside one service.",
    transactionPattern:
      "Consistency comes from orchestration, choreography, and compensation logic.",
    serviceCount: 4,
    dataStoreCount: 4,
    ownershipStrength: 4,
    coordinationCost: 5,
    placeholderNote:
      "Static workflow view is available. Compensating-step animation is still a placeholder.",
  },
};

export const PATTERN_GROUPS: Array<{ label: string; keys: VariantKey[] }> = [
  {
    label: "Ownership",
    keys: ["database-per-service", "shared-database"],
  },
  {
    label: "Read Strategies",
    keys: ["api-composition", "cqrs"],
  },
  {
    label: "Workflow",
    keys: ["event-sourcing", "saga"],
  },
];

export interface DataManagementState extends LabState {
  variant: VariantKey;
  serviceCount: number;
  dataStoreCount: number;
  ownershipStrength: number;
  coordinationCost: number;
}

export function isImplementedVariant(variant: VariantKey): boolean {
  return VARIANT_PROFILES[variant].status === "implemented";
}

export function overviewHotZonesFor(variant: VariantKey): string[] {
  switch (variant) {
    case "database-per-service":
      return [
        "client-app",
        "api-gateway",
        "svc-catalog",
        "db-catalog",
        "svc-ordering",
        "db-ordering",
        "svc-basket",
        "db-basket",
        "svc-identity",
        "db-identity",
      ];
    case "shared-database":
      return [
        "client-app",
        "api-gateway",
        "svc-catalog",
        "svc-ordering",
        "svc-basket",
        "table-catalog",
        "table-basket",
        "table-orders",
        "db-shared",
      ];
    case "api-composition":
      return [
        "client-app",
        "api-composer",
        "svc-catalog",
        "svc-ordering",
        "db-catalog",
        "db-ordering",
      ];
    case "cqrs":
      return [
        "client-app",
        "command-api",
        "query-api",
        "write-model",
        "event-bus",
        "read-model",
      ];
    case "event-sourcing":
      return [
        "client-app",
        "command-service",
        "event-store",
        "projection-worker",
        "read-model",
      ];
    case "saga":
      return [
        "client-app",
        "svc-ordering",
        "saga-orchestrator",
        "svc-payment",
        "svc-inventory",
        "svc-shipping",
      ];
  }
}

export function overviewExplanationFor(variant: VariantKey): string {
  const profile = VARIANT_PROFILES[variant];
  const suffix = isImplementedVariant(variant)
    ? "This walkthrough is live and split into one transition per step."
    : "This comparison view is scaffolded, but the detailed step-by-step walkthrough is still a placeholder.";
  return `${profile.description} ${suffix}`;
}

export function computeMetrics(state: DataManagementState) {
  const profile = VARIANT_PROFILES[state.variant];
  state.serviceCount = profile.serviceCount;
  state.dataStoreCount = profile.dataStoreCount;
  state.ownershipStrength = profile.ownershipStrength;
  state.coordinationCost = profile.coordinationCost;
}

function primeState(state: DataManagementState, variant: VariantKey) {
  state.variant = variant;
  state.phase = "overview";
  state.hotZones = overviewHotZonesFor(variant);
  state.explanation = overviewExplanationFor(variant);
  computeMetrics(state);
}

function makeInitialState(variant: VariantKey): DataManagementState {
  const state: DataManagementState = {
    variant,
    serviceCount: 0,
    dataStoreCount: 0,
    ownershipStrength: 0,
    coordinationCost: 0,
    hotZones: [],
    explanation: "",
    phase: "overview",
  };
  primeState(state, variant);
  return state;
}

export const initialState: DataManagementState = makeInitialState(
  "database-per-service",
);

const dataManagementSlice = createSlice({
  name: "dataManagement",
  initialState,
  reducers: {
    reset: () => makeInitialState("database-per-service"),
    softResetRun: (state) => {
      primeState(state, state.variant);
    },
    patchState(state, action: PayloadAction<Partial<DataManagementState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setVariant(state, action: PayloadAction<VariantKey>) {
      primeState(state, action.payload);
    },
  },
});

export const { reset, softResetRun, patchState, recalcMetrics, setVariant } =
  dataManagementSlice.actions;

export default dataManagementSlice.reducer;
