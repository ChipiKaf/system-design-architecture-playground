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
  own node IDs — HTTP/REST, gRPC, GraphQL, AMQP, MQTT, Kafka.
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
  void _state;
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
  /* MQTT */
  | "mqtt-device-connect"
  | "mqtt-publish-telemetry"
  | "mqtt-rules-match"
  | "mqtt-route-lambda"
  | "mqtt-store-timestream"
  | "mqtt-lambda-dlq"
  | "mqtt-update-shadow"
  | "mqtt-backend-desired"
  | "mqtt-shadow-delta"
  | "mqtt-command-delivery"
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

  /* ══════ MQTT ══════════════════════════════════════ */

  {
    key: "mqtt-device-connect",
    label: "Devices → IoT Core Connect",
    when: is("mqtt"),
    phase: "connect",
    processingText: "Establishing MQTT sessions...",
    flow: [
      {
        from: "device-temp",
        to: "iot-core",
        duration: 400,
        color: "#a78bfa",
        explain:
          "Temp Sensor opens an MQTT/TLS (encrypted MQTT) session to AWS IoT Core using its own X.509 certificate (digital ID card).",
      },
      {
        from: "device-pressure",
        to: "iot-core",
        duration: 400,
        color: "#a78bfa",
        explain:
          "Pressure Sensor connects with its own separate X.509 certificate. Each device has a unique identity.",
      },
      {
        from: "device-gps",
        to: "iot-core",
        duration: 400,
        color: "#a78bfa",
        explain:
          "GPS Tracker connects with its own X.509 certificate. No two devices share a certificate, so if one device is compromised you can revoke only that one.",
      },
    ],
    finalHotZones: ["device-temp", "device-pressure", "device-gps", "iot-core"],
    explain:
      "Every device gets its own X.509 certificate (digital ID card) and IoT policy (permission rules). This means AWS IoT Core can tell devices apart and control exactly which topics each device may use. If one device is stolen or hacked, you revoke just that certificate without affecting the rest of the fleet.",
  },
  {
    key: "mqtt-publish-telemetry",
    label: "Publish Telemetry Topic",
    when: is("mqtt"),
    phase: "publish",
    processingText: "Publishing telemetry...",
    flow: [
      {
        from: "device-temp",
        to: "iot-core",
        duration: 450,
        color: "#a78bfa",
        explain:
          "Temp Sensor publishes a temperature reading to its telemetry topic (message channel), e.g. dt/temp-sensor-01/telemetry.",
      },
    ],
    finalHotZones: ["device-temp", "iot-core"],
    explain:
      "MQTT is topic-based. A topic is just a named message channel like a folder path. The device does not need to know which backend systems will use the message; it only needs to publish on the right topic name.",
  },
  {
    key: "mqtt-rules-match",
    label: "IoT Core → Rules Engine",
    when: is("mqtt"),
    phase: "routing",
    processingText: "Matching topic rule...",
    flow: [
      {
        from: "iot-core",
        to: "iot-rules",
        duration: 500,
        color: "#f59e0b",
        explain:
          "AWS IoT Core checks IoT Rules (routing rules): if a message arrives on this topic, send it here.",
      },
    ],
    finalHotZones: ["iot-core", "iot-rules"],
    explain:
      "IoT Rules are AWS's built-in traffic directors for device messages. They can filter messages, add context, and forward them to services like Lambda (small cloud code), Timestream (time-series database), SQS, EventBridge, or Kinesis.",
  },
  {
    key: "mqtt-route-lambda",
    label: "Rule → Lambda",
    when: is("mqtt"),
    phase: "ingest",
    processingText: "Invoking Lambda...",
    flow: [
      {
        from: "iot-rules",
        to: "lambda-ingest",
        duration: 500,
        color: "#f59e0b",
        explain:
          "The rule invokes Lambda (a small piece of cloud code) that can check, clean up, or enrich the message before it is stored or used.",
      },
    ],
    finalHotZones: ["iot-rules", "lambda-ingest"],
    explain:
      "This is where backend logic usually happens. Lambda can add missing information, check for abnormal values, or trigger alerts without making the device know anything about those cloud workflows.",
  },
  {
    key: "mqtt-store-timestream",
    label: "Lambda → Timestream",
    when: is("mqtt"),
    phase: "data-access",
    processingText: "Persisting telemetry...",
    flow: [
      {
        from: "lambda-ingest",
        to: "timestream",
        duration: 450,
        color: "#22c55e",
        explain:
          "Lambda stores the telemetry in Amazon Timestream (a database made for data points collected over time).",
      },
    ],
    finalHotZones: ["lambda-ingest", "timestream"],
    explain:
      "IoT data is often time-series data, meaning many readings over time. Timestream fits that well because it stores values together with their timestamps for dashboards and history.",
  },
  {
    key: "mqtt-lambda-dlq",
    label: "Failed → Dead-Letter Queue",
    when: is("mqtt"),
    phase: "error-handling",
    processingText: "Message processing failed...",
    flow: [
      {
        from: "lambda-ingest",
        to: "sqs-dlq",
        duration: 500,
        color: "#ef4444",
        explain:
          "Lambda fails to process the message (maybe a bug, maybe the downstream database is unreachable). After a few automatic retries, the message is sent to an SQS Dead-Letter Queue (DLQ) so it is not lost.",
      },
    ],
    finalHotZones: ["lambda-ingest", "sqs-dlq"],
    explain:
      "A Dead-Letter Queue (DLQ) is a safety net. When a message cannot be processed after several retries, instead of throwing it away, AWS moves it to this special queue. An engineer can later inspect the failed messages, fix the bug, and replay them. The key point: the message is preserved, never silently dropped.",
  },
  {
    key: "mqtt-update-shadow",
    label: "Update Reported Shadow",
    when: is("mqtt"),
    phase: "shadow",
    processingText: "Updating reported state...",
    flow: [
      {
        from: "iot-core",
        to: "device-shadow",
        duration: 450,
        color: "#60a5fa",
        explain:
          "AWS IoT Core writes the device's latest reported state into the Device Shadow. This overwrites whatever was there before — the shadow only keeps the LAST state, not a history.",
      },
    ],
    finalHotZones: ["iot-core", "device-shadow"],
    explain:
      "Device Shadow is a small JSON document stored in the cloud that has two sections: 'reported' (what the device last said, e.g. {\"temp\": 22}) and 'desired' (what the cloud wants, e.g. {\"temp\": 20}). Important: the shadow only keeps the latest value for each field — it is NOT a history log. If you need history, store telemetry separately in Timestream or S3.",
  },
  {
    key: "mqtt-backend-desired",
    label: "Backend Writes Desired State",
    when: is("mqtt"),
    phase: "command",
    processingText: "Publishing desired state...",
    flow: [
      {
        from: "ops-app",
        to: "device-shadow",
        duration: 450,
        color: "#60a5fa",
        explain:
          "An operations app writes the desired state (e.g. {\"temp\": 20}) into the shadow. This tells the device 'I want you to cool down to 20 degrees' without calling the device directly.",
      },
    ],
    finalHotZones: ["ops-app", "device-shadow"],
    explain:
      'This is the common AWS command path. The cloud writes the new wanted state into the shadow\'s \'desired\' section. The shadow now has reported: {"temp": 22} and desired: {"temp": 20}. AWS automatically computes the delta (what still needs to change).',
  },
  {
    key: "mqtt-shadow-delta",
    label: "Shadow Delta → IoT Core",
    when: is("mqtt"),
    phase: "shadow",
    processingText: "Computing delta...",
    flow: [
      {
        from: "device-shadow",
        to: "iot-core",
        duration: 420,
        color: "#60a5fa",
        explain:
          'The shadow computes the delta: desired says temp 20, reported says temp 22, so the delta is {"temp": 20} — meaning the device still needs to reach 20.',
      },
    ],
    finalHotZones: ["device-shadow", "iot-core"],
    explain:
      "AWS IoT Core publishes this delta on a built-in shadow topic so any connected device can see exactly what still needs to change. If the device is offline, the delta waits — the shadow keeps it until the device reconnects.",
  },
  {
    key: "mqtt-command-delivery",
    label: "IoT Core → Device",
    when: is("mqtt"),
    phase: "delivery",
    processingText: "Delivering cloud command...",
    flow: [
      {
        from: "iot-core",
        to: "device-temp",
        duration: 500,
        color: "#22c55e",
        explain:
          'Because the Temp Sensor already has a live MQTT session, AWS IoT Core pushes the delta down immediately over that same connection. The device receives {"temp": 20} and adjusts.',
      },
    ],
    finalHotZones: ["iot-core", "device-temp", "device-shadow"],
    recalcMetrics: true,
    explain:
      "This is the key IoT difference: MQTT is not only for sending readings up to the cloud. It also lets the cloud send lightweight commands back to the device over the same always-on connection. Once the device applies the change, it publishes a new reported state, and the shadow's reported and desired sections match — delta becomes empty.",
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
