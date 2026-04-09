import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "database-per-service"
  | "shared-database"
  | "api-composition"
  | "cqrs"
  | "event-sourcing"
  | "saga";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "database-per-service": {
    title: "Database per Service",
    subtitle: "Private data ownership per microservice",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "Why teams use it",
        accent: "#38bdf8",
        content: (
          <p>
            Each service owns its schema, migrations, and runtime invariants.
            That keeps boundaries real instead of letting every team reach into
            the same tables.
          </p>
        ),
      },
      {
        title: "What changes",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              Cross-service reads move to APIs, events, or replicated views.
            </li>
            <li>
              Each service keeps local ACID transactions inside its own store.
            </li>
            <li>Data ownership becomes explicit and scalable.</li>
          </ul>
        ),
      },
    ],
  },
  "shared-database": {
    title: "Shared Database",
    subtitle: "Easy joins, expensive coupling",
    accentColor: "#fb7185",
    sections: [
      {
        title: "Why teams still choose it",
        accent: "#fb7185",
        content: (
          <ul>
            <li>One database makes ACID transactions straightforward.</li>
            <li>
              Cross-service joins are easy because all tables live together.
            </li>
            <li>
              It avoids the up-front cost of projections, events, or API
              composition.
            </li>
          </ul>
        ),
      },
      {
        title: "Why it becomes an anti-pattern",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>
              Services stop being independent because schema changes leak across
              teams.
            </li>
            <li>
              The shared database becomes the scaling bottleneck and failure
              domain.
            </li>
            <li>
              APIs look separate, but the real contract becomes SQL and table
              shape.
            </li>
          </ul>
        ),
      },
      {
        title: "What to watch for",
        accent: "#38bdf8",
        content: (
          <p>
            The warning sign is not just a shared database itself. It is when
            one service starts reading or writing another service's tables
            directly because the schema is easier than the API.
          </p>
        ),
      },
      {
        title: "Decision rule",
        accent: "#fb7185",
        content: (
          <p>
            If the shared database is still the cleanest answer, reconsider the
            architecture. A modular monolith may match the team and system
            better than pretending a shared schema is microservices.
          </p>
        ),
      },
    ],
  },
  "api-composition": {
    title: "API Composition",
    subtitle: "Assemble one read view from many services",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "Core idea",
        accent: "#14b8a6",
        content: (
          <p>
            A composition layer or BFF fans out to multiple services at request
            time, then stitches the result into a single client response.
          </p>
        ),
      },
      {
        title: "Trade-off",
        accent: "#38bdf8",
        content: (
          <p>
            You avoid a shared database, but you pay with higher request-time
            latency and more partial-failure handling.
          </p>
        ),
      },
    ],
  },
  cqrs: {
    title: "CQRS",
    subtitle: "Different models for commands and queries",
    accentColor: "#84cc16",
    sections: [
      {
        title: "Command side",
        accent: "#84cc16",
        content: (
          <p>
            Writes go through the authoritative domain model where invariants
            are enforced.
          </p>
        ),
      },
      {
        title: "Query side",
        accent: "#f59e0b",
        content: (
          <p>
            Reads use projections or denormalized views tuned for fast query
            paths, often with eventual consistency.
          </p>
        ),
      },
    ],
  },
  "event-sourcing": {
    title: "Event Sourcing",
    subtitle: "Persist the history of facts",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Source of truth",
        accent: "#f59e0b",
        content: (
          <p>
            The event log is authoritative. Current state is rebuilt by
            replaying the stream or by maintaining projections.
          </p>
        ),
      },
      {
        title: "Why it is harder",
        accent: "#fb7185",
        content: (
          <p>
            Event schemas, replay semantics, backfills, and projection lag all
            become first-class operational concerns.
          </p>
        ),
      },
    ],
  },
  saga: {
    title: "Saga",
    subtitle: "Coordinate local transactions with compensation",
    accentColor: "#818cf8",
    sections: [
      {
        title: "What it solves",
        accent: "#818cf8",
        content: (
          <p>
            A Saga replaces one global transaction with a sequence of local
            commits and compensating actions across services.
          </p>
        ),
      },
      {
        title: "What you must design",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Step ordering and retry rules.</li>
            <li>Compensations for partial failure.</li>
            <li>Timeouts, idempotency, and observability.</li>
          </ul>
        ),
      },
    ],
  },
};
