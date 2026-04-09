import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";

/* ── Variant identifiers ─────────────────────────────── */

export type CommType = "sync" | "async";

export type ProtocolKey =
  | "http-rest"
  | "grpc"
  | "graphql"
  | "amqp"
  | "mqtt"
  | "kafka";

export type VariantKey = ProtocolKey;

/* ── Per-protocol profile ────────────────────────────── */

export interface VariantProfile {
  key: ProtocolKey;
  commType: CommType;
  label: string;
  color: string;
  description: string;
  format: string;
  coupling: "tight" | "moderate" | "loose";
  strengths: string[];
  weaknesses: string[];
  awsServices: { name: string; role: string }[];
  /** Unique node IDs for this protocol's scene topology */
  nodes: string[];
}

export const VARIANT_PROFILES: Record<ProtocolKey, VariantProfile> = {
  "http-rest": {
    key: "http-rest",
    commType: "sync",
    label: "HTTP / REST",
    color: "#3b82f6",
    description:
      "Public API style for browser/mobile clients: REST over HTTP with JSON payloads, usually fronted by API Gateway or ALB.",
    format: "JSON",
    coupling: "tight",
    strengths: [
      "Simple & ubiquitous",
      "Human-readable payloads",
      "Rich tooling & ecosystem",
      "Easy debugging with browser / curl",
    ],
    weaknesses: [
      "Caller blocked during request",
      "Higher latency (text-based JSON)",
      "No built-in streaming",
      "Risk of cascading failures",
    ],
    awsServices: [
      { name: "API Gateway", role: "Public REST endpoint + throttling" },
      { name: "ALB", role: "Layer-7 load balancer + path routing" },
      { name: "ECS Fargate", role: "Runs containerised microservices" },
      { name: "DynamoDB", role: "Per-service NoSQL data store" },
    ],
    nodes: [
      "client",
      "api-gw",
      "alb",
      "svc-order",
      "svc-product",
      "dynamo-o",
      "dynamo-p",
    ],
  },
  grpc: {
    key: "grpc",
    commType: "sync",
    label: "gRPC",
    color: "#22c55e",
    description:
      "Backend API style for service-to-service calls: Protocol Buffers over HTTP/2, contract-first, low-latency, and streaming-friendly.",
    format: "Protobuf",
    coupling: "tight",
    strengths: [
      "~7× smaller payloads than JSON",
      "Strong contract via .proto files",
      "Bidirectional streaming",
      "Code generation in many languages",
    ],
    weaknesses: [
      "Not browser-friendly without proxy",
      "Binary — harder to debug",
      "Tighter service coupling via .proto",
      "Steeper learning curve",
    ],
    awsServices: [
      { name: "ALB (gRPC target)", role: "HTTP/2 gRPC-aware load balancer" },
      { name: "App Mesh", role: "Service mesh — mTLS + discovery" },
      { name: "ECS Fargate", role: "Runs gRPC server containers" },
      { name: "Cloud Map", role: "Service discovery registry" },
    ],
    nodes: [
      "client",
      "alb-grpc",
      "mesh-proxy",
      "svc-order",
      "svc-product",
      "proto-contract",
      "cloud-map",
    ],
  },
  graphql: {
    key: "graphql",
    commType: "sync",
    label: "GraphQL",
    color: "#e535ab",
    description:
      "Client-facing API style with a single endpoint and resolver fan-out behind the scenes.",
    format: "JSON (shaped)",
    coupling: "moderate",
    strengths: [
      "Client controls response shape",
      "Single endpoint for all queries",
      "Eliminates over-fetching",
      "Strong schema with introspection",
    ],
    weaknesses: [
      "Still synchronous request/response",
      "N+1 query risk on server",
      "Complex caching (no URL-based caching)",
      "Query complexity attacks if unguarded",
    ],
    awsServices: [
      { name: "AppSync", role: "Managed GraphQL endpoint + schema" },
      { name: "Lambda", role: "Resolver functions per field" },
      { name: "DynamoDB", role: "Data source for resolvers" },
      { name: "Cognito", role: "Auth for GraphQL operations" },
    ],
    nodes: [
      "client",
      "appsync",
      "resolver-a",
      "resolver-b",
      "dynamo-a",
      "dynamo-b",
      "cognito",
    ],
  },
  amqp: {
    key: "amqp",
    commType: "async",
    label: "AMQP (RabbitMQ)",
    color: "#f59e0b",
    description:
      "Asynchronous messaging via a broker. Producer sends a message to an exchange; exchange routes to queues; consumers pull.",
    format: "JSON / Binary",
    coupling: "loose",
    strengths: [
      "Full decoupling — producer doesn't wait",
      "Built-in retry & dead-letter queues",
      "Load levelling under bursts",
      "Flexible routing (topic, fanout, direct)",
    ],
    weaknesses: [
      "No immediate response to caller",
      "Eventual consistency",
      "Broker is a single point of failure",
      "Harder to trace & debug flows",
    ],
    awsServices: [
      { name: "Amazon MQ", role: "Managed RabbitMQ broker" },
      { name: "ECS Fargate", role: "Producer & consumer containers" },
      { name: "CloudWatch", role: "Queue depth & DLQ monitoring" },
      { name: "SQS (DLQ)", role: "Dead-letter queue for failed messages" },
    ],
    nodes: [
      "client",
      "svc-producer",
      "exchange",
      "queue-a",
      "queue-b",
      "consumer-a",
      "consumer-b",
      "dlq",
    ],
  },
  mqtt: {
    key: "mqtt",
    commType: "async",
    label: "MQTT (AWS IoT Core)",
    color: "#a78bfa",
    description:
      "AWS-native MQTT for IoT fleets: devices keep long-lived MQTT connections to AWS IoT Core, publish telemetry on topics, and let IoT rules, shadows, and downstream AWS services handle cloud-side processing.",
    format: "MQTT packets + JSON payload",
    coupling: "loose",
    strengths: [
      "Excellent for constrained devices and flaky networks",
      "Long-lived bidirectional device-cloud connection",
      "Brokered pub/sub decouples devices from backend services",
      "AWS IoT Core rules and shadows fit telemetry plus command flows",
    ],
    weaknesses: [
      "No replayable log like Kafka",
      "Per-device certs, policies, and topic permissions need governance",
      "Topic design and fleet identity strategy matter a lot",
      "Best for device messaging, not as a general enterprise event bus",
    ],
    awsServices: [
      {
        name: "AWS IoT Core",
        role: "Managed MQTT broker, thing registry, certificates, and policies",
      },
      {
        name: "IoT Rules Engine",
        role: "Routes topic-matched telemetry to downstream AWS services",
      },
      {
        name: "Lambda",
        role: "Transforms, validates, or enriches device messages",
      },
      {
        name: "Timestream",
        role: "Stores time-series telemetry for querying and dashboards",
      },
      {
        name: "Device Shadow",
        role: "Keeps desired and reported state in sync for connected or offline devices",
      },
    ],
    nodes: [
      "iot-device",
      "iot-core",
      "iot-rules",
      "lambda-ingest",
      "timestream",
      "device-shadow",
      "ops-app",
    ],
  },
  kafka: {
    key: "kafka",
    commType: "async",
    label: "Kafka (Event Streaming)",
    color: "#8b5cf6",
    description:
      "Event streaming via an append-only log. Producers publish events; multiple consumer groups replay independently. Persistent.",
    format: "Avro / JSON / Protobuf",
    coupling: "loose",
    strengths: [
      "Persistent event log — full replay",
      "Multiple consumers independently",
      "Massive throughput (millions/sec)",
      "Event sourcing & audit trail",
    ],
    weaknesses: [
      "No immediate response to caller",
      "Operational complexity (Zookeeper/KRaft)",
      "Eventual consistency only",
      "Consumer lag management required",
    ],
    awsServices: [
      { name: "Amazon MSK", role: "Managed Kafka cluster" },
      { name: "MSK Connect", role: "Connectors for sinks/sources" },
      { name: "Lambda (trigger)", role: "Serverless consumer from topic" },
      { name: "S3", role: "Event archive / data lake sink" },
    ],
    nodes: [
      "client",
      "svc-producer",
      "topic-p0",
      "topic-p1",
      "topic-p2",
      "cg-analytics",
      "cg-search",
      "s3-archive",
    ],
  },
};

export const SYNC_PROTOCOLS: ProtocolKey[] = ["http-rest", "grpc", "graphql"];
export const ASYNC_PROTOCOLS: ProtocolKey[] = ["amqp", "mqtt", "kafka"];

/* ── State shape ─────────────────────────────────────── */

export interface MicroserviceCommState extends LabState {
  variant: ProtocolKey;

  /* derived metrics */
  latencyMs: number;
  throughputRps: number;
  coupling: "tight" | "moderate" | "loose";
  payloadSize: string;
  callerBlocked: boolean;
  replayable: boolean;
  serviceDiscovery: boolean;
}

/* ── Metrics model ───────────────────────────────────── */

export function computeMetrics(state: MicroserviceCommState) {
  const profile = VARIANT_PROFILES[state.variant];
  state.coupling = profile.coupling;
  state.callerBlocked = profile.commType === "sync";
  state.serviceDiscovery = profile.commType === "sync";

  switch (state.variant) {
    case "http-rest":
      state.latencyMs = 45;
      state.throughputRps = 8_000;
      state.payloadSize = "~1.2 KB";
      state.replayable = false;
      break;
    case "grpc":
      state.latencyMs = 12;
      state.throughputRps = 28_000;
      state.payloadSize = "~180 B";
      state.replayable = false;
      break;
    case "graphql":
      state.latencyMs = 38;
      state.throughputRps = 6_500;
      state.payloadSize = "~0.8 KB";
      state.replayable = false;
      break;
    case "amqp":
      state.latencyMs = 5;
      state.throughputRps = 35_000;
      state.payloadSize = "~0.5 KB";
      state.replayable = false;
      break;
    case "mqtt":
      state.latencyMs = 3;
      state.throughputRps = 75_000;
      state.payloadSize = "~96 B";
      state.replayable = false;
      break;
    case "kafka":
      state.latencyMs = 8;
      state.throughputRps = 120_000;
      state.payloadSize = "~0.3 KB";
      state.replayable = true;
      break;
  }
}

export const initialState: MicroserviceCommState = {
  variant: "http-rest",
  latencyMs: 45,
  throughputRps: 8_000,
  coupling: "tight",
  payloadSize: "~1.2 KB",
  callerBlocked: true,
  replayable: false,
  serviceDiscovery: true,

  hotZones: [],
  explanation:
    "Choose a communication protocol and step through to see how systems interact. Compare public APIs (REST, GraphQL) with backend APIs (gRPC) and async messaging (AMQP, MQTT, Kafka).",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */

const microserviceCommSlice = createSlice({
  name: "microserviceComm",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState };
      computeMetrics(s);
      return s;
    },
    softResetRun: (state) => {
      state.hotZones = [];
      state.explanation = VARIANT_PROFILES[state.variant].description;
      state.phase = "overview";
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<MicroserviceCommState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setVariant(state, action: PayloadAction<ProtocolKey>) {
      state.variant = action.payload;
      state.hotZones = [];
      state.explanation = VARIANT_PROFILES[action.payload].description;
      state.phase = "overview";
      computeMetrics(state);
    },
  },
});

export const { reset, softResetRun, patchState, recalcMetrics, setVariant } =
  microserviceCommSlice.actions;
export default microserviceCommSlice.reducer;
