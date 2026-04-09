import type { DataManagementState, VariantKey } from "./dataManagementSlice";
import {
  VARIANT_PROFILES,
  isImplementedVariant,
  overviewHotZonesFor,
} from "./dataManagementSlice";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

export type FlowBeat = GenericFlowBeat<DataManagementState>;
export type StepDef = GenericStepDef<DataManagementState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<DataManagementState>;

const DB_PER_SERVICE = "database-per-service" satisfies VariantKey;
const SHARED_DB = "shared-database" satisfies VariantKey;

function summaryExplanation(state: DataManagementState): string {
  const profile = VARIANT_PROFILES[state.variant];
  if (state.variant === DB_PER_SERVICE) {
    return (
      `${profile.label}: ${state.serviceCount} services own ${state.dataStoreCount} private stores. ` +
      `Boundaries are strong, but cross-service reads must go through APIs or replicated views, ` +
      `and multi-service writes need workflow patterns like Saga.`
    );
  }

  if (state.variant === SHARED_DB) {
    return (
      `${profile.label}: ${state.serviceCount} services share ${state.dataStoreCount} database. ` +
      `Local joins and ACID transactions are easy, but Basket reads Catalog tables directly, ` +
      `schema changes ripple across teams, and the database becomes the single point of failure.`
    );
  }

  return `${profile.label}: ${profile.placeholderNote ?? "Detailed walkthrough still pending."}`;
}

function placeholderPreviewZones(variant: VariantKey): string[] {
  return overviewHotZonesFor(variant);
}

export function expandToken(
  token: string,
  state: DataManagementState,
): string[] {
  if (state.variant === DB_PER_SERVICE) {
    switch (token) {
      case "$client":
        return ["client-app"];
      case "$gateway":
        return ["api-gateway"];
      case "$ordering":
        return ["svc-ordering"];
      case "$catalog":
        return ["svc-catalog"];
      case "$ordering-db":
        return ["db-ordering"];
      case "$catalog-db":
        return ["db-catalog"];
      default:
        return [token];
    }
  }

  if (state.variant === SHARED_DB) {
    switch (token) {
      case "$client":
        return ["client-app"];
      case "$gateway":
        return ["api-gateway"];
      case "$basket":
        return ["svc-basket"];
      case "$ordering":
        return ["svc-ordering"];
      case "$catalog":
        return ["svc-catalog"];
      case "$shared-db":
        return ["db-shared"];
      case "$basket-table":
        return ["table-basket"];
      case "$catalog-table":
        return ["table-catalog"];
      case "$orders-table":
        return ["table-orders"];
      default:
        return [token];
    }
  }

  return [token];
}

export type StepKey =
  | "overview"
  | "client-to-gateway"
  | "gateway-to-ordering"
  | "ordering-to-catalog"
  | "catalog-to-db"
  | "catalog-to-ordering"
  | "ordering-to-db"
  | "shared-client-to-gateway"
  | "shared-gateway-to-basket"
  | "shared-basket-to-table"
  | "shared-basket-to-catalog-table"
  | "shared-basket-to-ordering"
  | "shared-ordering-to-table"
  | "shared-schema-change-to-basket"
  | "shared-db-outage-to-catalog"
  | "shared-db-outage-to-ordering"
  | "placeholder-preview"
  | "summary";

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: (state) =>
      isImplementedVariant(state.variant)
        ? "Client request ->"
        : "Preview pattern ->",
    action: "resetRun",
  },
  {
    key: "client-to-gateway",
    label: "Client Hits Gateway",
    when: (state) => state.variant === DB_PER_SERVICE,
    processingText: "Sending request...",
    nextButton: "Route to owner ->",
    nextButtonColor: "#0ea5e9",
    phase: "ingress",
    flow: [
      {
        from: "$client",
        to: "$gateway",
        duration: 650,
        color: "#38bdf8",
        explain: "The client sends a checkout request through the API gateway.",
      },
    ],
    finalHotZones: ["client-app", "api-gateway"],
    explain:
      "Entry is centralized, but data access is not. The gateway only routes traffic.",
  },
  {
    key: "gateway-to-ordering",
    label: "Gateway Routes Ordering",
    when: (state) => state.variant === DB_PER_SERVICE,
    processingText: "Routing...",
    nextButton: "Ordering asks Catalog ->",
    nextButtonColor: "#0ea5e9",
    phase: "routing",
    flow: [
      {
        from: "$gateway",
        to: "$ordering",
        duration: 650,
        color: "#38bdf8",
        explain:
          "Ordering owns the checkout workflow, so the gateway routes the request there.",
      },
    ],
    finalHotZones: ["api-gateway", "svc-ordering"],
    explain:
      "Service ownership stays business-centric: Ordering owns the command, not the catalog tables.",
  },
  {
    key: "ordering-to-catalog",
    label: "Ordering Calls Catalog API",
    when: (state) => state.variant === DB_PER_SERVICE,
    processingText: "Calling service API...",
    nextButton: "Catalog reads its DB ->",
    nextButtonColor: "#0ea5e9",
    phase: "cross-service-call",
    flow: [
      {
        from: "$ordering",
        to: "$catalog",
        duration: 700,
        color: "#22c55e",
        explain:
          "Ordering needs product data, so it calls Catalog's API instead of touching Catalog's database.",
      },
    ],
    finalHotZones: ["svc-ordering", "svc-catalog"],
    explain:
      "Cross-service coordination is explicit. The contract lives at the API boundary, not inside another team's tables.",
  },
  {
    key: "catalog-to-db",
    label: "Catalog Reads Its Database",
    when: (state) => state.variant === DB_PER_SERVICE,
    processingText: "Reading owned data...",
    nextButton: "Return product data ->",
    nextButtonColor: "#0ea5e9",
    phase: "owned-read",
    flow: [
      {
        from: "$catalog",
        to: "$catalog-db",
        duration: 650,
        color: "#4ade80",
        explain:
          "Only Catalog is allowed to read or write the catalog database directly.",
      },
    ],
    finalHotZones: ["svc-catalog", "db-catalog"],
    explain:
      "Private data ownership is the point of the pattern: the owning service protects its schema and invariants.",
  },
  {
    key: "catalog-to-ordering",
    label: "Catalog Returns Product Data",
    when: (state) => state.variant === DB_PER_SERVICE,
    processingText: "Returning response...",
    nextButton: "Ordering writes its DB ->",
    nextButtonColor: "#0ea5e9",
    phase: "service-response",
    flow: [
      {
        from: "$catalog",
        to: "$ordering",
        duration: 700,
        color: "#22c55e",
        explain:
          "Catalog returns the product snapshot through the service contract.",
      },
    ],
    finalHotZones: ["svc-catalog", "svc-ordering"],
    explain:
      "The response crosses service boundaries as data transfer, not as shared storage access.",
  },
  {
    key: "ordering-to-db",
    label: "Ordering Persists Its Order",
    when: (state) => state.variant === DB_PER_SERVICE,
    processingText: "Committing local write...",
    nextButton: "Takeaway ->",
    nextButtonColor: "#0ea5e9",
    phase: "own-write",
    flow: [
      {
        from: "$ordering",
        to: "$ordering-db",
        duration: 650,
        color: "#4ade80",
        explain:
          "Ordering commits the final order inside its own database boundary.",
      },
    ],
    finalHotZones: ["svc-ordering", "db-ordering"],
    explain:
      "Each service keeps its own local transaction. Distributed workflows stay explicit instead of hiding in one big shared schema.",
  },
  {
    key: "shared-client-to-gateway",
    label: "Client Hits Gateway",
    when: (state) => state.variant === SHARED_DB,
    processingText: "Sending request...",
    nextButton: "Route to Basket ->",
    nextButtonColor: "#fb7185",
    phase: "shared-ingress",
    flow: [
      {
        from: "$client",
        to: "$gateway",
        duration: 650,
        color: "#fb7185",
        explain:
          "The request enters through the gateway. So far, the architecture still looks like microservices.",
      },
    ],
    finalHotZones: ["client-app", "api-gateway"],
    explain:
      "At the edge, this still looks clean. The problem appears when services integrate through the same database instead of through stable APIs.",
  },
  {
    key: "shared-gateway-to-basket",
    label: "Gateway Routes Basket",
    when: (state) => state.variant === SHARED_DB,
    processingText: "Routing...",
    nextButton: "Basket reads cart rows ->",
    nextButtonColor: "#fb7185",
    phase: "shared-routing",
    flow: [
      {
        from: "$gateway",
        to: "$basket",
        duration: 650,
        color: "#fb7185",
        explain:
          "Basket receives the checkout request and starts the workflow.",
      },
    ],
    finalHotZones: ["api-gateway", "svc-basket"],
    explain:
      "Basket appears to own the request path, but it does not own its data boundary anymore.",
  },
  {
    key: "shared-basket-to-table",
    label: "Basket Reads Basket Table",
    when: (state) => state.variant === SHARED_DB,
    processingText: "Reading shared rows...",
    nextButton: "Join Catalog table ->",
    nextButtonColor: "#fb7185",
    phase: "shared-local-read",
    flow: [
      {
        from: "$basket",
        to: "$basket-table",
        duration: 650,
        color: "#4ade80",
        explain:
          "Basket reads its own rows from the shared schema. This is the first reason the pattern feels productive.",
      },
    ],
    finalHotZones: ["svc-basket", "table-basket", "db-shared"],
    explain:
      "One shared database makes local queries and transactions easy. That short-term convenience is real.",
  },
  {
    key: "shared-basket-to-catalog-table",
    label: "Basket Joins Catalog Tables",
    when: (state) => state.variant === SHARED_DB,
    processingText: "Joining across services...",
    nextButton: "Handoff to Ordering ->",
    nextButtonColor: "#fb7185",
    phase: "shared-direct-join",
    flow: [
      {
        from: "$basket",
        to: "$catalog-table",
        duration: 700,
        color: "#f59e0b",
        explain:
          "Basket now reads Catalog's table directly. No API call is needed, but the Basket service now knows Catalog's schema.",
      },
    ],
    finalHotZones: ["svc-basket", "table-catalog", "db-shared"],
    explain:
      "This is the anti-pattern in one move: direct SQL across service boundaries replaces versioned service contracts.",
  },
  {
    key: "shared-basket-to-ordering",
    label: "Basket Hands Off to Ordering",
    when: (state) => state.variant === SHARED_DB,
    processingText: "Handing off...",
    nextButton: "Ordering writes shared rows ->",
    nextButtonColor: "#fb7185",
    phase: "shared-handoff",
    flow: [
      {
        from: "$basket",
        to: "$ordering",
        duration: 650,
        color: "#fb7185",
        explain:
          "Basket hands control to Ordering, but both services still depend on the same schema underneath.",
      },
    ],
    finalHotZones: ["svc-basket", "svc-ordering"],
    explain:
      "The services look separated in code, but the real integration surface is the shared database.",
  },
  {
    key: "shared-ordering-to-table",
    label: "Ordering Writes Orders Table",
    when: (state) => state.variant === SHARED_DB,
    processingText: "Committing shared transaction...",
    nextButton: "Schema change ripples ->",
    nextButtonColor: "#fb7185",
    phase: "shared-shared-write",
    flow: [
      {
        from: "$ordering",
        to: "$orders-table",
        duration: 650,
        color: "#4ade80",
        explain:
          "Ordering writes to the same database. One local ACID transaction is easy, which is why teams often accept the trade-off.",
      },
    ],
    finalHotZones: ["svc-ordering", "table-orders", "db-shared"],
    explain:
      "Shared storage reduces workflow friction on day one, but the price is hidden coupling between teams and services.",
  },
  {
    key: "shared-schema-change-to-basket",
    label: "Orders Schema Change Breaks Basket",
    when: (state) => state.variant === SHARED_DB,
    processingText: "Schema changing...",
    nextButton: "DB outage hits Catalog ->",
    nextButtonColor: "#fb7185",
    phase: "shared-schema-coupling",
    flow: [
      {
        from: "$orders-table",
        to: "$basket",
        duration: 700,
        color: "#ef4444",
        explain:
          "Ordering changes its table shape. Basket's SQL, joins, or release pipeline now break because they depend on the same schema.",
      },
    ],
    finalHotZones: ["svc-basket", "table-orders", "db-shared"],
    explain:
      "Independent deployment is mostly gone. Schema evolution becomes cross-team coordination work.",
  },
  {
    key: "shared-db-outage-to-catalog",
    label: "DB Outage Blocks Catalog",
    when: (state) => state.variant === SHARED_DB,
    processingText: "Database failing...",
    nextButton: "DB outage hits Ordering ->",
    nextButtonColor: "#fb7185",
    phase: "shared-outage-catalog",
    flow: [
      {
        from: "$shared-db",
        to: "$catalog",
        duration: 700,
        color: "#ef4444",
        explain:
          "If the shared database slows down or fails, Catalog goes down even if its service code is healthy.",
      },
    ],
    finalHotZones: ["db-shared", "svc-catalog", "table-catalog"],
    explain:
      "A shared database is a single point of failure. The blast radius crosses service boundaries immediately.",
  },
  {
    key: "shared-db-outage-to-ordering",
    label: "DB Outage Blocks Ordering",
    when: (state) => state.variant === SHARED_DB,
    processingText: "Spreading outage...",
    nextButton: "Takeaway ->",
    nextButtonColor: "#fb7185",
    phase: "shared-outage-ordering",
    flow: [
      {
        from: "$shared-db",
        to: "$ordering",
        duration: 700,
        color: "#ef4444",
        explain:
          "Ordering stalls too. The database becomes both the bottleneck and the shared failure domain.",
      },
    ],
    finalHotZones: ["db-shared", "svc-ordering", "table-orders"],
    explain:
      "This is why shared database setups often behave like distributed monoliths instead of true microservices.",
  },
  {
    key: "placeholder-preview",
    label: "Pattern Preview",
    when: (state) => !isImplementedVariant(state.variant),
    phase: "placeholder",
    nextButton: "Takeaway ->",
    finalHotZones: (state) => placeholderPreviewZones(state.variant),
    explain: (state) => {
      const profile = VARIANT_PROFILES[state.variant];
      return `${profile.description} ${profile.placeholderNote ?? "Detailed flow still pending."}`;
    },
  },
  {
    key: "summary",
    label: "Takeaway",
    phase: "summary",
    finalHotZones: (state) => overviewHotZonesFor(state.variant),
    explain: (state) => summaryExplanation(state),
  },
];

export function buildSteps(state: DataManagementState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
