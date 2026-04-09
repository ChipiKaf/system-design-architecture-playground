import type { CommPatternsState } from "./commPatternsSlice";
import { PATTERN_PROFILES, SERVICES } from "./commPatternsSlice";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   Communication Patterns Lab — Declarative Flow Engine

   Each step moves exactly ONE signal or highlights ONE thing.
   Pattern-specific flows are resolved at runtime via the
   `flow` function form, so adding a new pattern only requires
   a new key in commPatternsSlice and a branch in the flow
   functions below.
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<CommPatternsState>;
export type StepDef = GenericStepDef<CommPatternsState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<CommPatternsState>;

/* ── Node IDs (stable across patterns) ─────────────────── */

const SVC_IDS = SERVICES.map((s) => s.toLowerCase()); // catalog, shoppingcart, discount, order
const BFF_CLIENT_IDS = ["web-client", "mobile-client", "desktop-client"];
const BFF_IDS = ["web-bff", "mobile-bff", "desktop-bff"];
const WEB_BFF_SERVICE_IDS = ["catalog", "shoppingcart", "discount"];

const isGatewayPattern = (pattern: CommPatternsState["pattern"]) =>
  pattern.startsWith("gateway");

/* ── Token expansion ─────────────────────────────────── */

export function expandToken(token: string, state: CommPatternsState): string[] {
  if (token === "$client") return ["client"];
  if (token === "$gateway") return ["gateway"];
  if (token === "$services") return SVC_IDS;
  if (token === "$web-services") return WEB_BFF_SERVICE_IDS;
  if (token === "$identity") return ["identity-server"];
  if (token === "$bff-clients") return BFF_CLIENT_IDS;
  if (token === "$bffs") return BFF_IDS;
  if (token === "$web-client") return ["web-client"];
  if (token === "$mobile-client") return ["mobile-client"];
  if (token === "$desktop-client") return ["desktop-client"];
  if (token === "$web-bff") return ["web-bff"];
  if (token === "$mobile-bff") return ["mobile-bff"];
  if (token === "$desktop-bff") return ["desktop-bff"];
  if (token === "$pattern") return [state.pattern];
  // Service-specific tokens
  const svcMatch = token.match(/^\$svc-(\d+)$/);
  if (svcMatch) {
    const idx = Number(svcMatch[1]);
    return idx < SVC_IDS.length ? [SVC_IDS[idx]] : [];
  }
  return [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  | "overview"
  | "client-request"
  | "bff-needs"
  | "gateway-receive"
  | "bff-receive"
  | "protocol-conversion"
  | "route-to-service"
  | "fan-out"
  | "bff-compose"
  | "service-respond"
  | "aggregate-responses"
  | "offload-concerns"
  | "forward-to-service"
  | "bff-shape-response"
  | "gateway-respond"
  | "summary";

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  /* ─── 0. Overview ────────────────────────────────── */
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Begin Request Flow",
    action: "resetRun",
    explain: (s) => {
      const p = PATTERN_PROFILES[s.pattern];
      return `${p.label}: ${p.description}`;
    },
  },

  /* ─── 1. Client sends request ────────────────────── */
  {
    key: "client-request",
    label: "Client Sends Request",
    processingText: "Sending request…",

    /* Direct: fan-out to all services; others: single call to gateway */
    when: (s) => s.pattern === "direct",
    phase: "request",
    flow: [
      {
        from: "client",
        to: "$services",
        duration: 600,
        explain: "Client calls all four services directly.",
      },
    ],
    finalHotZones: () => [...SVC_IDS],
    explain: () =>
      "Direct pattern: the client sends a separate request to every service. That's 4 round-trips from the client.",
  },

  /* 1a. Why BFF exists — different clients need different APIs */
  {
    key: "bff-needs",
    label: "Different Client Needs",
    when: (s) => s.pattern === "bff",
    phase: "bff-overview",
    finalHotZones: () => [...BFF_CLIENT_IDS, ...BFF_IDS],
    delay: 350,
    explain: () =>
      "Web, mobile, and desktop clients often need different UI and data shapes. BFF solves this by giving each frontend its own dedicated backend instead of forcing every client through one generic API.",
  },

  /* 1b. Gateway-bound patterns — single client → gateway call */
  {
    key: "gateway-receive",
    label: "Client → Gateway",
    processingText: "Sending request…",
    when: (s) => isGatewayPattern(s.pattern),
    phase: "request",
    flow: [
      {
        from: "client",
        to: "gateway",
        duration: 500,
        explain: "Client sends a single request to the API Gateway.",
      },
    ],
    finalHotZones: ["gateway"],
    explain: (s) => {
      const p = PATTERN_PROFILES[s.pattern];
      return `${p.label}: the client calls one unified endpoint. The gateway handles the rest.`;
    },
  },

  /* 1c. Client uses its dedicated BFF */
  {
    key: "bff-receive",
    label: "Client → Dedicated BFF",
    processingText: "Sending request…",
    when: (s) => s.pattern === "bff",
    phase: "request",
    flow: [
      {
        from: "$web-client",
        to: "$web-bff",
        duration: 500,
        color: "#ec4899",
        explain: "The web client sends a single request to its dedicated Web BFF.",
      },
    ],
    finalHotZones: ["web-client", "web-bff"],
    explain: () =>
      "Each frontend talks to its own dedicated backend. Here the browser calls the Web BFF; mobile and desktop would call their own BFFs in the same way.",
  },

  /* ─── 1d. Protocol conversion at the gateway/BFF ─── */
  {
    key: "protocol-conversion",
    label: "Protocol Conversion",
    when: (s) => s.pattern !== "direct",
    phase: "protocol",
    finalHotZones: (s) => (s.pattern === "bff" ? ["web-bff"] : ["gateway"]),
    delay: 600,
    explain: (s) =>
      s.pattern === "bff"
        ? "The Web BFF exposes a frontend-friendly REST/HTTP API, then translates that call to an internal gRPC service mesh. The frontend team gets a simple contract while backend services keep fast internal protocols."
        : "The gateway translates the external protocol to the internal one. The client sends REST/HTTP, but internally the gateway communicates with services over gRPC — a binary, high-performance protocol. This is transparent to both client and services.",
  },

  /* ─── 2. Gateway routes to single service ────────── */
  {
    key: "route-to-service",
    label: "Route to Service",
    processingText: "Routing…",
    when: (s) => s.pattern === "gateway-route",
    phase: "route",
    flow: [
      {
        from: "gateway",
        to: "catalog",
        duration: 600,
        color: "#3b82f6",
        explain:
          "Gateway inspects the path /api/products/123 and routes to Catalog service.",
      },
    ],
    finalHotZones: ["gateway", "catalog"],
    explain: () =>
      "Layer 7 routing: the gateway matches the path pattern and forwards to the correct downstream service. The client never knows the service address.",
  },

  /* ─── 2b. Gateway fans out to all services (aggregation) ── */
  {
    key: "fan-out",
    label: "Fan-Out to Services",
    processingText: "Dispatching…",
    when: (s) => s.pattern === "gateway-agg",
    phase: "fan-out",
    flow: [
      {
        from: "gateway",
        to: "$services",
        duration: 600,
        color: "#22c55e",
        explain: "Gateway dispatches to all four services in parallel.",
      },
    ],
    finalHotZones: () => ["gateway", ...SVC_IDS],
    explain: () =>
      "Aggregation pattern: the gateway fans out to all relevant backend services in parallel. Total latency ≈ slowest service, not sum of all.",
  },

  /* ─── 2c. BFF composes a client-specific backend call graph ── */
  {
    key: "bff-compose",
    label: "Compose Frontend-Specific Data",
    processingText: "Composing…",
    when: (s) => s.pattern === "bff",
    phase: "bff-compose",
    flow: [
      {
        from: "$web-bff",
        to: "$web-services",
        duration: 650,
        color: "#ec4899",
        explain:
          "The Web BFF calls only the backend services needed for the web UI: catalog, cart, and discount.",
      },
    ],
    finalHotZones: () => ["web-bff", ...WEB_BFF_SERVICE_IDS],
    explain: () =>
      "Instead of a generic one-size-fits-all response, the Web BFF fetches just the data the web experience needs. Mobile and desktop BFFs can compose different service combinations.",
  },

  /* ─── 2d. Offload concerns before forwarding ─────── */
  {
    key: "offload-concerns",
    label: "Apply Cross-Cutting Concerns",
    when: (s) => s.pattern === "gateway-offload",
    phase: "offload",
    finalHotZones: ["gateway", "identity-server"],
    flow: [
      {
        from: "gateway",
        to: "identity-server",
        duration: 500,
        color: "#f59e0b",
        explain: "Gateway verifies token with Identity Server.",
      },
    ],
    explain: () =>
      "The gateway handles SSL termination, authentication, rate limiting, and logging — so services don't have to. It verifies the token with the Identity Server.",
  },
  {
    key: "forward-to-service",
    label: "Forward to Service",
    processingText: "Forwarding…",
    when: (s) => s.pattern === "gateway-offload",
    phase: "forward",
    flow: [
      {
        from: "gateway",
        to: "catalog",
        duration: 600,
        color: "#f59e0b",
        explain: "After concerns are handled, the gateway forwards to Catalog.",
      },
    ],
    finalHotZones: ["gateway", "catalog"],
    explain: () =>
      "Once auth, rate-limit, and SSL checks pass, the gateway forwards the now-trusted request to the backend service. The service sees a plain internal call.",
  },

  /* ─── 3. Services respond ────────────────────────── */
  {
    key: "service-respond",
    label: "Services Respond",
    processingText: "Responding…",
    when: (s) => s.pattern !== "direct",
    phase: "response",
    flow: (s) => {
      if (s.pattern === "bff") {
        return [
          {
            from: "$web-services",
            to: "$web-bff",
            duration: 600,
            color: "#ec4899",
            explain:
              "Catalog, ShoppingCart, and Discount send their data back to the Web BFF.",
          },
        ];
      }
      if (s.pattern === "gateway-agg") {
        // All services respond back to gateway in parallel
        return [
          {
            from: "$services",
            to: "gateway",
            duration: 600,
            color: "#22c55e",
            explain:
              "All four services send their responses back to the gateway.",
          },
        ];
      }
      // Routing & offloading: single service responds
      return [
        {
          from: "catalog",
          to: "gateway",
          duration: 600,
          explain: "Catalog sends response back to the gateway.",
        },
      ];
    },
    finalHotZones: (s) => (s.pattern === "bff" ? ["web-bff"] : ["gateway"]),
    explain: (s) =>
      s.pattern === "bff"
        ? "The Web BFF now has the raw backend data. Next it can tailor and shape that payload specifically for the browser UI."
        : s.pattern === "gateway-agg"
          ? "All services have responded. The gateway now holds 4 partial results to combine."
          : "The service has processed the request and sent its response back to the gateway.",
  },

  /* ─── 3b. Aggregate responses (agg only) ─────────── */
  {
    key: "aggregate-responses",
    label: "Aggregate Responses",
    when: (s) => s.pattern === "gateway-agg",
    phase: "aggregate",
    finalHotZones: ["gateway"],
    delay: 400,
    explain: () =>
      "The gateway merges all partial responses into a single consolidated JSON payload. The client receives one response with data from every service.",
  },

  /* ─── 3c. Shape the response for a specific frontend ── */
  {
    key: "bff-shape-response",
    label: "Shape Response for Frontend",
    when: (s) => s.pattern === "bff",
    phase: "bff-shape",
    finalHotZones: ["web-bff"],
    delay: 450,
    explain: () =>
      "The Web BFF trims, reshapes, and aggregates backend data into a response optimized for the web UI. That removes orchestration and presentation-heavy logic from the frontend codebase.",
  },

  /* ─── 4. Gateway/BFF responds to client ──────────── */
  {
    key: "gateway-respond",
    label: "Response to Client",
    processingText: "Returning response…",
    when: (s) => s.pattern !== "direct",
    phase: "return",
    flow: (s) =>
      s.pattern === "bff"
        ? [
            {
              from: "web-bff",
              to: "web-client",
              duration: 500,
              color: "#ec4899",
              explain:
                "The Web BFF returns a browser-optimized payload back to the web client.",
            },
          ]
        : [
            {
              from: "gateway",
              to: "client",
              duration: 500,
              explain: "Gateway returns the final response to the client.",
            },
          ],
    recalcMetrics: true,
    finalHotZones: (s) => (s.pattern === "bff" ? ["web-client"] : ["client"]),
    explain: (s) => {
      const p = PATTERN_PROFILES[s.pattern];
      return s.pattern === "bff"
        ? `Done. The web client made 1 call to its dedicated BFF, received a tailored payload, and avoided client-side orchestration. Total estimated latency: ~${s.totalLatencyMs}ms.`
        : `Done. Client round-trips: ${p.clientCalls}. Total estimated latency: ~${s.totalLatencyMs}ms.`;
    },
  },

  /* ─── 5. Summary / Comparison ────────────────────── */
  {
    key: "summary",
    label: "Pattern Summary",
    phase: "summary",
    recalcMetrics: true,
    explain: (s) => {
      const p = PATTERN_PROFILES[s.pattern];
      return s.pattern === "bff"
        ? `${p.label} — Each frontend gets its own dedicated backend. That reduces client-side complexity and avoids a single overgrown gateway, at the cost of running more edge services.`
        : `${p.label} — Client calls: ${p.clientCalls} | Coupling: ${p.coupling} | Complexity: ${p.complexity}. Try switching patterns to compare!`;
    },
  },
];

/* ── Build active steps (filters by `when`) ──────────── */

export function buildSteps(state: CommPatternsState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
