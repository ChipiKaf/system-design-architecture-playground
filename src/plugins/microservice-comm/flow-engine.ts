import type { MicroserviceCommState } from "./microserviceCommSlice";
import { VARIANT_PROFILES } from "./microserviceCommSlice";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   Microservice Communication Lab — Declarative Flow Engine

   Each protocol has a UNIQUE step sequence targeting its
   own node IDs — HTTP/REST, gRPC, GraphQL, AMQP, Kafka.
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<MicroserviceCommState>;
export type StepDef = GenericStepDef<MicroserviceCommState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<MicroserviceCommState>;

/* ── Helpers ──────────────────────────────────────────── */

const is = (v: string) => (s: MicroserviceCommState) => s.variant === v;
const isSync = (s: MicroserviceCommState) =>
  VARIANT_PROFILES[s.variant].commType === "sync";

/* ── Token expansion (identity — direct node IDs) ────── */

export function expandToken(
  token: string,
  _state: MicroserviceCommState,
): string[] {
  return [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  /* shared */
  | "overview"
  | "summary"
  /* HTTP/REST */
  | "rest-client-to-apigw"
  | "rest-apigw-to-alb"
  | "rest-alb-to-order"
  | "rest-order-reads-db"
  | "rest-order-calls-product"
  | "rest-product-reads-db"
  | "rest-response-chain"
  /* gRPC */
  | "grpc-discover"
  | "grpc-client-to-alb"
  | "grpc-alb-to-mesh"
  | "grpc-order-call"
  | "grpc-order-streams-product"
  | "grpc-binary-response"
  /* GraphQL */
  | "gql-client-to-appsync"
  | "gql-auth-check"
  | "gql-resolver-fan-out"
  | "gql-resolver-a-fetch"
  | "gql-resolver-b-fetch"
  | "gql-merge-response"
  /* AMQP */
  | "amqp-client-to-producer"
  | "amqp-publish-to-exchange"
  | "amqp-ack-client"
  | "amqp-route-to-queues"
  | "amqp-consume-a"
  | "amqp-consume-b"
  | "amqp-dlq-fallback"
  /* Kafka */
  | "kafka-client-to-producer"
  | "kafka-append-partitions"
  | "kafka-ack-client"
  | "kafka-cg-analytics"
  | "kafka-cg-search"
  | "kafka-archive-s3";

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  /* ── Step 0: Overview ─────────────────────────────── */
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: (s) =>
      isSync(s) ? "Start Request Flow" : "Start Message Flow",
    action: "resetRun",
    explain: (s) => {
      const p = VARIANT_PROFILES[s.variant];
      return `${p.label} (${p.commType}) — ${p.description} AWS: ${p.awsServices.map((a) => a.name).join(", ")}.`;
    },
  },

  /* ══════ HTTP / REST ════════════════════════════════ */

  {
    key: "rest-client-to-apigw",
    label: "Client → API Gateway",
    when: is("http-rest"),
    phase: "request",
    processingText: "HTTP POST /orders...",
    flow: [
      {
        from: "client",
        to: "api-gw",
        duration: 550,
        explain: "REST request hits API Gateway.",
      },
    ],
    finalHotZones: ["api-gw"],
    explain:
      "Client sends an HTTP POST to Amazon API Gateway. API Gateway validates the request, applies throttling, and routes to the ALB.",
  },
  {
    key: "rest-apigw-to-alb",
    label: "API Gateway → ALB",
    when: is("http-rest"),
    phase: "routing",
    flow: [
      {
        from: "api-gw",
        to: "alb",
        duration: 450,
        explain: "API Gateway forwards to ALB.",
      },
    ],
    finalHotZones: ["alb"],
    explain:
      "API Gateway forwards the request to the Application Load Balancer. ALB performs path-based routing (e.g., /orders → Order Service, /products → Product Service).",
  },
  {
    key: "rest-alb-to-order",
    label: "ALB → Order Service",
    when: is("http-rest"),
    phase: "inter-service",
    flow: [
      {
        from: "alb",
        to: "svc-order",
        duration: 500,
        explain: "ALB routes to Order Service.",
      },
    ],
    finalHotZones: ["svc-order"],
    explain:
      "ALB routes the request to Order Service on ECS Fargate. ALB health-checks ensure only healthy targets receive traffic.",
  },
  {
    key: "rest-order-reads-db",
    label: "Order → DynamoDB",
    when: is("http-rest"),
    phase: "data-access",
    flow: [
      {
        from: "svc-order",
        to: "dynamo-o",
        duration: 400,
        explain: "Order reads DynamoDB.",
      },
    ],
    finalHotZones: ["svc-order", "dynamo-o"],
    explain:
      "Order Service reads/writes its own DynamoDB table. Database-per-service — no shared databases. DynamoDB provides single-digit ms latency.",
  },
  {
    key: "rest-order-calls-product",
    label: "Order → Product (via ALB)",
    when: is("http-rest"),
    phase: "inter-service-2",
    processingText: "GET /products/42...",
    flow: [
      {
        from: "svc-order",
        to: "alb",
        duration: 350,
        explain: "Order calls ALB.",
      },
      {
        from: "alb",
        to: "svc-product",
        duration: 400,
        explain: "ALB routes to Product.",
      },
    ],
    finalHotZones: ["svc-product"],
    explain:
      "Order makes a synchronous HTTP GET to ALB → Product Service. Temporal coupling: Order is blocked waiting for Product. Total latency stacks.",
  },
  {
    key: "rest-product-reads-db",
    label: "Product → DynamoDB",
    when: is("http-rest"),
    phase: "data-access-2",
    flow: [
      {
        from: "svc-product",
        to: "dynamo-p",
        duration: 400,
        explain: "Product reads from DynamoDB.",
      },
    ],
    finalHotZones: ["svc-product", "dynamo-p"],
    explain:
      "Product Service reads from its own DynamoDB table. Separate from Order's table — database-per-service pattern.",
  },
  {
    key: "rest-response-chain",
    label: "Response Chain",
    when: is("http-rest"),
    phase: "response",
    flow: [
      {
        from: "svc-product",
        to: "svc-order",
        duration: 350,
        color: "#22c55e",
        explain: "Product responds.",
      },
      {
        from: "svc-order",
        to: "alb",
        duration: 300,
        color: "#22c55e",
        explain: "Order responds.",
      },
      {
        from: "alb",
        to: "api-gw",
        duration: 300,
        color: "#22c55e",
        explain: "ALB forwards.",
      },
      {
        from: "api-gw",
        to: "client",
        duration: 350,
        color: "#22c55e",
        explain: "API GW returns.",
      },
    ],
    finalHotZones: ["client"],
    recalcMetrics: true,
    explain:
      "Response flows: Product → Order → ALB → API Gateway → Client. Total latency ≈ sum of all hops (~45ms each). Any slow service blocks the entire chain.",
  },

  /* ══════ gRPC ═══════════════════════════════════════ */

  {
    key: "grpc-discover",
    label: "Service Discovery",
    when: is("grpc"),
    phase: "discovery",
    flow: [
      {
        from: "client",
        to: "cloud-map",
        duration: 400,
        color: "#14b8a6",
        explain: "Resolve endpoint.",
      },
    ],
    finalHotZones: ["cloud-map"],
    explain:
      "Client queries AWS Cloud Map for the gRPC endpoint. Cloud Map maintains a registry of healthy instances — client-side discovery for better control.",
  },
  {
    key: "grpc-client-to-alb",
    label: "Client → ALB (HTTP/2)",
    when: is("grpc"),
    phase: "request",
    processingText: "gRPC unary call...",
    flow: [
      {
        from: "client",
        to: "alb-grpc",
        duration: 450,
        explain: "gRPC over HTTP/2.",
      },
    ],
    finalHotZones: ["alb-grpc"],
    explain:
      "Client sends a gRPC request over HTTP/2. Payload is binary Protobuf — ~7× smaller than JSON. ALB natively supports gRPC routing.",
  },
  {
    key: "grpc-alb-to-mesh",
    label: "ALB → App Mesh Proxy",
    when: is("grpc"),
    phase: "mesh",
    flow: [
      {
        from: "alb-grpc",
        to: "mesh-proxy",
        duration: 400,
        explain: "Forwards to Envoy sidecar.",
      },
    ],
    finalHotZones: ["mesh-proxy"],
    explain:
      "ALB forwards to the App Mesh Envoy sidecar. App Mesh provides mTLS, observability (X-Ray), and traffic policies — the service mesh pattern.",
  },
  {
    key: "grpc-order-call",
    label: "Mesh → Order Service",
    when: is("grpc"),
    phase: "inter-service",
    flow: [
      {
        from: "mesh-proxy",
        to: "svc-order",
        duration: 350,
        explain: "Sidecar routes to Order.",
      },
    ],
    finalHotZones: ["svc-order", "proto-contract"],
    explain:
      "Envoy forwards the gRPC call to Order Service. Both services share a .proto contract that enforces API compatibility at compile time.",
  },
  {
    key: "grpc-order-streams-product",
    label: "Order ↔ Product (Stream)",
    when: is("grpc"),
    phase: "streaming",
    processingText: "Bidirectional stream...",
    flow: [
      {
        from: "svc-order",
        to: "mesh-proxy",
        duration: 300,
        explain: "Order opens stream.",
      },
      {
        from: "mesh-proxy",
        to: "svc-product",
        duration: 350,
        explain: "Mesh routes to Product.",
      },
    ],
    finalHotZones: ["svc-order", "svc-product"],
    explain:
      "Order opens a bidirectional gRPC stream to Product via the mesh. HTTP/2 multiplexing — multiple RPCs on one connection, no head-of-line blocking.",
  },
  {
    key: "grpc-binary-response",
    label: "Binary Response",
    when: is("grpc"),
    phase: "response",
    flow: [
      {
        from: "svc-product",
        to: "svc-order",
        duration: 300,
        color: "#22c55e",
        explain: "Protobuf response.",
      },
      {
        from: "svc-order",
        to: "alb-grpc",
        duration: 250,
        color: "#22c55e",
        explain: "Order responds.",
      },
      {
        from: "alb-grpc",
        to: "client",
        duration: 300,
        color: "#22c55e",
        explain: "ALB returns.",
      },
    ],
    finalHotZones: ["client"],
    recalcMetrics: true,
    explain:
      "Binary Protobuf responses flow back. ~12ms total (vs ~45ms REST). Compact binary + HTTP/2 = 3–4× faster for internal calls.",
  },

  /* ══════ GraphQL ════════════════════════════════════ */

  {
    key: "gql-client-to-appsync",
    label: "Client → AppSync",
    when: is("graphql"),
    phase: "request",
    processingText: "GraphQL query...",
    flow: [
      {
        from: "client",
        to: "appsync",
        duration: 500,
        explain: "GraphQL query sent.",
      },
    ],
    finalHotZones: ["appsync"],
    explain:
      "Client sends a GraphQL query to AWS AppSync. One endpoint, one request — client specifies exactly which fields it needs.",
  },
  {
    key: "gql-auth-check",
    label: "AppSync → Cognito Auth",
    when: is("graphql"),
    phase: "auth",
    flow: [
      {
        from: "appsync",
        to: "cognito",
        duration: 350,
        color: "#f59e0b",
        explain: "Verifying JWT.",
      },
    ],
    finalHotZones: ["appsync", "cognito"],
    explain:
      "AppSync verifies the JWT with Amazon Cognito. Auth at the gateway level — resolvers don't re-verify.",
  },
  {
    key: "gql-resolver-fan-out",
    label: "Resolver Fan-Out",
    when: is("graphql"),
    phase: "fan-out",
    processingText: "Resolving fields...",
    flow: [
      {
        from: "appsync",
        to: "resolver-a",
        duration: 400,
        explain: "Order resolver invoked.",
      },
      {
        from: "appsync",
        to: "resolver-b",
        duration: 420,
        explain: "Product resolver invoked.",
      },
    ],
    finalHotZones: ["resolver-a", "resolver-b"],
    explain:
      "AppSync fans out to Lambda resolvers in PARALLEL — unlike REST sequential calls. One per field type.",
  },
  {
    key: "gql-resolver-a-fetch",
    label: "Order Resolver → DynamoDB",
    when: is("graphql"),
    phase: "data-access",
    flow: [
      {
        from: "resolver-a",
        to: "dynamo-a",
        duration: 350,
        explain: "Order resolver reads.",
      },
    ],
    finalHotZones: ["resolver-a", "dynamo-a"],
    explain:
      "Order Lambda resolver queries DynamoDB. AppSync also supports direct DynamoDB data sources without Lambda.",
  },
  {
    key: "gql-resolver-b-fetch",
    label: "Product Resolver → DynamoDB",
    when: is("graphql"),
    phase: "data-access-2",
    flow: [
      {
        from: "resolver-b",
        to: "dynamo-b",
        duration: 350,
        explain: "Product resolver reads.",
      },
    ],
    finalHotZones: ["resolver-b", "dynamo-b"],
    explain:
      "Product resolver fetches simultaneously. Total data latency = max(resolver-a, resolver-b), not the sum.",
  },
  {
    key: "gql-merge-response",
    label: "Merge & Respond",
    when: is("graphql"),
    phase: "response",
    flow: [
      {
        from: "resolver-a",
        to: "appsync",
        duration: 300,
        color: "#22c55e",
        explain: "Order data.",
      },
      {
        from: "resolver-b",
        to: "appsync",
        duration: 300,
        color: "#22c55e",
        explain: "Product data.",
      },
      {
        from: "appsync",
        to: "client",
        duration: 350,
        color: "#22c55e",
        explain: "Merged response.",
      },
    ],
    finalHotZones: ["client"],
    recalcMetrics: true,
    explain:
      "AppSync merges results into the exact shape requested. Only requested fields returned — ~0.8 KB payload.",
  },

  /* ══════ AMQP ═══════════════════════════════════════ */

  {
    key: "amqp-client-to-producer",
    label: "Client → Producer",
    when: is("amqp"),
    phase: "request",
    processingText: "Sending order...",
    flow: [
      {
        from: "client",
        to: "svc-producer",
        duration: 450,
        explain: "Client sends to producer.",
      },
    ],
    finalHotZones: ["svc-producer"],
    explain:
      "Client sends an order to the Producer service (ECS Fargate). Instead of synchronous chains, the producer decouples via a message broker.",
  },
  {
    key: "amqp-publish-to-exchange",
    label: "Publish → Exchange",
    when: is("amqp"),
    phase: "publish",
    processingText: "Publishing message...",
    flow: [
      {
        from: "svc-producer",
        to: "exchange",
        duration: 500,
        explain: "Message → exchange.",
      },
    ],
    finalHotZones: ["exchange"],
    explain:
      "Producer publishes to Amazon MQ (RabbitMQ) exchange. The topic exchange routes via keys like 'order.created' to bound queues.",
  },
  {
    key: "amqp-ack-client",
    label: "Ack to Client",
    when: is("amqp"),
    phase: "ack",
    flow: [
      {
        from: "svc-producer",
        to: "client",
        duration: 350,
        color: "#22c55e",
        explain: "Quick ack.",
      },
    ],
    finalHotZones: ["client", "exchange"],
    explain:
      "Producer ACKs the client immediately ('Order accepted'). Client is UNBLOCKED — doesn't wait for downstream processing.",
  },
  {
    key: "amqp-route-to-queues",
    label: "Exchange → Queues",
    when: is("amqp"),
    phase: "routing",
    flow: [
      {
        from: "exchange",
        to: "queue-a",
        duration: 400,
        color: "#f59e0b",
        explain: "Route to Queue A.",
      },
      {
        from: "exchange",
        to: "queue-b",
        duration: 420,
        color: "#f59e0b",
        explain: "Route to Queue B.",
      },
    ],
    finalHotZones: ["queue-a", "queue-b"],
    explain:
      "Exchange routes copies to bound queues. Fan-out: one message triggers multiple consumers.",
  },
  {
    key: "amqp-consume-a",
    label: "Consumer A Processes",
    when: is("amqp"),
    phase: "consume-1",
    processingText: "Notification consumer...",
    flow: [
      {
        from: "queue-a",
        to: "consumer-a",
        duration: 550,
        color: "#22c55e",
        explain: "Consumer A pulls.",
      },
    ],
    finalHotZones: ["consumer-a"],
    explain:
      "Consumer A (Notification Service) pulls at its own pace. If it crashes, message returns to queue for redelivery.",
  },
  {
    key: "amqp-consume-b",
    label: "Consumer B Processes",
    when: is("amqp"),
    phase: "consume-2",
    processingText: "Fulfillment consumer...",
    flow: [
      {
        from: "queue-b",
        to: "consumer-b",
        duration: 550,
        color: "#22c55e",
        explain: "Consumer B pulls.",
      },
    ],
    finalHotZones: ["consumer-b"],
    explain:
      "Consumer B (Fulfillment) processes independently. If slow, messages queue up (load levelling) instead of cascading failures.",
  },
  {
    key: "amqp-dlq-fallback",
    label: "DLQ Fallback",
    when: is("amqp"),
    phase: "error-handling",
    flow: [
      {
        from: "queue-a",
        to: "dlq",
        duration: 450,
        color: "#ef4444",
        explain: "Failed → DLQ.",
      },
    ],
    finalHotZones: ["dlq"],
    recalcMetrics: true,
    explain:
      "Failed messages after max retries go to Dead Letter Queue (SQS). CloudWatch monitors queue depth & DLQ count.",
  },

  /* ══════ Kafka ══════════════════════════════════════ */

  {
    key: "kafka-client-to-producer",
    label: "Client → Producer",
    when: is("kafka"),
    phase: "request",
    processingText: "Sending event...",
    flow: [
      {
        from: "client",
        to: "svc-producer",
        duration: 450,
        explain: "Client sends event.",
      },
    ],
    finalHotZones: ["svc-producer"],
    explain:
      "Client sends an event to Producer. In Kafka, events are facts — 'OrderCreated' not 'CreateOrder'. The producer appends to an immutable log.",
  },
  {
    key: "kafka-append-partitions",
    label: "Append to Partitions",
    when: is("kafka"),
    phase: "publish",
    processingText: "Appending to topic...",
    flow: [
      {
        from: "svc-producer",
        to: "topic-p0",
        duration: 400,
        explain: "→ partition 0.",
      },
      {
        from: "svc-producer",
        to: "topic-p1",
        duration: 420,
        explain: "→ partition 1.",
      },
      {
        from: "svc-producer",
        to: "topic-p2",
        duration: 440,
        explain: "→ partition 2.",
      },
    ],
    finalHotZones: ["topic-p0", "topic-p1", "topic-p2"],
    explain:
      "Producer appends to Amazon MSK topic partitions. Partitioned by key (order_id) for ordering. Append-only — events are NEVER deleted.",
  },
  {
    key: "kafka-ack-client",
    label: "Ack to Client",
    when: is("kafka"),
    phase: "ack",
    flow: [
      {
        from: "svc-producer",
        to: "client",
        duration: 300,
        color: "#22c55e",
        explain: "Ack client.",
      },
    ],
    finalHotZones: ["client", "topic-p0", "topic-p1", "topic-p2"],
    explain:
      "Producer ACKs after event is replicated to ISR (In-Sync Replicas). Event is durable — survives broker failures.",
  },
  {
    key: "kafka-cg-analytics",
    label: "CG: Analytics Reads",
    when: is("kafka"),
    phase: "consume-1",
    processingText: "Analytics processing...",
    flow: [
      {
        from: "topic-p0",
        to: "cg-analytics",
        duration: 500,
        color: "#8b5cf6",
        explain: "Analytics reads.",
      },
      {
        from: "topic-p1",
        to: "cg-analytics",
        duration: 520,
        color: "#8b5cf6",
        explain: "Analytics reads p1.",
      },
    ],
    finalHotZones: ["cg-analytics"],
    explain:
      "Analytics consumer group reads from the topic. Each group maintains its own offset. Multiple groups read the SAME events independently.",
  },
  {
    key: "kafka-cg-search",
    label: "CG: Search Reads",
    when: is("kafka"),
    phase: "consume-2",
    processingText: "Search indexing...",
    flow: [
      {
        from: "topic-p1",
        to: "cg-search",
        duration: 500,
        color: "#a78bfa",
        explain: "Search reads.",
      },
      {
        from: "topic-p2",
        to: "cg-search",
        duration: 520,
        color: "#a78bfa",
        explain: "Search reads p2.",
      },
    ],
    finalHotZones: ["cg-search"],
    explain:
      "Search consumer group independently reads the same events. Unlike AMQP (consumed once), Kafka events serve unlimited consumer groups.",
  },
  {
    key: "kafka-archive-s3",
    label: "Archive to S3",
    when: is("kafka"),
    phase: "archive",
    flow: [
      {
        from: "topic-p2",
        to: "s3-archive",
        duration: 450,
        color: "#60a5fa",
        explain: "Sink to S3.",
      },
    ],
    finalHotZones: ["s3-archive"],
    recalcMetrics: true,
    explain:
      "MSK Connect sinks events to S3 for long-term archival. Audit trail + historical replay beyond Kafka retention.",
  },

  /* ══════ SHARED FINAL ═══════════════════════════════ */

  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    explain: (s) => {
      const p = VARIANT_PROFILES[s.variant];
      const aws = p.awsServices.map((a) => a.name).join(", ");
      const pros = p.strengths.slice(0, 2).join("; ");
      const cons = p.weaknesses.slice(0, 2).join("; ");
      return `${p.label} (${p.commType}): Coupling = ${p.coupling}, Format = ${p.format}. AWS: ${aws}. Strengths: ${pros}. Trade-offs: ${cons}. Switch protocols to compare!`;
    },
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: MicroserviceCommState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
