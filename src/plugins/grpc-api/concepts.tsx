import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "grpc"
  | "protobuf"
  | "http2"
  | "rpc-types"
  | "streaming"
  | "deadlines"
  | "metadata"
  | "codegen"
  | "status-trailers";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  grpc: {
    title: "gRPC",
    subtitle: "A high-performance RPC framework built on protobuf and HTTP/2",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Why teams use it",
        accent: "#22c55e",
        content: (
          <>
            <p>
              gRPC is a remote procedure call framework that uses
              <strong> protobuf</strong> as the interface definition language
              and <strong>HTTP/2</strong> as the transport. Instead of
              hand-building JSON endpoints, teams define a service contract once
              and generate typed clients and servers from it.
            </p>
            <p style={{ marginTop: 8 }}>
              It is especially strong for{" "}
              <strong>internal microservice communication</strong>
              where low latency, strict contracts, and streaming matter more
              than human-readable payloads.
            </p>
          </>
        ),
      },
      {
        title: "When it fits best",
        accent: "#0ea5e9",
        content: (
          <ul>
            <li>High-throughput service-to-service APIs inside a platform.</li>
            <li>
              Real-time streaming use cases such as live status, telemetry, or
              chat.
            </li>
            <li>
              Polyglot teams that want generated stubs instead of
              hand-maintained clients.
            </li>
          </ul>
        ),
      },
    ],
  },
  protobuf: {
    title: "Protocol Buffers",
    subtitle: "The schema language and binary message format behind gRPC",
    accentColor: "#0ea5e9",
    sections: [
      {
        title: "What protobuf gives you",
        accent: "#0ea5e9",
        content: (
          <ul>
            <li>
              Compact binary payloads that are smaller than typical JSON bodies.
            </li>
            <li>
              Field numbers and schemas that support forward-compatible
              evolution.
            </li>
            <li>
              Generated types for many languages from the same .proto file.
            </li>
          </ul>
        ),
      },
      {
        title: "Trade-off",
        accent: "#38bdf8",
        content: (
          <p>
            Binary messages are efficient but not human-readable on the wire.
            Teams usually pair gRPC with tooling, logging helpers, or JSON edge
            gateways when developer ergonomics matter at the boundary.
          </p>
        ),
      },
    ],
  },
  http2: {
    title: "HTTP/2 Transport",
    subtitle:
      "Multiplexed streams, header compression, and one warm connection",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "Why transport matters",
        accent: "#14b8a6",
        content: (
          <ul>
            <li>Multiple RPC streams can share one TCP connection.</li>
            <li>
              Headers are compressed, which reduces repeated metadata cost.
            </li>
            <li>
              Flow control helps streaming workloads avoid uncontrolled
              flooding.
            </li>
          </ul>
        ),
      },
      {
        title: "Operational note",
        accent: "#2dd4bf",
        content: (
          <p>
            Proxies and load balancers must genuinely support HTTP/2 end to end.
            If the infrastructure downgrades or mishandles streams, the benefits
            of gRPC shrink quickly.
          </p>
        ),
      },
    ],
  },
  "rpc-types": {
    title: "Four RPC Shapes",
    subtitle:
      "Unary, server streaming, client streaming, and bidirectional streaming",
    accentColor: "#a855f7",
    sections: [
      {
        title: "The four shapes",
        accent: "#a855f7",
        content: (
          <ul>
            <li>
              <strong>Unary</strong> - 1 request, 1 response.
            </li>
            <li>
              <strong>Server streaming</strong> - 1 request, many responses.
            </li>
            <li>
              <strong>Client streaming</strong> - many requests, 1 response.
            </li>
            <li>
              <strong>Bidirectional streaming</strong> - many requests and many
              responses on the same stream.
            </li>
          </ul>
        ),
      },
      {
        title: "Why it is powerful",
        accent: "#c084fc",
        content: (
          <p>
            Most HTTP APIs naturally model unary request/response. gRPC gives
            you the other three communication patterns as first-class protocol
            concepts instead of forcing you to simulate them with polling,
            batching hacks, or custom socket protocols.
          </p>
        ),
      },
    ],
  },
  streaming: {
    title: "Streaming",
    subtitle: "Long-lived typed channels for live updates and batch flows",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Server and client streaming",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Server streaming is excellent when the server owns event timing.
              Client streaming is ideal when the caller needs to send many
              messages that belong to one logical operation.
            </p>
            <p style={{ marginTop: 8 }}>
              Bidirectional streaming goes further and keeps the channel open in
              both directions so each side can write whenever it has data.
            </p>
          </>
        ),
      },
      {
        title: "Design caution",
        accent: "#fb923c",
        content: (
          <p>
            Streaming APIs need explicit backpressure, cancellation, reconnect,
            and ordering rules. The transport helps, but the application
            protocol still has to be designed carefully.
          </p>
        ),
      },
    ],
  },
  deadlines: {
    title: "Deadlines and Cancellation",
    subtitle: "Fail fast instead of waiting forever on slow dependencies",
    accentColor: "#ef4444",
    sections: [
      {
        title: "Why deadlines matter",
        accent: "#ef4444",
        content: (
          <ul>
            <li>Every RPC can carry a max time budget.</li>
            <li>Upstream services can propagate that budget downstream.</li>
            <li>
              Slow or stuck dependencies fail fast instead of consuming threads
              indefinitely.
            </li>
          </ul>
        ),
      },
      {
        title: "Related status codes",
        accent: "#f97316",
        content: (
          <p>
            gRPC uses explicit status outcomes such as <code>OK</code>,
            <code> UNAVAILABLE</code>, <code>DEADLINE_EXCEEDED</code>, and
            <code> CANCELLED</code>. Those outcomes are part of the protocol
            model, not just application-specific JSON fields.
          </p>
        ),
      },
    ],
  },
  metadata: {
    title: "Metadata",
    subtitle: "Headers and key-value context around the protobuf payload",
    accentColor: "#22c55e",
    sections: [
      {
        title: "What belongs in metadata",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Authentication tokens and service identity.</li>
            <li>Correlation IDs for tracing and observability.</li>
            <li>
              Locale, tenancy, routing hints, or request-scoped policy flags.
            </li>
          </ul>
        ),
      },
      {
        title: "Why separate it from the message",
        accent: "#16a34a",
        content: (
          <p>
            Metadata keeps transport- and call-level concerns outside the domain
            protobuf message. That separation makes interceptors, auth
            middleware, and tracing much cleaner.
          </p>
        ),
      },
    ],
  },
  codegen: {
    title: "Code Generation",
    subtitle: "One schema, many languages, fewer handwritten clients",
    accentColor: "#6366f1",
    sections: [
      {
        title: "Why generated stubs matter",
        accent: "#6366f1",
        content: (
          <ul>
            <li>
              Clients call typed methods instead of manually constructing URLs.
            </li>
            <li>
              Servers implement a generated interface that matches the contract
              exactly.
            </li>
            <li>
              Polyglot teams stay aligned from the same .proto source of truth.
            </li>
          </ul>
        ),
      },
      {
        title: "Governance requirement",
        accent: "#818cf8",
        content: (
          <p>
            Code generation is only a win if schema ownership is disciplined.
            Breaking field changes or uncontrolled proto sprawl can become as
            painful as unmanaged REST contracts.
          </p>
        ),
      },
    ],
  },
  "status-trailers": {
    title: "Status and Trailers",
    subtitle: "How a gRPC call finishes and communicates outcome",
    accentColor: "#94a3b8",
    sections: [
      {
        title: "End-of-call semantics",
        accent: "#94a3b8",
        content: (
          <ul>
            <li>Unary RPCs end after the reply plus trailers.</li>
            <li>
              Streaming RPCs end when one side closes and trailers carry the
              final status.
            </li>
            <li>
              Status is explicit and machine-readable, not inferred from an
              arbitrary payload shape.
            </li>
          </ul>
        ),
      },
      {
        title: "Why this helps",
        accent: "#cbd5e1",
        content: (
          <p>
            Retries, observability, and operational handling become more
            consistent when every call ends with a standard status model instead
            of a custom application-level success flag.
          </p>
        ),
      },
    ],
  },
};
