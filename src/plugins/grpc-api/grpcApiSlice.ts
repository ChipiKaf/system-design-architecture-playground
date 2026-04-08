import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";

export type VariantKey =
  | "unary-checkout"
  | "server-streaming"
  | "client-streaming"
  | "bidirectional-stream";

export type RpcType =
  | "Unary"
  | "Server Streaming"
  | "Client Streaming"
  | "Bidirectional Streaming";

export interface VariantProfile {
  key: VariantKey;
  label: string;
  color: string;
  description: string;
  rpcType: RpcType;
  useCase: string;
  whyGrpc: string;
  requestPreview: string;
  responsePreview: string;
  servicesTouched: number;
  latencyMs: number;
  payloadKb: number;
  deadlineMs: number;
  messagesOnWire: number;
  streamPattern: string;
  connectionModel: string;
  statusModel: string;
  strengths: string[];
  tradeoffs: string[];
  activeNodes: string[];
}

export const VARIANT_PROFILES: Record<VariantKey, VariantProfile> = {
  "unary-checkout": {
    key: "unary-checkout",
    label: "Unary Checkout",
    color: "#22c55e",
    description:
      "Classic request/response gRPC. A checkout quote request hits the Order service, which fans out to Pricing and Inventory, then replies once.",
    rpcType: "Unary",
    useCase:
      "Best for latency-sensitive service-to-service APIs such as checkout, fraud checks, personalization, and internal control planes.",
    whyGrpc:
      "Teams choose unary gRPC for compact protobuf payloads, generated client/server stubs, strict contracts, deadline-aware calls, and reusable HTTP/2 connections across many internal RPCs.",
    requestPreview: [
      "service CheckoutService {",
      "  rpc QuoteCheckout(QuoteRequest) returns (QuoteReply);",
      "}",
      "",
      "QuoteRequest {",
      '  cart_id: "cart-42"',
      '  currency: "USD"',
      "}",
    ].join("\n"),
    responsePreview: [
      "QuoteReply {",
      '  quote_id: "q-8a1"',
      "  total_cents: 14990",
      "  inventory_reserved: true",
      "}",
    ].join("\n"),
    servicesTouched: 3,
    latencyMs: 18,
    payloadKb: 0.9,
    deadlineMs: 80,
    messagesOnWire: 2,
    streamPattern: "1 request -> 1 response",
    connectionModel:
      "One short-lived RPC stream on a reused HTTP/2 connection.",
    statusModel: "Headers, one reply message, then trailers(status=OK).",
    strengths: [
      "Fast binary payloads for internal microservice hops",
      "Generated stubs keep client and server contracts aligned",
      "Deadlines and interceptors are built into the call model",
    ],
    tradeoffs: [
      "Browsers usually need gRPC-Web or a JSON edge gateway",
      "Binary payloads are less human-readable than JSON",
      "Protocol changes require disciplined schema governance",
    ],
    activeNodes: [
      "client",
      "gateway",
      "order-svc",
      "pricing-svc",
      "inventory-svc",
      "proto",
      "deadline-panel",
      "status-panel",
    ],
  },
  "server-streaming": {
    key: "server-streaming",
    label: "Server Streaming",
    color: "#0ea5e9",
    description:
      "A dashboard subscribes once and receives many typed ShipmentUpdate messages over the same RPC stream.",
    rpcType: "Server Streaming",
    useCase:
      "Ideal for live order progress, market feeds, operational dashboards, notifications, and any workflow where the server should push updates without polling.",
    whyGrpc:
      "Server streaming removes polling overhead. One request opens a typed push channel, the server emits updates as state changes, and HTTP/2 flow control keeps the stream efficient.",
    requestPreview: [
      "service ShipmentFeed {",
      "  rpc WatchShipment(WatchRequest) returns (stream ShipmentUpdate);",
      "}",
      "",
      "WatchRequest {",
      '  shipment_id: "ship-204"',
      "}",
    ].join("\n"),
    responsePreview: [
      'ShipmentUpdate { state: "PICKED", eta_sec: 1800 }',
      'ShipmentUpdate { state: "OUT_FOR_DELIVERY", eta_sec: 900 }',
      'ShipmentUpdate { state: "DELIVERED", eta_sec: 0 }',
    ].join("\n"),
    servicesTouched: 2,
    latencyMs: 12,
    payloadKb: 2.4,
    deadlineMs: 30000,
    messagesOnWire: 4,
    streamPattern: "1 request -> N responses",
    connectionModel:
      "One open HTTP/2 stream carries the initial request plus every pushed update.",
    statusModel: "Trailers close the stream after the final update.",
    strengths: [
      "Great fit for live progress without repeated polling",
      "Every update is typed and versioned through the same schema",
      "Backpressure and flow control stay on the transport",
    ],
    tradeoffs: [
      "Long-lived streams need timeout and reconnect strategy",
      "Intermediate proxies must support HTTP/2 correctly",
      "Operational visibility is harder than plain request/response logs",
    ],
    activeNodes: [
      "client",
      "gateway",
      "feed-svc",
      "event-source",
      "proto",
      "deadline-panel",
      "status-panel",
    ],
  },
  "client-streaming": {
    key: "client-streaming",
    label: "Client Streaming",
    color: "#f59e0b",
    description:
      "An edge device uploads multiple telemetry chunks and receives one summarized acknowledgement when it closes the stream.",
    rpcType: "Client Streaming",
    useCase:
      "Useful for batched ingestion from mobile apps, IoT devices, analytics collectors, or any producer sending many small messages to one backend operation.",
    whyGrpc:
      "Client streaming amortizes headers across many messages, keeps one schema for the batch, and lets the server aggregate work before replying once with a typed summary.",
    requestPreview: [
      "service TelemetryIngest {",
      "  rpc UploadTelemetry(stream TelemetryChunk) returns (UploadSummary);",
      "}",
      "",
      "TelemetryChunk {",
      "  sequence: 1",
      "  payload_bytes: 512",
      "}",
    ].join("\n"),
    responsePreview: [
      "UploadSummary {",
      "  accepted_chunks: 3",
      "  compressed_kb: 5.4",
      "  window_closed: true",
      "}",
    ].join("\n"),
    servicesTouched: 2,
    latencyMs: 24,
    payloadKb: 5.4,
    deadlineMs: 5000,
    messagesOnWire: 4,
    streamPattern: "N requests -> 1 response",
    connectionModel:
      "One stream stays open while the client pushes a sequence of chunks.",
    statusModel:
      "The server replies once after client close, then returns trailers.",
    strengths: [
      "Removes per-request header overhead for batched uploads",
      "Lets the server validate and aggregate before acknowledging",
      "Keeps many small chunks inside one typed streaming session",
    ],
    tradeoffs: [
      "Call semantics are less intuitive than plain POST uploads",
      "Partial failures need explicit application-level handling",
      "Observability must track streams, not just discrete requests",
    ],
    activeNodes: [
      "client",
      "gateway",
      "ingest-svc",
      "warehouse",
      "proto",
      "deadline-panel",
      "status-panel",
    ],
  },
  "bidirectional-stream": {
    key: "bidirectional-stream",
    label: "Bidirectional Streaming",
    color: "#a855f7",
    description:
      "A dispatch console and routing service exchange telemetry and guidance independently over one duplex stream.",
    rpcType: "Bidirectional Streaming",
    useCase:
      "Best for chat, gaming, collaborative tools, remote operations, and real-time control loops where both sides need to talk whenever they have data.",
    whyGrpc:
      "Bidirectional streaming is where gRPC stands out most. Both sides send messages independently on one HTTP/2 stream without reopening request/response pairs.",
    requestPreview: [
      "service RouteSync {",
      "  rpc SyncRoute(stream RouteEnvelope) returns (stream RouteEnvelope);",
      "}",
      "",
      'client -> { vehicle_id: "van-7", position: "12.3,44.9" }',
      'server -> { reroute_to: "dock-3", congestion: "high" }',
    ].join("\n"),
    responsePreview: [
      "client -> { speed_kph: 42, blocked_lane: false }",
      'server -> { reroute_to: "dock-3", eta_sec: 480 }',
      'server -> { caution: "loading-bay busy" }',
    ].join("\n"),
    servicesTouched: 2,
    latencyMs: 16,
    payloadKb: 3.1,
    deadlineMs: 15000,
    messagesOnWire: 6,
    streamPattern: "N requests <-> N responses",
    connectionModel:
      "One duplex stream lets client and server write whenever they have data.",
    statusModel: "Either side can half-close; trailers finalize the session.",
    strengths: [
      "Best fit for conversational or control-loop protocols",
      "Eliminates repeated handshake and request allocation",
      "Keeps both directions typed on the same contract",
    ],
    tradeoffs: [
      "Application state machines become more complex",
      "Ordering and cancellation rules need careful design",
      "Debugging concurrent streams is harder than unary RPC",
    ],
    activeNodes: [
      "client",
      "gateway",
      "route-svc",
      "planner-svc",
      "proto",
      "deadline-panel",
      "status-panel",
    ],
  },
};

export const VARIANT_KEYS = Object.keys(VARIANT_PROFILES) as VariantKey[];

export interface GrpcApiState extends LabState {
  variant: VariantKey;
  rpcType: RpcType;
  latencyMs: number;
  payloadKb: number;
  servicesTouched: number;
  deadlineMs: number;
  messagesOnWire: number;
  streamPattern: string;
  connectionModel: string;
  statusModel: string;
}

const overviewExplanation = (variant: VariantKey) => {
  const profile = VARIANT_PROFILES[variant];
  return `${profile.label} - ${profile.description} ${profile.whyGrpc}`;
};

export function computeMetrics(state: GrpcApiState) {
  const profile = VARIANT_PROFILES[state.variant];
  state.rpcType = profile.rpcType;
  state.latencyMs = profile.latencyMs;
  state.payloadKb = profile.payloadKb;
  state.servicesTouched = profile.servicesTouched;
  state.deadlineMs = profile.deadlineMs;
  state.messagesOnWire = profile.messagesOnWire;
  state.streamPattern = profile.streamPattern;
  state.connectionModel = profile.connectionModel;
  state.statusModel = profile.statusModel;
}

export const initialState: GrpcApiState = {
  variant: "unary-checkout",
  rpcType: "Unary",
  latencyMs: 18,
  payloadKb: 0.9,
  servicesTouched: 3,
  deadlineMs: 80,
  messagesOnWire: 2,
  streamPattern: "1 request -> 1 response",
  connectionModel: "One short-lived RPC stream on a reused HTTP/2 connection.",
  statusModel: "Headers, one reply message, then trailers(status=OK).",

  hotZones: [],
  explanation: overviewExplanation("unary-checkout"),
  phase: "overview",
};

computeMetrics(initialState);

const grpcApiSlice = createSlice({
  name: "grpcApi",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState };
      computeMetrics(s);
      return s;
    },
    softResetRun: (state) => {
      state.hotZones = [];
      state.explanation = overviewExplanation(state.variant);
      state.phase = "overview";
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<GrpcApiState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setVariant(state, action: PayloadAction<VariantKey>) {
      state.variant = action.payload;
      state.hotZones = [];
      state.explanation = overviewExplanation(action.payload);
      state.phase = "overview";
      computeMetrics(state);
    },
  },
});

export const { reset, softResetRun, patchState, recalcMetrics, setVariant } =
  grpcApiSlice.actions;
export default grpcApiSlice.reducer;
