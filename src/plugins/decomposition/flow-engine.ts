import type { DecompositionState } from "./decompositionSlice";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   Decomposition Lab — Declarative Flow Engine
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */
export type FlowBeat = GenericFlowBeat<DecompositionState>;
export type StepDef = GenericStepDef<DecompositionState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<DecompositionState>;

/* ── Strategy-aware explanations ───────────────────────── */
function strategyRationale(s: DecompositionState): string {
  if (s.variant === "business-capability")
    return "You identify what the business does (capabilities) and give each capability its own service. Capabilities are stable — they change far less than how processes work.";
  if (s.variant === "subdomain-ddd")
    return "Domain-Driven Design divides the domain into Bounded Contexts. Each context has its own ubiquitous language, model, and team — services map 1-to-1 with these contexts.";
  return "Size-based decomposition creates services that fit a small team (the two-pizza rule). Any function too large for one team becomes its own service.";
}

function boundaryLabel(s: DecompositionState): string {
  if (s.variant === "business-capability")
    return "Business Capability boundaries";
  if (s.variant === "subdomain-ddd") return "Bounded Context boundaries";
  return "Team-size boundaries";
}

function extractExplain(s: DecompositionState, svcLabel: string): string {
  if (s.variant === "business-capability")
    return `The ${svcLabel} capability is cut out of the monolith. It gets its own codebase, its own database, and its own deployment pipeline. No other service touches its data directly.`;
  if (s.variant === "subdomain-ddd")
    return `The ${svcLabel} Bounded Context is extracted. Its ubiquitous language and domain model are sealed inside — other contexts interact only through a published API contract.`;
  return `The ${svcLabel} module has grown to the point where two independent teams could own it. It's extracted as a standalone microservice with its own deploy cycle.`;
}

/* ── Token expansion ─────────────────────────────────── */
export function expandToken(
  token: string,
  _state: DecompositionState,
): string[] {
  // Tokens map to scene node IDs
  if (token === "$monolith") return ["monolith"];
  if (token === "$client") return ["client-web", "client-mobile"];
  if (token === "$api-gw") return ["api-gateway"];
  if (token === "$catalog") return ["svc-catalog"];
  if (token === "$basket") return ["svc-basket"];
  if (token === "$ordering") return ["svc-ordering"];
  if (token === "$identity") return ["svc-identity"];
  /* Domain analysis tokens */
  if (token === "$story-products") return ["story-products"];
  if (token === "$story-cart") return ["story-cart"];
  if (token === "$story-checkout") return ["story-checkout"];
  if (token === "$story-account") return ["story-account"];
  /* Checklist tokens */
  if (token === "$check-srp") return ["check-srp"];
  if (token === "$check-size") return ["check-size"];
  if (token === "$check-comm") return ["check-comm"];
  if (token === "$check-data") return ["check-data"];
  if (token === "$check-deploy") return ["check-deploy"];
  if (token === "$check-autonomy") return ["check-autonomy"];
  if (token === "$check-business") return ["check-business"];
  /* Fulfillment flow tokens */
  if (token === "$ff-create") return ["ff-create"];
  if (token === "$ff-payment") return ["ff-payment"];
  if (token === "$ff-inventory") return ["ff-inventory"];
  if (token === "$ff-shipment") return ["ff-shipment"];
  if (token === "$ff-notify") return ["ff-notify"];
  if (token === "$ff-complete") return ["ff-complete"];
  /* Strangler fig tokens */
  if (token === "$sf-client") return ["sf-client"];
  if (token === "$sf-facade") return ["sf-facade"];
  if (token === "$sf-monolith") return ["sf-monolith"];
  if (token === "$sf-catalog") return ["sf-catalog"];
  if (token === "$sf-basket") return ["sf-basket"];
  if (token === "$sf-ordering") return ["sf-ordering"];
  /* Landscape tokens */
  if (token === "$ls-gw") return ["ls-gw"];
  if (token === "$ls-product") return ["ls-product"];
  if (token === "$ls-cart") return ["ls-cart"];
  if (token === "$ls-orders") return ["ls-orders"];
  if (token === "$ls-payment") return ["ls-payment"];
  if (token === "$ls-identity") return ["ls-identity"];
  return [token];
}

/* ── Step keys ───────────────────────────────────────── */
export type StepKey =
  | "overview"
  | "domain-analysis"
  | "the-monolith"
  | "identify-boundaries"
  | "checklist"
  | "add-api-gateway"
  | "extract-catalog"
  | "extract-basket"
  | "extract-ordering"
  | "extract-identity"
  | "db-isolation"
  | "client-traffic"
  | "fulfillment-flow"
  | "strangler-fig"
  | "landscape"
  | "summary";

/* ── Step configuration ──────────────────────────────── */
export const STEPS: StepDef[] = [
  /* ── 0: Overview ────────────────────────────────────── */
  {
    key: "overview",
    label: "Choose a Strategy",
    nextButton: "Analyse the Domain",
    action: "resetRun",
    explain: (s) =>
      `Strategy: "${s.variant === "business-capability" ? "Business Capability" : s.variant === "subdomain-ddd" ? "Subdomain / DDD" : "Size-Based"}"\n\n${strategyRationale(s)}`,
  },

  /* ── 1: Domain Analysis ──────────────────────────────── */
  {
    key: "domain-analysis",
    label: "Analyse the Domain",
    nextButton: "See the Monolith",
    phase: "domain-analysis",
    finalHotZones: [
      "noun-product",
      "noun-category",
      "noun-cart",
      "noun-item",
      "noun-order",
      "noun-address",
      "noun-customer",
      "noun-user",
    ],
    flow: [
      {
        from: "story-products",
        to: "noun-product",
        duration: 600,
        color: "#818cf8",
        explain:
          "User stories about listing and filtering products reveal the Product / Catalog domain noun.",
      },
      {
        from: "story-cart",
        to: "noun-cart",
        duration: 600,
        color: "#34d399",
        explain:
          "Shopping cart stories reveal the Basket domain noun — cart and cart items.",
      },
      {
        from: "story-checkout",
        to: "noun-order",
        duration: 600,
        color: "#fb923c",
        explain:
          "Checkout stories reveal the Ordering domain noun — orders, addresses, payment.",
      },
      {
        from: "story-account",
        to: "noun-customer",
        duration: 600,
        color: "#f472b6",
        explain:
          "Login and history stories reveal the Identity domain noun — customers and user accounts.",
      },
    ],
    explain:
      "We start by analysing the e-commerce domain. User stories reveal key nouns (domain objects) and verbs (actions).\n\nCore Nouns: Product/Catalog, Shopping Cart, Order, Customer/User\nKey Verbs: list, filter, add to cart, checkout, pay, ship, notify\n\nThese nouns become our candidate service boundaries. Each colour-coded group maps to one future microservice.",
  },

  /* ── 2: The Monolith ─────────────────────────────────── */
  {
    key: "the-monolith",
    label: "The Monolith",
    nextButton: "Identify Boundaries",
    phase: "monolith",
    recalcMetrics: true,
    finalHotZones: ["monolith"],
    explain:
      "We start with a single deployable unit — the monolith. All features (Catalog, Basket, Ordering, Identity) live in one codebase, share one database, and are deployed together. This is fast early on, but as the team grows it becomes a bottleneck.",
  },

  /* ── 2: Identify Boundaries ──────────────────────────── */
  {
    key: "identify-boundaries",
    label: "Identify Boundaries",
    nextButton: "Evaluate Boundaries",
    phase: "identifying",
    finalHotZones: ["monolith"],
    explain: (s) =>
      `We draw ${boundaryLabel(s)} around the four functional areas inside the monolith: Catalog, Basket, Ordering, and Identity.\n\nThis is the critical design step — the quality of your service boundaries determines coupling, team autonomy, and long-term maintainability.`,
  },

  /* ── 4: Evaluation Checklist ──────────────────────────── */
  {
    key: "checklist",
    label: "Evaluate Boundaries",
    nextButton: "Add API Gateway",
    phase: "checklist",
    finalHotZones: [
      "check-srp",
      "check-size",
      "check-comm",
      "check-data",
      "check-deploy",
      "check-autonomy",
      "check-business",
    ],
    flow: [
      {
        from: "check-srp",
        to: "check-size",
        duration: 350,
        color: "#22c55e",
        explain: "✓ Single Responsibility — each service does one thing well.",
      },
      {
        from: "check-size",
        to: "check-comm",
        duration: 350,
        color: "#22c55e",
        explain:
          "✓ Appropriate Size — not too big (mini-monolith) or too small (nanoservice).",
      },
      {
        from: "check-comm",
        to: "check-data",
        duration: 350,
        color: "#22c55e",
        explain:
          "✓ Communication Patterns — inter-service calls are minimised.",
      },
      {
        from: "check-data",
        to: "check-deploy",
        duration: 350,
        color: "#22c55e",
        explain:
          "✓ Data Ownership — each service owns its data (Database-per-Service).",
      },
      {
        from: "check-deploy",
        to: "check-autonomy",
        duration: 350,
        color: "#22c55e",
        explain:
          "✓ Independent Deployability — deploy without redeploying other services.",
      },
      {
        from: "check-autonomy",
        to: "check-business",
        duration: 350,
        color: "#22c55e",
        explain:
          "✓ Business Alignment — boundaries match business capabilities / domains.",
      },
    ],
    explain:
      "Before extracting services, we evaluate our proposed boundaries against a decomposition checklist.\n\nEach criterion lights up as we verify it. Poor scores on any item signal that our service boundaries need rethinking — otherwise we risk building a distributed monolith.",
  },

  /* ── 5: Add API Gateway ───────────────────────────────── */
  {
    key: "add-api-gateway",
    label: "Add API Gateway",
    nextButton: "Extract Catalog",
    phase: "api-gateway",
    finalHotZones: ["api-gateway"],
    flow: [
      {
        from: "client-web",
        to: "api-gateway",
        duration: 600,
        explain:
          "Clients now route through the API Gateway — a single entry point that will fan out to individual services.",
      },
    ],
    explain:
      "Before extracting any service, we introduce an API Gateway. It becomes the single entry point for all clients. As we extract services one by one, the gateway routes each request to the right destination without clients needing to know the topology.",
  },

  /* ── 4: Extract Catalog ──────────────────────────────── */
  {
    key: "extract-catalog",
    label: "Extract Catalog",
    nextButton: "Extract Basket",
    phase: "extract-catalog",
    action: "extractService",
    recalcMetrics: true,
    finalHotZones: ["svc-catalog", "monolith"],
    flow: [
      {
        from: "monolith",
        to: "svc-catalog",
        duration: 750,
        color: "#818cf8",
        explain:
          "Catalog code, data, and deploy pipeline move out of the monolith.",
      },
    ],
    explain: (s) => extractExplain(s, "Catalog"),
  },

  /* ── 5: Extract Basket ───────────────────────────────── */
  {
    key: "extract-basket",
    label: "Extract Basket",
    nextButton: "Extract Ordering",
    phase: "extract-basket",
    action: "extractService",
    recalcMetrics: true,
    finalHotZones: ["svc-basket", "monolith"],
    flow: [
      {
        from: "monolith",
        to: "svc-basket",
        duration: 750,
        color: "#34d399",
        explain: "Basket code moves out of the monolith.",
      },
    ],
    explain: (s) => extractExplain(s, "Basket"),
  },

  /* ── 6: Extract Ordering ─────────────────────────────── */
  {
    key: "extract-ordering",
    label: "Extract Ordering",
    nextButton: "Extract Identity",
    phase: "extract-ordering",
    action: "extractService",
    recalcMetrics: true,
    finalHotZones: ["svc-ordering", "monolith"],
    flow: [
      {
        from: "monolith",
        to: "svc-ordering",
        duration: 750,
        color: "#fb923c",
        explain: "Ordering code moves out of the monolith.",
      },
    ],
    explain: (s) => extractExplain(s, "Ordering"),
  },

  /* ── 7: Extract Identity ─────────────────────────────── */
  {
    key: "extract-identity",
    label: "Extract Identity",
    nextButton: "See DB Isolation",
    phase: "extract-identity",
    action: "extractService",
    recalcMetrics: true,
    finalHotZones: ["svc-identity", "monolith"],
    flow: [
      {
        from: "monolith",
        to: "svc-identity",
        duration: 750,
        color: "#f472b6",
        explain: "Identity code moves out of the monolith.",
      },
    ],
    explain: (s) => extractExplain(s, "Identity"),
  },

  /* ── 8: DB Isolation ─────────────────────────────────── */
  {
    key: "db-isolation",
    label: "Database-per-Service",
    nextButton: "Route Client Traffic",
    phase: "db-isolation",
    recalcMetrics: true,
    finalHotZones: [
      "svc-catalog",
      "svc-basket",
      "svc-ordering",
      "svc-identity",
    ],
    explain:
      "Each service now owns its private database — chosen to match its access patterns:\n• Catalog → NoSQL Document (flexible product schemas)\n• Basket → NoSQL Key-Value (fast session reads)\n• Ordering → Relational (transactional integrity)\n• Identity → Relational (ACID user records)\n\nOther services must go through APIs or events — never direct DB access.",
  },

  /* ── 9: Route Client Traffic ─────────────────────────── */
  {
    key: "client-traffic",
    label: "Route Traffic",
    nextButton: "Order Fulfillment",
    phase: "traffic",
    recalcMetrics: true,
    finalHotZones: [
      "api-gateway",
      "svc-catalog",
      "svc-basket",
      "svc-ordering",
      "svc-identity",
    ],
    flow: [
      {
        from: "client-web",
        to: "api-gateway",
        duration: 500,
        explain: "Web client hits the API Gateway.",
      },
      {
        from: "client-mobile",
        to: "api-gateway",
        duration: 500,
        explain: "Mobile client hits the API Gateway.",
      },
      {
        from: "api-gateway",
        to: "svc-catalog",
        duration: 600,
        color: "#818cf8",
      },
      {
        from: "api-gateway",
        to: "svc-basket",
        duration: 600,
        color: "#34d399",
      },
      {
        from: "api-gateway",
        to: "svc-ordering",
        duration: 600,
        color: "#fb923c",
      },
      {
        from: "api-gateway",
        to: "svc-identity",
        duration: 600,
        color: "#f472b6",
      },
    ],
    explain:
      "Client requests flow through the API Gateway and are routed to the correct service. Each service scales independently — a traffic spike on Catalog doesn't affect Ordering or Identity.",
  },

  /* ── 12: Order Fulfillment Flow ─────────────────────── */
  {
    key: "fulfillment-flow",
    label: "Order Fulfillment",
    nextButton: "Strangler Fig Pattern",
    phase: "fulfillment-flow",
    finalHotZones: [
      "ff-create",
      "ff-payment",
      "ff-inventory",
      "ff-shipment",
      "ff-notify",
      "ff-complete",
    ],
    flow: [
      {
        from: "ff-create",
        to: "ff-payment",
        duration: 550,
        color: "#fb923c",
        explain:
          "1. Order created by the Ordering service → now validate payment.",
      },
      {
        from: "ff-payment",
        to: "ff-inventory",
        duration: 550,
        color: "#f472b6",
        explain: "2. Payment validated → update inventory to reserve stock.",
      },
      {
        from: "ff-inventory",
        to: "ff-shipment",
        duration: 550,
        color: "#818cf8",
        explain: "3. Inventory updated → initiate shipment.",
      },
      {
        from: "ff-shipment",
        to: "ff-notify",
        duration: 550,
        color: "#34d399",
        explain: "4. Shipment arranged → notify the customer.",
      },
      {
        from: "ff-notify",
        to: "ff-complete",
        duration: 550,
        color: "#22c55e",
        explain: "5. Customer notified → order marked complete.",
      },
    ],
    explain:
      "The Order Fulfillment process spans multiple microservices:\n\n1. Create Order (Ordering)\n2. Validate Payment (Payment)\n3. Update Inventory (Inventory)\n4. Shipment (Shipping)\n5. Notify (Notification)\n6. Complete Order (Ordering)\n\nThis cross-service orchestration is a key challenge — typically solved with Saga or Choreography patterns.",
  },

  /* ── 13: Strangler Fig Migration ────────────────────── */
  {
    key: "strangler-fig",
    label: "Strangler Fig Migration",
    nextButton: "See Full Landscape",
    phase: "strangler-fig",
    finalHotZones: [
      "sf-facade",
      "sf-catalog",
      "sf-basket",
      "sf-ordering",
      "sf-identity",
    ],
    flow: [
      {
        from: "sf-client",
        to: "sf-facade",
        duration: 500,
        color: "#f59e0b",
        explain: "Client request hits the Strangler Facade (routing layer).",
      },
      {
        from: "sf-facade",
        to: "sf-monolith",
        duration: 600,
        color: "#f59e0b",
        explain:
          "Old route: facade forwards to the monolith — Identity is still inside.",
      },
      {
        from: "sf-client",
        to: "sf-facade",
        duration: 500,
        color: "#22c55e",
        explain: "Another request arrives at the facade.",
      },
      {
        from: "sf-facade",
        to: "sf-catalog",
        duration: 500,
        color: "#818cf8",
        explain:
          "New route: Catalog requests go to the extracted Catalog service.",
      },
      {
        from: "sf-facade",
        to: "sf-basket",
        duration: 500,
        color: "#34d399",
        explain: "Basket requests routed to the new Basket service.",
      },
      {
        from: "sf-facade",
        to: "sf-ordering",
        duration: 500,
        color: "#fb923c",
        explain: "Ordering requests routed to the new Ordering service.",
      },
    ],
    explain:
      "The Strangler Fig pattern — named after vines that gradually grow around and replace old trees.\n\nA routing facade intercepts all requests. It sends each to either the new microservice or the old monolith.\n\nOver time, more functionality moves to new services. The monolith gradually shrinks until it can be decommissioned entirely.\n\nThis avoids the risk of a 'big bang' rewrite — you migrate incrementally, one service at a time.",
  },

  /* ── 14: E-Shop Microservices Landscape ─────────────── */
  {
    key: "landscape",
    label: "E-Shop Landscape",
    nextButton: "See Summary",
    phase: "landscape",
    finalHotZones: [],
    flow: [
      {
        from: "ls-gw",
        to: "ls-product",
        duration: 400,
        color: "#818cf8",
        explain: "Gateway routes product queries to the Product service.",
      },
      {
        from: "ls-gw",
        to: "ls-cart",
        duration: 400,
        color: "#34d399",
        explain: "Cart operations go to the Shopping Cart service.",
      },
      {
        from: "ls-gw",
        to: "ls-orders",
        duration: 400,
        color: "#fb923c",
        explain: "Order requests go to the Orders service.",
      },
      {
        from: "ls-gw",
        to: "ls-payment",
        duration: 400,
        color: "#f472b6",
        explain: "Payment operations route to the Payment service.",
      },
      {
        from: "ls-gw",
        to: "ls-identity",
        duration: 400,
        color: "#38bdf8",
        explain: "Auth requests go to the Identity service.",
      },
    ],
    explain:
      "The fully decomposed e-shop has three groups of microservices:\n\nMain: Users, Product, Customers, Shopping Cart, Discount, Orders\nOrder Transactional: Orders, Payment, Inventory, Shipping, Billing, Notification\nIntelligence: Identity, Marketing, Location, Rating, Recommendation\n\nEach service is independently deployable, scalable, and owned by a dedicated team. This is the target architecture reached via Strangler Fig migration.",
  },

  /* ── 15: Summary ─────────────────────────────────────── */
  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    recalcMetrics: true,
    finalHotZones: [],
    explain: (s) => {
      const v =
        s.variant === "business-capability"
          ? "Business Capability"
          : s.variant === "subdomain-ddd"
            ? "Subdomain / DDD"
            : "Size-Based";
      return `Decomposition complete using the ${v} strategy.\n\nLow coupling (${s.couplingScore}/10), high boundary clarity (${s.clarityScore}/10). Switch strategies above to compare how the rationale and trade-offs differ — the physical architecture is the same, but the reasoning and long-term maintainability differ significantly.`;
    },
  },
];

/* ── Build active steps ──────────────────────────────── */
export function buildSteps(state: DecompositionState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */
export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
