import type { RestApiState } from "./restApiSlice";
import { VARIANT_PROFILES } from "./restApiSlice";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   REST API Lab — Declarative Flow Engine

   Compares RESTful API design patterns: CRUD resources,
   nested resources, API versioning, and HATEOAS.
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<RestApiState>;
export type StepDef = GenericStepDef<RestApiState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<RestApiState>;

/* ── Helpers ──────────────────────────────────────────── */

const isCrud = (s: RestApiState) => s.variant === "crud-basic";
const isNested = (s: RestApiState) => s.variant === "nested-resources";
const isVersioned = (s: RestApiState) => s.variant === "api-versioning";
const isHateoas = (s: RestApiState) => s.variant === "hateoas";

/* ── Token expansion ─────────────────────────────────── */

export function expandToken(token: string, _state: RestApiState): string[] {
  if (token === "$client") return ["client"];
  if (token === "$gateway") return ["gateway"];
  if (token === "$product-svc") return ["product-svc"];
  if (token === "$order-svc") return ["order-svc"];
  if (token === "$customer-svc") return ["customer-svc"];
  if (token === "$db-product") return ["db-product"];
  if (token === "$db-order") return ["db-order"];
  if (token === "$db-customer") return ["db-customer"];
  return [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  | "overview"
  /* CRUD basic path */
  | "crud-get-all"
  | "crud-svc-queries-db"
  | "crud-response-json"
  | "crud-post-create"
  | "crud-svc-writes-db"
  | "crud-201-response"
  | "crud-put-update"
  | "crud-delete"
  /* Nested resources path */
  | "nested-get-customers"
  | "nested-svc-fetches-customer"
  | "nested-customer-response"
  | "nested-get-orders"
  | "nested-order-svc-query"
  | "nested-orders-response"
  | "nested-simplify"
  /* API versioning path */
  | "version-v1-request"
  | "version-v1-svc-query"
  | "version-v1-response"
  | "version-v2-request"
  | "version-v2-svc-query"
  | "version-v2-response"
  | "version-coexistence"
  /* HATEOAS path */
  | "hateoas-initial-get"
  | "hateoas-svc-query"
  | "hateoas-links-response"
  | "hateoas-follow-link"
  | "hateoas-related-query"
  | "hateoas-related-response"
  | "hateoas-discovery"
  /* shared */
  | "design-rules"
  | "summary";

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  /* ── Step 0: Overview ─────────────────────────────── */
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: (s) => {
      if (isCrud(s)) return "GET All Products";
      if (isNested(s)) return "GET /customers";
      if (isVersioned(s)) return "v1 Request";
      return "Initial GET";
    },
    action: "resetRun",
    explain: (s) => {
      const p = VARIANT_PROFILES[s.variant];
      return `${p.label} — ${p.description} Richardson Maturity Level ${p.maturityLevel}. REST runs on HTTP, is stateless, and focuses on transferring representations of resources.`;
    },
  },

  /* ══════ CRUD BASIC PATH ════════════════════════════ */

  {
    key: "crud-get-all",
    label: "GET /products",
    when: isCrud,
    phase: "get-request",
    processingText: "Sending GET request...",
    flow: [
      { from: "$client", to: "$gateway", duration: 400, explain: "Client sends HTTP GET /products to API Gateway." },
      { from: "$gateway", to: "$product-svc", duration: 500, explain: "Gateway routes to Product microservice." },
    ],
    finalHotZones: ["product-svc"],
    explain: () =>
      "GET /products — Retrieve all products. The URI is a noun (resource), not a verb. Correct: /products. Wrong: /getProducts or /create-product. This is Rule 1 of RESTful design.",
  },

  {
    key: "crud-svc-queries-db",
    label: "Service Queries DB",
    when: isCrud,
    phase: "db-query",
    flow: [
      { from: "$product-svc", to: "$db-product", duration: 500, explain: "Product service queries its database." },
    ],
    finalHotZones: ["product-svc", "db-product"],
    explain: () =>
      "Each microservice owns its database — microservices don't share data stores. The Product service queries only its own DB and returns data as JSON (Rule 3: REST APIs use JSON).",
  },

  {
    key: "crud-response-json",
    label: "200 OK (JSON)",
    when: isCrud,
    phase: "response",
    flow: [
      { from: "$db-product", to: "$product-svc", duration: 400, color: "#22c55e", explain: "DB returns result set." },
      { from: "$product-svc", to: "$gateway", duration: 400, color: "#22c55e", explain: "Service serializes to JSON." },
      { from: "$gateway", to: "$client", duration: 400, color: "#22c55e", explain: "200 OK with JSON body." },
    ],
    finalHotZones: ["client"],
    explain: () =>
      'Response: 200 OK with JSON body — {"productId":1,"name":"iPhone","price":44.90,"category":"Electronics"}. GET is safe (read-only) and idempotent (same result every time). Rule 2: every resource has a unique identifier (/products/4).',
  },

  {
    key: "crud-post-create",
    label: "POST /products",
    when: isCrud,
    phase: "post-request",
    processingText: "Sending POST request...",
    flow: [
      { from: "$client", to: "$gateway", duration: 400, explain: "Client sends HTTP POST /products with JSON body." },
      { from: "$gateway", to: "$product-svc", duration: 500, explain: "Gateway routes POST to Product service." },
    ],
    finalHotZones: ["product-svc"],
    explain: () =>
      'POST /products — Create a new product. Rule 4: REST APIs perform operations with HTTP verbs. POST = Submit/Create. Body: {"productId":1,"name":"iPhone"}. POST is NOT idempotent — sending it twice creates two resources.',
  },

  {
    key: "crud-svc-writes-db",
    label: "Service Writes to DB",
    when: isCrud,
    phase: "db-write",
    flow: [
      { from: "$product-svc", to: "$db-product", duration: 500, explain: "Product service inserts into database." },
    ],
    finalHotZones: ["product-svc", "db-product"],
    explain: () =>
      "The Product microservice validates the request body and inserts the new resource into its database. Each service manages its own data — no shared databases across microservices.",
  },

  {
    key: "crud-201-response",
    label: "201 Created",
    when: isCrud,
    phase: "response-created",
    flow: [
      { from: "$db-product", to: "$product-svc", duration: 350, color: "#22c55e", explain: "DB confirms insert." },
      { from: "$product-svc", to: "$gateway", duration: 400, color: "#22c55e", explain: "Service returns 201." },
      { from: "$gateway", to: "$client", duration: 400, color: "#22c55e", explain: "201 Created response." },
    ],
    finalHotZones: ["client"],
    explain: () =>
      "Response: 201 Created. HTTP status codes are part of REST semantics: 200 = OK, 201 = Created, 204 = No Content, 404 = Not Found, 409 = Conflict. The Location header may include the URL of the new resource.",
  },

  {
    key: "crud-put-update",
    label: "PUT /products/1",
    when: isCrud,
    phase: "put-request",
    processingText: "Sending PUT request...",
    flow: [
      { from: "$client", to: "$gateway", duration: 400, explain: "Client sends PUT /products/1 with full resource." },
      { from: "$gateway", to: "$product-svc", duration: 500, explain: "Gateway routes to Product service." },
    ],
    finalHotZones: ["product-svc"],
    recalcMetrics: true,
    explain: () =>
      "PUT /products/1 — Replace the entire resource at that location. PUT is idempotent: calling it N times produces the same result. For partial updates, use PATCH instead. HTTP methods: GET=Retrieve, HEAD=Headers only, POST=Create, PUT=Replace, DELETE=Remove, PATCH=Partial update.",
  },

  {
    key: "crud-delete",
    label: "DELETE /products/1",
    when: isCrud,
    phase: "delete-request",
    flow: [
      { from: "$client", to: "$gateway", duration: 400, explain: "Client sends DELETE /products/1." },
      { from: "$gateway", to: "$product-svc", duration: 500, explain: "Gateway routes DELETE." },
      { from: "$product-svc", to: "$db-product", duration: 400, explain: "Service removes resource from DB." },
    ],
    finalHotZones: ["product-svc", "db-product"],
    explain: () =>
      "DELETE /products/1 — Delete the object at the location. DELETE is idempotent. The table of HTTP methods maps to CRUD: POST=Create, GET=Read, PUT=Update (full), PATCH=Update (partial), DELETE=Delete.",
  },

  /* ══════ NESTED RESOURCES PATH ═════════════════════ */

  {
    key: "nested-get-customers",
    label: "GET /customers/6/orders",
    when: isNested,
    phase: "get-request",
    processingText: "Fetching customer orders...",
    flow: [
      { from: "$client", to: "$gateway", duration: 400, explain: "Client requests orders for customer 6." },
      { from: "$gateway", to: "$customer-svc", duration: 500, explain: "Gateway routes to Customer service." },
    ],
    finalHotZones: ["customer-svc"],
    explain: () =>
      "GET /customers/6/orders — Retrieve all orders for customer 6. The nested path /customers/{id}/orders expresses the parent-child relationship naturally. This is the collection/item/collection pattern.",
  },

  {
    key: "nested-svc-fetches-customer",
    label: "Customer Service → DB",
    when: isNested,
    phase: "db-query",
    flow: [
      { from: "$customer-svc", to: "$db-customer", duration: 500, explain: "Customer service validates customer exists." },
    ],
    finalHotZones: ["customer-svc", "db-customer"],
    explain: () =>
      "Customer service first validates that customer 6 exists by querying its own database. Microservices don't share data stores — each service owns its data. The customer service then calls the order service internally.",
  },

  {
    key: "nested-customer-response",
    label: "Customer → Order Service",
    when: isNested,
    phase: "inter-service",
    flow: [
      { from: "$customer-svc", to: "$order-svc", duration: 600, explain: "Customer service calls Order service via REST." },
    ],
    finalHotZones: ["order-svc"],
    explain: () =>
      "Customer service calls the Order service internally: GET /api/orders?customerId=6. Microservices communicate through APIs for relational data — like the Shopping Cart service calling GET /api/customer/1 to get customer details.",
  },

  {
    key: "nested-get-orders",
    label: "Order Service → DB",
    when: isNested,
    phase: "db-query",
    flow: [
      { from: "$order-svc", to: "$db-order", duration: 500, explain: "Order service queries its database." },
    ],
    finalHotZones: ["order-svc", "db-order"],
    explain: () =>
      "The Order service queries its own database for orders belonging to customer 6. Each microservice manages its own data store independently.",
  },

  {
    key: "nested-order-svc-query",
    label: "Orders Response Chain",
    when: isNested,
    phase: "response",
    flow: [
      { from: "$db-order", to: "$order-svc", duration: 350, color: "#22c55e", explain: "DB returns order data." },
      { from: "$order-svc", to: "$customer-svc", duration: 400, color: "#22c55e", explain: "Orders returned to Customer service." },
    ],
    finalHotZones: ["customer-svc"],
    explain: () =>
      "Order data flows back through the service chain. The Customer service aggregates the response before sending to the client.",
  },

  {
    key: "nested-orders-response",
    label: "200 OK → Client",
    when: isNested,
    phase: "response",
    flow: [
      { from: "$customer-svc", to: "$gateway", duration: 400, color: "#22c55e", explain: "Customer service returns aggregated data." },
      { from: "$gateway", to: "$client", duration: 400, color: "#22c55e", explain: "200 OK with nested JSON." },
    ],
    finalHotZones: ["client"],
    recalcMetrics: true,
    explain: () =>
      "Response: 200 OK. The nested approach works for /customers/6/orders, but AVOID deeply nested URIs like /customers/6/orders/22/products — this level of complexity is hard to maintain. Keep URIs to collection/item/collection maximum.",
  },

  {
    key: "nested-simplify",
    label: "Simplify Deep Nesting",
    when: isNested,
    phase: "simplify",
    delay: 400,
    finalHotZones: ["order-svc", "product-svc"],
    explain: () =>
      "Instead of /customers/6/orders/22/products (WRONG), split into two calls: 1) GET /customers/6/orders to find order 22, then 2) GET /orders/22/products. Keep URIs simple and let each service handle its own resources.",
  },

  /* ══════ API VERSIONING PATH ═══════════════════════ */

  {
    key: "version-v1-request",
    label: "GET /api/v1/products",
    when: isVersioned,
    phase: "v1-request",
    processingText: "v1 client requesting...",
    flow: [
      { from: "$client", to: "$gateway", duration: 400, explain: "v1 Client sends GET /api/v1/products." },
      { from: "$gateway", to: "$product-svc", duration: 500, explain: "Gateway routes v1 to Product service." },
    ],
    finalHotZones: ["gateway", "product-svc"],
    explain: () =>
      "URI Versioning: GET /api/v1/products — the version is part of the URL path. This is the most common versioning strategy. The v1 client gets the original response format.",
  },

  {
    key: "version-v1-svc-query",
    label: "v1 Service → DB",
    when: isVersioned,
    phase: "db-query",
    flow: [
      { from: "$product-svc", to: "$db-product", duration: 500, explain: "Product service queries for v1 schema." },
    ],
    finalHotZones: ["product-svc", "db-product"],
    explain: () =>
      "The Product service queries the database and transforms the result into the v1 response schema. Internally, the service may use a single data model but maps to different response shapes per version.",
  },

  {
    key: "version-v1-response",
    label: "v1 Response (200 OK)",
    when: isVersioned,
    phase: "v1-response",
    flow: [
      { from: "$db-product", to: "$product-svc", duration: 350, color: "#22c55e", explain: "DB returns data." },
      { from: "$product-svc", to: "$gateway", duration: 400, color: "#22c55e", explain: "v1 JSON shape returned." },
      { from: "$gateway", to: "$client", duration: 400, color: "#22c55e", explain: "200 OK — v1 format." },
    ],
    finalHotZones: ["client"],
    explain: () =>
      'v1 Response: {"id":1,"name":"iPhone","price":44.90}. The original schema — simple and stable. Existing v1 clients continue working unchanged.',
  },

  {
    key: "version-v2-request",
    label: "GET /api/v2/products",
    when: isVersioned,
    phase: "v2-request",
    processingText: "v2 client requesting...",
    flow: [
      { from: "$client", to: "$gateway", duration: 400, explain: "v2 Client sends GET /api/v2/products." },
      { from: "$gateway", to: "$product-svc", duration: 500, explain: "Gateway routes v2 to Product service." },
    ],
    finalHotZones: ["gateway", "product-svc"],
    explain: () =>
      "URI Versioning: GET /api/v2/products — the new version adds fields or changes the response shape. Alternative strategies: Header Versioning (X-API-Version: 2) or Query Parameter Versioning (/products?version=2).",
  },

  {
    key: "version-v2-svc-query",
    label: "v2 Service → DB",
    when: isVersioned,
    phase: "db-query",
    flow: [
      { from: "$product-svc", to: "$db-product", duration: 500, explain: "Product service queries for v2 schema." },
    ],
    finalHotZones: ["product-svc", "db-product"],
    explain: () =>
      "Same database query, but the service transforms the result into the v2 response schema with additional fields. API changes should be backward compatible and not break communications from other microservices.",
  },

  {
    key: "version-v2-response",
    label: "v2 Response (200 OK)",
    when: isVersioned,
    phase: "v2-response",
    flow: [
      { from: "$db-product", to: "$product-svc", duration: 350, color: "#22c55e", explain: "DB returns data." },
      { from: "$product-svc", to: "$gateway", duration: 400, color: "#22c55e", explain: "v2 JSON shape returned." },
      { from: "$gateway", to: "$client", duration: 400, color: "#22c55e", explain: "200 OK — v2 format." },
    ],
    finalHotZones: ["client"],
    recalcMetrics: true,
    explain: () =>
      'v2 Response: {"id":1,"name":"iPhone","price":44.90,"category":"Electronics","stock":142,"rating":4.7}. New fields added — v1 clients are unaffected because they hit /v1 which returns the original shape.',
  },

  {
    key: "version-coexistence",
    label: "Version Coexistence",
    when: isVersioned,
    phase: "coexistence",
    delay: 400,
    finalHotZones: ["gateway"],
    explain: () =>
      "Both v1 and v2 coexist. The API Gateway routes each version to the correct handler. Strategies compared: URI Versioning (/api/v1/products) is most explicit. Header Versioning (X-API-Version: 2) keeps URLs clean. Query Parameter Versioning (/products?version=2) is simplest but least RESTful.",
  },

  /* ══════ HATEOAS PATH ═════════════════════════════ */

  {
    key: "hateoas-initial-get",
    label: "GET /products/1",
    when: isHateoas,
    phase: "get-request",
    processingText: "Sending GET request...",
    flow: [
      { from: "$client", to: "$gateway", duration: 400, explain: "Client sends GET /products/1." },
      { from: "$gateway", to: "$product-svc", duration: 500, explain: "Gateway routes to Product service." },
    ],
    finalHotZones: ["product-svc"],
    explain: () =>
      "GET /products/1 — Level 3 (HATEOAS) starts like Level 2, but the response will include hypermedia links (_links) that tell the client what it can do next. The client doesn't need to hardcode any other URLs.",
  },

  {
    key: "hateoas-svc-query",
    label: "Service → DB",
    when: isHateoas,
    phase: "db-query",
    flow: [
      { from: "$product-svc", to: "$db-product", duration: 500, explain: "Product service queries database." },
    ],
    finalHotZones: ["product-svc", "db-product"],
    explain: () =>
      "The Product service queries its database for product 1. It will also determine which state transitions are available for this resource (e.g., can it be updated? deleted? ordered?).",
  },

  {
    key: "hateoas-links-response",
    label: "200 OK + _links",
    when: isHateoas,
    phase: "response-links",
    flow: [
      { from: "$db-product", to: "$product-svc", duration: 350, color: "#22c55e", explain: "DB returns product data." },
      { from: "$product-svc", to: "$gateway", duration: 400, color: "#22c55e", explain: "JSON + hypermedia links." },
      { from: "$gateway", to: "$client", duration: 400, color: "#22c55e", explain: "200 OK with _links." },
    ],
    finalHotZones: ["client"],
    explain: () =>
      'Response includes _links: {"id":1,"name":"iPhone","_links":{"self":{"href":"/products/1"},"update":{"href":"/products/1","method":"PUT"},"orders":{"href":"/products/1/orders"},"category":{"href":"/categories/electronics"}}}. The API tells the client what actions are available.',
  },

  {
    key: "hateoas-follow-link",
    label: "Follow _links.orders",
    when: isHateoas,
    phase: "follow-link",
    processingText: "Following hypermedia link...",
    flow: [
      { from: "$client", to: "$gateway", duration: 400, explain: "Client follows the orders link from the response." },
      { from: "$gateway", to: "$order-svc", duration: 500, explain: "Gateway routes to Order service." },
    ],
    finalHotZones: ["order-svc"],
    explain: () =>
      'The client follows _links.orders.href → GET /products/1/orders. No URL hardcoding — the client discovers the API by following links. This is HATEOAS: Hypermedia As The Engine Of Application State.',
  },

  {
    key: "hateoas-related-query",
    label: "Order Service → DB",
    when: isHateoas,
    phase: "db-query",
    flow: [
      { from: "$order-svc", to: "$db-order", duration: 500, explain: "Order service queries related orders." },
    ],
    finalHotZones: ["order-svc", "db-order"],
    explain: () =>
      "The Order service queries its own database for orders containing product 1. Each microservice owns its data independently.",
  },

  {
    key: "hateoas-related-response",
    label: "Orders + _links → Client",
    when: isHateoas,
    phase: "response-links",
    flow: [
      { from: "$db-order", to: "$order-svc", duration: 350, color: "#22c55e", explain: "DB returns orders." },
      { from: "$order-svc", to: "$gateway", duration: 400, color: "#22c55e", explain: "Orders with hypermedia links." },
      { from: "$gateway", to: "$client", duration: 400, color: "#22c55e", explain: "200 OK with nested _links." },
    ],
    finalHotZones: ["client"],
    recalcMetrics: true,
    explain: () =>
      'Each order in the response also has _links: {"orderId":22,"_links":{"self":{"href":"/orders/22"},"customer":{"href":"/customers/6"},"items":{"href":"/orders/22/items"}}}. The client navigates the API graph without knowing the URL structure upfront.',
  },

  {
    key: "hateoas-discovery",
    label: "API Discovery",
    when: isHateoas,
    phase: "discovery",
    delay: 400,
    finalHotZones: [],
    explain: () =>
      "HATEOAS = Richardson Maturity Level 3 (the highest). Level 0: single URI, all POST. Level 1: individual resource URIs. Level 2: HTTP methods on resources. Level 3: hypermedia controls. Most real-world APIs stop at Level 2 — HATEOAS adds complexity that few clients leverage.",
  },

  /* ══════ SHARED FINAL STEPS ═════════════════════════ */

  {
    key: "design-rules",
    label: "REST Design Rules",
    phase: "design-rules",
    delay: 300,
    finalHotZones: [],
    explain: (s) => {
      const p = VARIANT_PROFILES[s.variant];
      return `REST Design Rules recap: 1) URIs are nouns (resources), not verbs. 2) Every resource has a unique identifier (/products/4). 3) Use JSON for request/response bodies. 4) Use HTTP verbs for operations (GET, POST, PUT, DELETE, PATCH). REST is stateless, cacheable, and runs on HTTP. ${p.label} demonstrates ${p.maturityLevel === 3 ? "full REST maturity with hypermedia" : "Level 2 maturity with proper resource design"}.`;
    },
  },

  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    explain: (s) => {
      const p = VARIANT_PROFILES[s.variant];
      const pros = p.strengths.slice(0, 2).join("; ");
      const cons = p.weaknesses.slice(0, 2).join("; ");
      return `${p.label} — Richardson Level ${p.maturityLevel}. Strengths: ${pros}. Trade-offs: ${cons}. REST was introduced by Roy Fielding (2000) as an alternative to SOAP/WSDL. Switch patterns and replay to compare!`;
    },
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: RestApiState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
