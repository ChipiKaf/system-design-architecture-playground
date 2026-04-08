import type { GrpcApiState } from "./grpcApiSlice";
import { VARIANT_PROFILES, type VariantKey } from "./grpcApiSlice";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

export type FlowBeat = GenericFlowBeat<GrpcApiState>;
export type StepDef = GenericStepDef<GrpcApiState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<GrpcApiState>;

const profileFor = (state: GrpcApiState) => VARIANT_PROFILES[state.variant];
const isVariant = (variant: VariantKey) => (state: GrpcApiState) =>
  state.variant === variant;

const isUnary = isVariant("unary-checkout");
const isServerStreaming = isVariant("server-streaming");
const isClientStreaming = isVariant("client-streaming");
const isBidirectional = isVariant("bidirectional-stream");

export function expandToken(token: string, _state: GrpcApiState): string[] {
  return [token];
}

export type StepKey =
  | "overview"
  | "unary-send-request"
  | "unary-route-service"
  | "unary-call-pricing"
  | "unary-call-inventory"
  | "unary-merge-results"
  | "unary-return-response"
  | "stream-send-subscribe"
  | "stream-route-service"
  | "stream-load-event"
  | "stream-push-update-1"
  | "stream-push-update-2"
  | "stream-push-update-3"
  | "stream-close"
  | "client-open-stream"
  | "client-send-chunk-1"
  | "client-send-chunk-2"
  | "client-send-chunk-3"
  | "client-persist-batch"
  | "client-return-summary"
  | "bidi-open-stream"
  | "bidi-client-telemetry-1"
  | "bidi-server-guidance-1"
  | "bidi-client-telemetry-2"
  | "bidi-consult-planner"
  | "bidi-server-guidance-2"
  | "bidi-client-ack"
  | "bidi-close"
  | "summary";

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: (state) => {
      switch (state.variant) {
        case "unary-checkout":
          return "Send Unary RPC";
        case "server-streaming":
          return "Send Subscribe Request";
        case "client-streaming":
          return "Open Upload Stream";
        case "bidirectional-stream":
          return "Open Duplex Stream";
      }
    },
    action: "resetRun",
    finalHotZones: (state) => profileFor(state).activeNodes,
    explain: (state) => {
      const profile = profileFor(state);
      return `${profile.label} - ${profile.description} ${profile.whyGrpc}`;
    },
  },

  {
    key: "unary-send-request",
    label: "Send Unary RPC",
    when: isUnary,
    phase: "request",
    processingText: "Serializing protobuf request...",
    flow: [
      {
        from: "client",
        to: "gateway",
        duration: 700,
        color: "#22c55e",
        explain:
          "The generated client stub serializes QuoteRequest into protobuf and starts one unary RPC over HTTP/2.",
      },
    ],
    finalHotZones: ["client", "gateway", "proto", "deadline-panel"],
    explain:
      "Headers carry auth metadata plus an 80 ms deadline. In gRPC, deadlines and metadata ride alongside the method call instead of being invented ad hoc per endpoint.",
  },
  {
    key: "unary-route-service",
    label: "Route To Order Service",
    when: isUnary,
    phase: "routing",
    processingText: "Forwarding RPC...",
    flow: [
      {
        from: "gateway",
        to: "order-svc",
        duration: 650,
        color: "#22c55e",
        explain:
          "The gateway forwards the RPC to Order Service using the shared .proto contract and generated server bindings.",
      },
    ],
    finalHotZones: ["gateway", "order-svc", "proto"],
    explain:
      "gRPC method names are path-like under the hood, but the application code works with typed stubs instead of manual route strings and JSON serializers.",
  },
  {
    key: "unary-call-pricing",
    label: "Check Pricing",
    when: isUnary,
    phase: "fanout",
    processingText: "Calling Pricing service...",
    flow: [
      {
        from: "order-svc",
        to: "pricing-svc",
        duration: 600,
        color: "#0ea5e9",
        explain:
          "Order Service fans out to Pricing with another unary RPC for the live quote.",
      },
    ],
    finalHotZones: ["order-svc", "pricing-svc"],
    explain:
      "This is where gRPC often wins in microservices: many small internal hops, compact binary payloads, and no hand-written REST glue between every pair of services.",
  },
  {
    key: "unary-call-inventory",
    label: "Reserve Inventory",
    when: isUnary,
    phase: "fanout",
    processingText: "Calling Inventory service...",
    flow: [
      {
        from: "order-svc",
        to: "inventory-svc",
        duration: 600,
        color: "#0ea5e9",
        explain:
          "A second downstream unary RPC checks stock and reserves inventory before the quote can be confirmed.",
      },
    ],
    finalHotZones: ["order-svc", "inventory-svc", "deadline-panel"],
    explain:
      "Because both calls share the same deadline budget, the caller can fail fast instead of waiting on one slow dependency indefinitely.",
  },
  {
    key: "unary-merge-results",
    label: "Merge Dependency Replies",
    when: isUnary,
    phase: "fanout",
    processingText: "Collecting replies...",
    flow: [
      {
        from: "pricing-svc",
        to: "order-svc",
        duration: 500,
        color: "#22c55e",
        explain: "Pricing returns a protobuf reply with the final amount.",
      },
      {
        from: "inventory-svc",
        to: "order-svc",
        duration: 500,
        color: "#22c55e",
        explain: "Inventory returns a typed reservation confirmation.",
      },
    ],
    finalHotZones: ["order-svc", "pricing-svc", "inventory-svc"],
    explain:
      "The caller merges two typed responses instead of parsing loosely structured JSON blobs. That type safety is a major reason teams standardize on gRPC internally.",
  },
  {
    key: "unary-return-response",
    label: "Return Reply + Status",
    when: isUnary,
    phase: "response",
    processingText: "Returning unary response...",
    flow: [
      {
        from: "order-svc",
        to: "gateway",
        duration: 550,
        color: "#22c55e",
        explain: "Order Service returns one QuoteReply message.",
      },
      {
        from: "gateway",
        to: "client",
        duration: 550,
        color: "#22c55e",
        explain:
          "The client receives the reply and gRPC trailers finalize the call.",
      },
    ],
    finalHotZones: ["client", "gateway", "order-svc", "status-panel"],
    explain:
      "Unary RPC is still more than request/response JSON. You also get structured gRPC status codes, trailers, interceptors, retries, and deadline propagation baked into the protocol model.",
  },

  {
    key: "stream-send-subscribe",
    label: "Send Subscribe Request",
    when: isServerStreaming,
    phase: "request",
    processingText: "Opening subscription...",
    flow: [
      {
        from: "client",
        to: "gateway",
        duration: 700,
        color: "#0ea5e9",
        explain:
          "The dashboard sends one WatchShipment request and opens a server-streaming RPC.",
      },
    ],
    finalHotZones: ["client", "gateway", "proto", "deadline-panel"],
    explain:
      "One request now establishes the stream. Polling every few seconds is replaced by a single typed subscription channel.",
  },
  {
    key: "stream-route-service",
    label: "Route To Feed Service",
    when: isServerStreaming,
    phase: "routing",
    processingText: "Binding stream to service...",
    flow: [
      {
        from: "gateway",
        to: "feed-svc",
        duration: 650,
        color: "#0ea5e9",
        explain:
          "The gateway routes the stream to Shipment Feed, which will own the long-lived response channel.",
      },
    ],
    finalHotZones: ["gateway", "feed-svc", "proto"],
    explain:
      "The same .proto contract defines both the subscription request and every streamed response message that may follow.",
  },
  {
    key: "stream-load-event",
    label: "Read Fresh Event",
    when: isServerStreaming,
    phase: "streaming",
    processingText: "Loading next event...",
    flow: [
      {
        from: "event-source",
        to: "feed-svc",
        duration: 550,
        color: "#f59e0b",
        explain:
          "The feed service consumes the latest shipment event before pushing it to the subscriber.",
      },
    ],
    finalHotZones: ["event-source", "feed-svc"],
    explain:
      "Server streaming does not invent the data source. It simply keeps the client channel open so new domain events can be forwarded immediately.",
  },
  {
    key: "stream-push-update-1",
    label: "Push Update: PICKED",
    when: isServerStreaming,
    phase: "streaming",
    processingText: "Streaming update...",
    flow: [
      {
        from: "feed-svc",
        to: "gateway",
        duration: 500,
        color: "#0ea5e9",
        explain: "Shipment Feed emits the first ShipmentUpdate message.",
      },
      {
        from: "gateway",
        to: "client",
        duration: 500,
        color: "#0ea5e9",
        explain: "The client receives state=PICKED with the latest ETA.",
      },
    ],
    finalHotZones: ["client", "gateway", "feed-svc"],
    explain:
      "One RPC, first pushed response. This is why gRPC streaming is attractive for dashboards and progress indicators: updates arrive when the server has something real to say.",
  },
  {
    key: "stream-push-update-2",
    label: "Push Update: OUT_FOR_DELIVERY",
    when: isServerStreaming,
    phase: "streaming",
    processingText: "Streaming update...",
    flow: [
      {
        from: "feed-svc",
        to: "gateway",
        duration: 500,
        color: "#0ea5e9",
        explain: "A second ShipmentUpdate arrives on the same open stream.",
      },
      {
        from: "gateway",
        to: "client",
        duration: 500,
        color: "#0ea5e9",
        explain:
          "The dashboard updates to state=OUT_FOR_DELIVERY without opening a new request.",
      },
    ],
    finalHotZones: ["client", "gateway", "feed-svc"],
    explain:
      "No new handshake, no repeated polling headers, no client fan-out loop. The stream stays warm and pushes the next typed event.",
  },
  {
    key: "stream-push-update-3",
    label: "Push Update: DELIVERED",
    when: isServerStreaming,
    phase: "streaming",
    processingText: "Streaming update...",
    flow: [
      {
        from: "feed-svc",
        to: "gateway",
        duration: 500,
        color: "#22c55e",
        explain:
          "The final ShipmentUpdate is produced when delivery completes.",
      },
      {
        from: "gateway",
        to: "client",
        duration: 500,
        color: "#22c55e",
        explain:
          "The dashboard receives state=DELIVERED as the last pushed message.",
      },
    ],
    finalHotZones: ["client", "gateway", "feed-svc", "status-panel"],
    explain:
      "Every streamed message still uses the same protobuf schema, which keeps the push channel explicit and versionable.",
  },
  {
    key: "stream-close",
    label: "Close Stream With Trailers",
    when: isServerStreaming,
    phase: "close",
    processingText: "Closing stream...",
    flow: [
      {
        from: "feed-svc",
        to: "gateway",
        duration: 450,
        color: "#22c55e",
        explain: "The server half-closes after the final event.",
      },
      {
        from: "gateway",
        to: "client",
        duration: 450,
        color: "#22c55e",
        explain:
          "Trailers carry the final OK status and end the stream cleanly.",
      },
    ],
    finalHotZones: ["client", "gateway", "status-panel"],
    explain:
      "Server streaming is ideal when the server owns event timing. You get push delivery, typed messages, and explicit end-of-stream semantics without inventing a custom socket protocol.",
  },

  {
    key: "client-open-stream",
    label: "Open Upload Stream",
    when: isClientStreaming,
    phase: "request",
    processingText: "Opening client stream...",
    flow: [
      {
        from: "client",
        to: "gateway",
        duration: 600,
        color: "#f59e0b",
        explain:
          "The edge device opens one UploadTelemetry client-streaming RPC.",
      },
      {
        from: "gateway",
        to: "ingest-svc",
        duration: 600,
        color: "#f59e0b",
        explain: "The gateway binds that stream to the ingest service.",
      },
    ],
    finalHotZones: [
      "client",
      "gateway",
      "ingest-svc",
      "proto",
      "deadline-panel",
    ],
    explain:
      "Client streaming is useful when one logical operation needs many small messages. You pay the stream setup cost once, then keep sending chunks.",
  },
  {
    key: "client-send-chunk-1",
    label: "Send Chunk 1",
    when: isClientStreaming,
    phase: "streaming",
    processingText: "Uploading chunk...",
    flow: [
      {
        from: "client",
        to: "gateway",
        duration: 450,
        color: "#f59e0b",
        explain:
          "Chunk 1 enters the stream as a TelemetryChunk protobuf message.",
      },
      {
        from: "gateway",
        to: "ingest-svc",
        duration: 450,
        color: "#f59e0b",
        explain: "The same open stream forwards the chunk to ingest.",
      },
    ],
    finalHotZones: ["client", "gateway", "ingest-svc"],
    explain:
      "No new request object is created per chunk. The client just writes the next typed message into the already-open stream.",
  },
  {
    key: "client-send-chunk-2",
    label: "Send Chunk 2",
    when: isClientStreaming,
    phase: "streaming",
    processingText: "Uploading chunk...",
    flow: [
      {
        from: "client",
        to: "gateway",
        duration: 450,
        color: "#f59e0b",
        explain:
          "Chunk 2 follows immediately without another HTTP request boundary.",
      },
      {
        from: "gateway",
        to: "ingest-svc",
        duration: 450,
        color: "#f59e0b",
        explain:
          "The gateway simply forwards the next frame on the existing stream.",
      },
    ],
    finalHotZones: ["client", "gateway", "ingest-svc"],
    explain:
      "This pattern is much cleaner than firing many tiny POST requests when the backend really wants one batched ingestion workflow.",
  },
  {
    key: "client-send-chunk-3",
    label: "Send Chunk 3",
    when: isClientStreaming,
    phase: "streaming",
    processingText: "Uploading chunk...",
    flow: [
      {
        from: "client",
        to: "gateway",
        duration: 450,
        color: "#f59e0b",
        explain: "Chunk 3 completes the upload window.",
      },
      {
        from: "gateway",
        to: "ingest-svc",
        duration: 450,
        color: "#f59e0b",
        explain: "Ingest now has the full chunk sequence and can aggregate it.",
      },
    ],
    finalHotZones: ["client", "gateway", "ingest-svc", "status-panel"],
    explain:
      "The client closes its write side after the final chunk. Only then does the server compute the overall result.",
  },
  {
    key: "client-persist-batch",
    label: "Persist Aggregated Batch",
    when: isClientStreaming,
    phase: "aggregate",
    processingText: "Aggregating batch...",
    flow: [
      {
        from: "ingest-svc",
        to: "warehouse",
        duration: 600,
        color: "#0ea5e9",
        explain:
          "The ingest service validates, compresses, and persists the batched telemetry.",
      },
    ],
    finalHotZones: ["ingest-svc", "warehouse"],
    explain:
      "Client streaming lets the server delay work until it has the complete set of messages. That often simplifies validation, compression, and batch writes.",
  },
  {
    key: "client-return-summary",
    label: "Return Upload Summary",
    when: isClientStreaming,
    phase: "response",
    processingText: "Returning batch summary...",
    flow: [
      {
        from: "ingest-svc",
        to: "gateway",
        duration: 500,
        color: "#22c55e",
        explain:
          "The server emits one UploadSummary after processing the full stream.",
      },
      {
        from: "gateway",
        to: "client",
        duration: 500,
        color: "#22c55e",
        explain:
          "The device receives the acknowledgement and final status trailers.",
      },
    ],
    finalHotZones: ["client", "gateway", "ingest-svc", "status-panel"],
    explain:
      "This is why teams use client streaming for ingestion: many messages upstream, one clear typed result downstream, and less per-message protocol overhead.",
  },

  {
    key: "bidi-open-stream",
    label: "Open Duplex Stream",
    when: isBidirectional,
    phase: "request",
    processingText: "Opening bidirectional stream...",
    flow: [
      {
        from: "client",
        to: "gateway",
        duration: 600,
        color: "#a855f7",
        explain: "The dispatch console opens one bidirectional SyncRoute RPC.",
      },
      {
        from: "gateway",
        to: "route-svc",
        duration: 600,
        color: "#a855f7",
        explain:
          "The routing service accepts the duplex channel and keeps it open.",
      },
    ],
    finalHotZones: [
      "client",
      "gateway",
      "route-svc",
      "proto",
      "deadline-panel",
    ],
    explain:
      "After the initial headers, both sides can write independently. That is the core difference from classic request/response APIs.",
  },
  {
    key: "bidi-client-telemetry-1",
    label: "Client Streams Telemetry",
    when: isBidirectional,
    phase: "streaming",
    processingText: "Streaming client update...",
    flow: [
      {
        from: "client",
        to: "gateway",
        duration: 450,
        color: "#a855f7",
        explain:
          "The client writes a fresh telemetry envelope into the open stream.",
      },
      {
        from: "gateway",
        to: "route-svc",
        duration: 450,
        color: "#a855f7",
        explain:
          "The gateway forwards that message without reopening the call.",
      },
    ],
    finalHotZones: ["client", "gateway", "route-svc"],
    explain:
      "A bidirectional stream is conversational. The client does not need to wait for a response before sending the next relevant update.",
  },
  {
    key: "bidi-server-guidance-1",
    label: "Server Streams Guidance",
    when: isBidirectional,
    phase: "streaming",
    processingText: "Streaming server guidance...",
    flow: [
      {
        from: "route-svc",
        to: "gateway",
        duration: 450,
        color: "#22c55e",
        explain:
          "Routing Service immediately streams guidance back on the same channel.",
      },
      {
        from: "gateway",
        to: "client",
        duration: 450,
        color: "#22c55e",
        explain:
          "The client receives a typed reroute instruction while the stream remains open.",
      },
    ],
    finalHotZones: ["client", "gateway", "route-svc"],
    explain:
      "This is full duplex rather than turn-based request/response. Either side can speak whenever it has data.",
  },
  {
    key: "bidi-client-telemetry-2",
    label: "Client Sends Delta",
    when: isBidirectional,
    phase: "streaming",
    processingText: "Streaming client delta...",
    flow: [
      {
        from: "client",
        to: "gateway",
        duration: 450,
        color: "#a855f7",
        explain:
          "The client sends another telemetry delta with updated position and speed.",
      },
      {
        from: "gateway",
        to: "route-svc",
        duration: 450,
        color: "#a855f7",
        explain:
          "The second client message enters the same open stream context.",
      },
    ],
    finalHotZones: ["client", "gateway", "route-svc", "deadline-panel"],
    explain:
      "Because the stream stays open, the protocol is efficient enough for control loops and interactive systems where state changes quickly.",
  },
  {
    key: "bidi-consult-planner",
    label: "Consult Planner Service",
    when: isBidirectional,
    phase: "fanout",
    processingText: "Recomputing route...",
    flow: [
      {
        from: "route-svc",
        to: "planner-svc",
        duration: 550,
        color: "#0ea5e9",
        explain:
          "Routing Service fans out internally to Planner for a fresh recommendation.",
      },
      {
        from: "planner-svc",
        to: "route-svc",
        duration: 550,
        color: "#22c55e",
        explain: "Planner returns the updated route envelope.",
      },
    ],
    finalHotZones: ["route-svc", "planner-svc"],
    explain:
      "gRPC still works well behind the scenes of a streaming workflow. A streaming edge conversation can fan out into unary internal RPCs and stay strongly typed end to end.",
  },
  {
    key: "bidi-server-guidance-2",
    label: "Server Streams Reroute",
    when: isBidirectional,
    phase: "streaming",
    processingText: "Streaming reroute...",
    flow: [
      {
        from: "route-svc",
        to: "gateway",
        duration: 450,
        color: "#22c55e",
        explain:
          "The routing service writes the recalculated path back into the stream.",
      },
      {
        from: "gateway",
        to: "client",
        duration: 450,
        color: "#22c55e",
        explain: "The dispatch console receives the reroute immediately.",
      },
    ],
    finalHotZones: ["client", "gateway", "route-svc", "planner-svc"],
    explain:
      "Bidirectional streaming shines when the conversation itself is the product: chat, collaboration, remote control, multiplayer state sync, and similar real-time loops.",
  },
  {
    key: "bidi-client-ack",
    label: "Client ACKs Update",
    when: isBidirectional,
    phase: "streaming",
    processingText: "Sending acknowledgement...",
    flow: [
      {
        from: "client",
        to: "gateway",
        duration: 450,
        color: "#a855f7",
        explain:
          "The client acknowledges the new route while keeping the stream alive.",
      },
      {
        from: "gateway",
        to: "route-svc",
        duration: 450,
        color: "#a855f7",
        explain:
          "The server updates its stream-local state without a new call.",
      },
    ],
    finalHotZones: ["client", "gateway", "route-svc"],
    explain:
      "A single stream now carries commands, telemetry, acknowledgements, and server guidance. That is difficult to model cleanly with plain REST endpoints.",
  },
  {
    key: "bidi-close",
    label: "Close Stream Cleanly",
    when: isBidirectional,
    phase: "close",
    processingText: "Closing duplex stream...",
    flow: [
      {
        from: "route-svc",
        to: "gateway",
        duration: 450,
        color: "#22c55e",
        explain: "The server half-closes after the exchange is complete.",
      },
      {
        from: "gateway",
        to: "client",
        duration: 450,
        color: "#22c55e",
        explain: "Final trailers propagate the terminal gRPC status.",
      },
    ],
    finalHotZones: ["client", "gateway", "status-panel"],
    explain:
      "The duplex stream ends explicitly with trailers and status. Even long-lived conversational channels still keep strong protocol boundaries and clear completion semantics.",
  },

  {
    key: "summary",
    label: "Why Teams Choose gRPC",
    phase: "summary",
    finalHotZones: (state) => profileFor(state).activeNodes,
    explain: (state) => {
      const profile = profileFor(state);
      return `${profile.useCase} ${profile.whyGrpc} Primary trade-off: ${profile.tradeoffs[0]}`;
    },
  },
];

export function buildSteps(state: GrpcApiState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
