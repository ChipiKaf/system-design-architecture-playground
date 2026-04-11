import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey = "layers" | "gates" | "pipes" | "loops";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  layers: {
    title: "Layers",
    subtitle: "Horizontal tiers of responsibility",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What are layers?",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              Layers organise a system into <strong>horizontal tiers</strong>{" "}
              where each tier handles one concern: presentation, business logic,
              data access, or persistence. Each layer communicates only with its
              immediate neighbours — never skipping a tier.
            </p>
          </>
        ),
      },
      {
        title: "Common layer stacks",
        accent: "#60a5fa",
        content: (
          <ul>
            <li>
              <strong>3-tier</strong> — Presentation → Business → Data
            </li>
            <li>
              <strong>Clean Architecture</strong> — Entities → Use Cases →
              Interface Adapters → Frameworks
            </li>
            <li>
              <strong>Hexagonal</strong> — Domain core → Ports → Adapters
            </li>
            <li>
              <strong>OSI Model</strong> — 7 network layers (physical →
              application)
            </li>
          </ul>
        ),
      },
      {
        title: "Benefits",
        accent: "#60a5fa",
        content: (
          <ul>
            <li>Independent testing per layer</li>
            <li>Swap implementations without affecting other layers</li>
            <li>Clear ownership boundaries for teams</li>
            <li>Predictable dependency direction (top → bottom)</li>
          </ul>
        ),
      },
    ],
  },

  gates: {
    title: "Gates",
    subtitle: "Conditional routing and validation checkpoints",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "What are gates?",
        accent: "#fbbf24",
        content: (
          <>
            <p>
              Gates are <strong>conditional checkpoints</strong> that decide
              whether data passes through, gets transformed, or is rejected.
              They sit between layers or components and enforce cross-cutting
              policies without polluting business logic.
            </p>
          </>
        ),
      },
      {
        title: "Common gate types",
        accent: "#fbbf24",
        content: (
          <ul>
            <li>
              <strong>Auth Gate</strong> — JWT verification, OAuth token
              validation, API key checks
            </li>
            <li>
              <strong>Validation Gate</strong> — schema validation (Zod, Joi),
              type checking, constraint enforcement
            </li>
            <li>
              <strong>Rate Limiter</strong> — token bucket, sliding window,
              circuit breaker patterns
            </li>
            <li>
              <strong>Feature Gate</strong> — feature flags, A/B routing, canary
              checks
            </li>
            <li>
              <strong>Permission Gate</strong> — RBAC, ABAC, policy-based access
              control
            </li>
          </ul>
        ),
      },
      {
        title: "Implementation patterns",
        accent: "#fbbf24",
        content: (
          <ul>
            <li>
              Express/Koa <strong>middleware</strong>
            </li>
            <li>
              NestJS/Spring <strong>guards & interceptors</strong>
            </li>
            <li>
              API Gateway <strong>policies</strong> (Kong, Envoy)
            </li>
            <li>Decorator / annotation-based guards</li>
          </ul>
        ),
      },
    ],
  },

  pipes: {
    title: "Pipes",
    subtitle: "Data transformation channels",
    accentColor: "#c084fc",
    sections: [
      {
        title: "What are pipes?",
        accent: "#c084fc",
        content: (
          <>
            <p>
              Pipes connect components via{" "}
              <strong>data transformation channels</strong>. Each pipe takes an
              input, applies a transformation, and passes the output to the next
              stage — exactly like Unix pipes (<code>cmd1 | cmd2 | cmd3</code>).
            </p>
          </>
        ),
      },
      {
        title: "Common pipe operations",
        accent: "#c084fc",
        content: (
          <ul>
            <li>
              <strong>Serialize</strong> — DTO → JSON, Protobuf, Avro
            </li>
            <li>
              <strong>Transform</strong> — field mapping, type coercion,
              aggregation
            </li>
            <li>
              <strong>Enrich</strong> — add metadata, correlation IDs,
              timestamps
            </li>
            <li>
              <strong>Compress</strong> — gzip, brotli, snappy
            </li>
            <li>
              <strong>Encrypt</strong> — AES, TLS payload encryption
            </li>
          </ul>
        ),
      },
      {
        title: "Pipe vs Middleware",
        accent: "#c084fc",
        content: (
          <p>
            Middleware (gates) can <em>reject</em> a request. Pipes only{" "}
            <em>transform</em> data — they always produce output. Gates decide{" "}
            <strong>if</strong> data flows; pipes decide <strong>how</strong>{" "}
            data looks when it arrives.
          </p>
        ),
      },
    ],
  },

  loops: {
    title: "Loops",
    subtitle: "Feedback and retry cycles",
    accentColor: "#f87171",
    sections: [
      {
        title: "What are loops?",
        accent: "#f87171",
        content: (
          <>
            <p>
              Loops introduce <strong>cyclic feedback</strong> into an otherwise
              linear architecture. They handle scenarios where a single pass
              isn't enough — retries after failure, continuous event processing,
              periodic polling, and eventual consistency reconciliation.
            </p>
          </>
        ),
      },
      {
        title: "Loop types",
        accent: "#f87171",
        content: (
          <ul>
            <li>
              <strong>Retry Loop</strong> — exponential backoff, max attempts,
              jitter (transient failures)
            </li>
            <li>
              <strong>Event Loop</strong> — dequeue → process → ack (Kafka,
              RabbitMQ consumers)
            </li>
            <li>
              <strong>Polling Loop</strong> — periodic health checks, state
              synchronisation
            </li>
            <li>
              <strong>Reconciliation Loop</strong> — detect drift, repair
              consistency (Kubernetes controllers)
            </li>
          </ul>
        ),
      },
      {
        title: "Design considerations",
        accent: "#f87171",
        content: (
          <ul>
            <li>
              Idempotency — loops replay operations, so handlers must be
              idempotent
            </li>
            <li>
              Dead-letter queues — bound retry loops to avoid infinite cycling
            </li>
            <li>
              Back-pressure — event loops must signal upstream when overwhelmed
            </li>
            <li>
              Observability — track loop iteration count, latency, failure rate
            </li>
          </ul>
        ),
      },
    ],
  },
};
