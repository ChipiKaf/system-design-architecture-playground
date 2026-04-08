import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "sync-vs-async"
  | "public-vs-backend-api"
  | "api-gateway"
  | "http-rest"
  | "grpc"
  | "graphql"
  | "amqp"
  | "kafka"
  | "service-discovery"
  | "serialization"
  | "temporal-coupling";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "sync-vs-async": {
    title: "Synchronous vs Asynchronous",
    subtitle: "The fundamental communication paradigm choice",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "Synchronous (Request/Response)",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              The caller sends a request and <strong>waits (blocks)</strong>{" "}
              until the response arrives. Like a phone call — you ask and wait
              for an answer.
            </p>
            <ul style={{ marginTop: 8 }}>
              <li>Public APIs: HTTP/REST, GraphQL</li>
              <li>Backend APIs: gRPC, internal HTTP</li>
              <li>Simple mental model — direct call and result</li>
              <li>
                Trade-off: temporal coupling, cascading failures, caller blocked
              </li>
            </ul>
          </>
        ),
      },
      {
        title: "Asynchronous (Event-Driven)",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              The caller sends a message/event and{" "}
              <strong>does not wait</strong> for a response. Like leaving a
              voicemail — you send and move on.
            </p>
            <ul style={{ marginTop: 8 }}>
              <li>Protocols: AMQP (RabbitMQ), Kafka, MQTT</li>
              <li>Decoupled services — producer and consumer independent</li>
              <li>
                Trade-off: eventual consistency, harder debugging, no immediate
                result
              </li>
            </ul>
          </>
        ),
      },
    ],
  },

  "public-vs-backend-api": {
    title: "Public APIs vs Backend APIs",
    subtitle: "Two synchronous API surfaces with different goals",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "Public APIs",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              Public APIs are the edge-facing APIs consumed by browser apps,
              mobile clients, partners, or third-party developers. They need to
              be easy to discover, easy to debug, and stable over time.
            </p>
            <ul style={{ marginTop: 8 }}>
              <li>Usually exposed through API Gateway or ALB</li>
              <li>Commonly use REST over HTTP with JSON payloads</li>
              <li>Optimized for compatibility and human readability</li>
            </ul>
          </>
        ),
      },
      {
        title: "Backend APIs",
        accent: "#22c55e",
        content: (
          <>
            <p>
              Backend APIs are service-to-service calls inside the microservice
              boundary. Here, payload size, serialization cost, and latency are
              usually more important than human readability.
            </p>
            <ul style={{ marginTop: 8 }}>
              <li>Often use gRPC over HTTP/2 with Protobuf</li>
              <li>Strong contracts matter more than ad-hoc flexibility</li>
              <li>Designed for throughput, not for direct end-user access</li>
            </ul>
          </>
        ),
      },
      {
        title: "Rule of thumb",
        accent: "#60a5fa",
        content: (
          <ul>
            <li>Public = optimize for client experience.</li>
            <li>Backend = optimize for service-to-service efficiency.</li>
            <li>Pick the wire format for the audience, not the diagram.</li>
          </ul>
        ),
      },
    ],
  },

  "api-gateway": {
    title: "API Gateway",
    subtitle: "One front door for public traffic",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What it does",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              API Gateway sits in front of public APIs and handles the concerns
              you do not want to duplicate in every service: auth, throttling,
              TLS termination, request shaping, and routing.
            </p>
            <p style={{ marginTop: 8 }}>
              In AWS, API Gateway is a common entry point for REST APIs, while
              ALB often routes traffic to the backend services behind it.
            </p>
          </>
        ),
      },
      {
        title: "Why it matters",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>
              Client apps see one stable endpoint instead of many services
            </li>
            <li>Backend services stay private and can change independently</li>
            <li>Centralises rate limits, auth, logging, and observability</li>
          </ul>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>Adds an extra hop and another moving part to operate</li>
            <li>
              Can become a bottleneck if overused as an orchestration layer
            </li>
            <li>Works best as a thin edge layer, not as business logic</li>
          </ul>
        ),
      },
    ],
  },

  "http-rest": {
    title: "HTTP / REST",
    subtitle: "REST over HTTP for public APIs",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "How it works",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              REST is the most common choice for <strong>public APIs</strong>.
              It uses HTTP resources identified by URLs (for example,
              <code>/orders/123</code>) and standard methods such as{" "}
              <strong>GET, POST, PUT, DELETE</strong>.
            </p>
            <p style={{ marginTop: 8 }}>
              Public APIs usually carry <strong>JSON</strong> request and
              response bodies. Each request is stateless — it includes the
              context the server needs to process it.
            </p>
          </>
        ),
      },
      {
        title: "When to use",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>Browser, mobile, and third-party clients</li>
            <li>CRUD-heavy services with straightforward data access</li>
            <li>When human-readability and debuggability matter</li>
            <li>When you want stable, easy-to-document endpoints</li>
          </ul>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>
              Text-based JSON adds serialization overhead (~7× vs Protobuf)
            </li>
            <li>No built-in streaming (need SSE or WebSocket add-ons)</li>
            <li>Over/under-fetching without careful API design</li>
            <li>Caller remains blocked for the full round-trip</li>
          </ul>
        ),
      },
    ],
  },

  grpc: {
    title: "gRPC",
    subtitle: "Backend RPC with Protocol Buffers",
    accentColor: "#22c55e",
    sections: [
      {
        title: "How it works",
        accent: "#22c55e",
        content: (
          <>
            <p>
              gRPC is a contract-first RPC framework that fits{" "}
              <strong>backend APIs</strong>. It uses{" "}
              <strong>Protocol Buffers</strong> for serialization and{" "}
              <strong>HTTP/2</strong> for transport. You define services and
              messages in a <code>.proto</code> file, then generate
              client/server stubs in any supported language.
            </p>
            <p style={{ marginTop: 8 }}>
              It is designed for service-to-service communication where payload
              size and latency matter more than human readability.
            </p>
          </>
        ),
      },
      {
        title: "When to use",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Internal service-to-service calls where performance matters</li>
            <li>Polyglot microservices sharing a contract via .proto</li>
            <li>Streaming use cases (live feeds, file uploads)</li>
            <li>Low-latency, high-throughput inter-service communication</li>
          </ul>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Binary format — not human-readable, harder to debug</li>
            <li>Requires HTTP/2 — not natively supported in all browsers</li>
            <li>Tighter coupling through shared .proto definitions</li>
            <li>More complex setup than REST</li>
          </ul>
        ),
      },
    ],
  },

  graphql: {
    title: "GraphQL",
    subtitle: "Query language for APIs — ask for exactly what you need",
    accentColor: "#e535ab",
    sections: [
      {
        title: "How it works",
        accent: "#e535ab",
        content: (
          <>
            <p>
              GraphQL provides a <strong>single client-facing endpoint</strong>
              where the caller sends a query specifying exactly which fields it
              needs. The server returns only those fields — no over-fetching, no
              under-fetching.
            </p>
            <p style={{ marginTop: 8 }}>
              The API is defined by a <strong>schema</strong> with types,
              queries, mutations, and subscriptions. Introspection lets clients
              discover the API.
            </p>
          </>
        ),
      },
      {
        title: "When to use",
        accent: "#e535ab",
        content: (
          <ul>
            <li>Client-facing APIs that aggregate data from many services</li>
            <li>Mobile apps that need minimal payloads</li>
            <li>Rapid frontend iteration without backend changes</li>
            <li>APIs with complex, nested relationships</li>
          </ul>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#e535ab",
        content: (
          <ul>
            <li>N+1 query problem if resolvers aren't optimized</li>
            <li>No URL-based caching (everything is POST to one endpoint)</li>
            <li>Query complexity attacks without depth/cost limiting</li>
            <li>Still synchronous request/response under the hood</li>
          </ul>
        ),
      },
    ],
  },

  amqp: {
    title: "AMQP (RabbitMQ)",
    subtitle: "Message queue protocol for reliable async delivery",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "How it works",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              AMQP (Advanced Message Queuing Protocol) uses a{" "}
              <strong>message broker</strong> (like RabbitMQ) to route messages
              between producers and consumers. Producers publish to exchanges;
              exchanges route to queues based on routing rules.
            </p>
            <p style={{ marginTop: 8 }}>
              Supports <strong>direct, topic, fanout, and headers</strong>{" "}
              exchange types. Messages persist in queues until consumed.
            </p>
          </>
        ),
      },
      {
        title: "When to use",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>
              Decoupling services — producer doesn't need to know consumers
            </li>
            <li>Work distribution and load levelling</li>
            <li>Reliable delivery with retries and dead-letter queues</li>
            <li>Fan-out notifications to multiple subscribers</li>
          </ul>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>No immediate response — fire-and-forget model</li>
            <li>Broker is a single point of failure (cluster for HA)</li>
            <li>Eventual consistency — consumers process at their own pace</li>
            <li>Harder to trace end-to-end request flow</li>
          </ul>
        ),
      },
    ],
  },

  kafka: {
    title: "Apache Kafka",
    subtitle: "Distributed event streaming platform",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "How it works",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              Kafka is a <strong>distributed commit log</strong>. Producers
              append events to topic partitions. Events are{" "}
              <strong>persistent</strong> — they remain in the log for a
              configurable retention period (days/weeks/forever).
            </p>
            <p style={{ marginTop: 8 }}>
              Consumer groups read independently. Each group maintains its own
              offset — multiple groups can process the same events differently.
            </p>
          </>
        ),
      },
      {
        title: "When to use",
        accent: "#8b5cf6",
        content: (
          <ul>
            <li>Event sourcing — rebuild state from the event log</li>
            <li>Stream processing (Kafka Streams, ksqlDB)</li>
            <li>High-throughput data pipelines (millions of events/sec)</li>
            <li>Audit trails where full replay is required</li>
          </ul>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#8b5cf6",
        content: (
          <ul>
            <li>Operational complexity (partitions, replication, offsets)</li>
            <li>Eventual consistency only</li>
            <li>Consumer lag requires monitoring</li>
            <li>Not ideal for request/response patterns</li>
          </ul>
        ),
      },
    ],
  },

  "service-discovery": {
    title: "Service Discovery",
    subtitle: "How services find each other on the network",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "The problem",
        accent: "#14b8a6",
        content: (
          <p>
            In microservices, services are deployed across many hosts with
            dynamic IPs. Service A needs to find Service B's current address.
            With synchronous communication, this is critical — you need the
            address before every call.
          </p>
        ),
      },
      {
        title: "Solutions",
        accent: "#14b8a6",
        content: (
          <ul>
            <li>
              <strong>Client-side discovery</strong> — service queries a
              registry (Consul, Eureka) and load-balances itself
            </li>
            <li>
              <strong>Server-side discovery</strong> — a load balancer / API
              gateway handles routing (AWS ALB, Kubernetes Service)
            </li>
            <li>
              <strong>DNS-based</strong> — services register DNS records
              (simpler but slower TTL updates)
            </li>
          </ul>
        ),
      },
    ],
  },

  serialization: {
    title: "Data Serialization",
    subtitle: "Converting objects for network transmission",
    accentColor: "#ec4899",
    sections: [
      {
        title: "Why it matters",
        accent: "#ec4899",
        content: (
          <p>
            Objects in memory must be converted to a wire format (serialized)
            for transmission and converted back (deserialized) on the other end.
            The format choice affects latency, payload size, schema evolution,
            and debugging.
          </p>
        ),
      },
      {
        title: "Comparison",
        accent: "#ec4899",
        content: (
          <ul>
            <li>
              <strong>JSON</strong> — human-readable, ~1.2 KB typical, common
              for public APIs, slower parse
            </li>
            <li>
              <strong>Protocol Buffers</strong> — binary, ~180 B typical, often
              used for backend APIs, fast parse, schema-first
            </li>
            <li>
              <strong>Avro</strong> — binary with schema in payload, great for
              streaming
            </li>
            <li>
              <strong>MessagePack</strong> — binary JSON alternative, no schema
            </li>
          </ul>
        ),
      },
    ],
  },

  "temporal-coupling": {
    title: "Temporal Coupling",
    subtitle: "When services must be available at the same time",
    accentColor: "#ef4444",
    sections: [
      {
        title: "What it is",
        accent: "#ef4444",
        content: (
          <>
            <p>
              Temporal coupling means the caller <strong>requires</strong> the
              callee to be available and responding at the exact moment of the
              call. If Service B is down, Service A's request fails immediately.
            </p>
            <p style={{ marginTop: 8 }}>
              Synchronous protocols (HTTP, gRPC) inherently create temporal
              coupling. Asynchronous messaging breaks it — the broker absorbs
              messages even when consumers are offline.
            </p>
          </>
        ),
      },
      {
        title: "Consequences",
        accent: "#ef4444",
        content: (
          <ul>
            <li>
              Cascading failures: one slow service blocks the entire chain
            </li>
            <li>Availability = product of all service availabilities</li>
            <li>Mitigation: circuit breakers, retries, timeouts, fallbacks</li>
            <li>
              Best fix: switch to async where immediate response isn't needed
            </li>
          </ul>
        ),
      },
    ],
  },
};
