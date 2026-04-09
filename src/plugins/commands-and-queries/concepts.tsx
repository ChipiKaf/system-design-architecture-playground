import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "cqrs"
  | "event-sourcing"
  | "materialized-view"
  | "command-model"
  | "query-model"
  | "projection"
  | "message-broker"
  | "eventual-consistency";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  cqrs: {
    title: "CQRS",
    subtitle: "Command Query Responsibility Segregation",
    accentColor: "#818cf8",
    sections: [
      {
        title: "Core idea",
        accent: "#818cf8",
        content: (
          <p>
            CQRS separates operations that change state (Commands) from
            operations that read state (Queries). Each side gets its own data
            model, and potentially its own data store, optimized independently
            for performance, scalability, and security.
          </p>
        ),
      },
      {
        title: "Why separate?",
        accent: "#38bdf8",
        content: (
          <ul>
            <li>
              Writes need strong consistency (ACID) and involve business
              logic/validations — less frequent but more complex.
            </li>
            <li>
              Reads are much higher volume, need low latency, and may require
              joining data from multiple entities.
            </li>
            <li>
              A single data model optimized for one can be suboptimal for the
              other.
            </li>
          </ul>
        ),
      },
      {
        title: "Benefits",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Independent scaling of read and write sides.</li>
            <li>Optimized data models for each responsibility.</li>
            <li>Improved query performance.</li>
            <li>Increased security and simpler logic per side.</li>
          </ul>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>Increased complexity from maintaining two models.</li>
            <li>Eventual consistency between read and write sides.</li>
            <li>Code duplication across command and query handlers.</li>
            <li>Synchronization logic must be designed and maintained.</li>
          </ul>
        ),
      },
      {
        title: "Best practices",
        accent: "#94a3b8",
        content: (
          <ul>
            <li>Physically separate read and write databases.</li>
            <li>Optimize read-side schema for queries.</li>
            <li>Consider different database technologies for each side.</li>
          </ul>
        ),
      },
      {
        title: "Real-world example",
        accent: "#818cf8",
        content: (
          <p>
            Instagram uses PostgreSQL (relational) for core user data, writes,
            and strong consistency. It uses Cassandra (NoSQL) for massive-scale
            user feeds and activity streams — a classic CQRS split matching each
            side's different requirements.
          </p>
        ),
      },
    ],
  },
  "event-sourcing": {
    title: "Event Sourcing",
    subtitle: "Persist every state change as an immutable event",
    accentColor: "#f472b6",
    sections: [
      {
        title: "Core idea",
        accent: "#f472b6",
        content: (
          <p>
            Instead of storing only the current state of an entity, Event
            Sourcing persists every state change as an immutable event. Each
            event represents a fact — something that happened (OrderCreated,
            ProductPriceChanged, ItemAddedToCart). These events are stored
            sequentially in an append-only log called an Event Store.
          </p>
        ),
      },
      {
        title: "Source of truth",
        accent: "#38bdf8",
        content: (
          <p>
            The Event Store becomes the ultimate source of truth. Current state
            is derived by replaying its events from the beginning, not by
            reading a mutable row. The Event Store is the heart of data
            persistence for state-changing operations.
          </p>
        ),
      },
      {
        title: "How it works",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              Events from the Event Store are published to an Event Bus to
              notify other parts of the system and update read models.
            </li>
            <li>Provides a full audit log inherently.</li>
            <li>
              Enables temporal queries — reconstruct state at any point in time.
            </li>
            <li>Read models can be rebuilt by replaying events.</li>
          </ul>
        ),
      },
      {
        title: "CQRS + Event Sourcing",
        accent: "#818cf8",
        content: (
          <ul>
            <li>
              Write side: instead of updating a stateful record, new events are
              generated and appended to the Event Store — the Event Store is the
              write model.
            </li>
            <li>
              Read side: materialized views are created and updated by consuming
              the events published from the Event Store.
            </li>
          </ul>
        ),
      },
      {
        title: "Eventual consistency",
        accent: "#f59e0b",
        content: (
          <p>
            When using asynchronous updates from an Event Store to read models,
            eventual consistency is the norm. There will be a short delay before
            the read models reflect the latest state. The system eventually
            becomes consistent across all views.
          </p>
        ),
      },
    ],
  },
  "materialized-view": {
    title: "Materialized View",
    subtitle: "A local read model precomputed for fast queries",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Core idea",
        accent: "#22c55e",
        content: (
          <p>
            A materialized view is a local, denormalized read model that already
            matches the query shape the client needs. Instead of stitching data
            together at request time, the service precomputes that shape ahead
            of the read and keeps that local copy beside the query path.
          </p>
        ),
      },
      {
        title: "Strategic duplication",
        accent: "#38bdf8",
        content: (
          <p>
            This pattern duplicates data on purpose. The local read model is a
            strategic copy built for speed and query shape, not a second source
            of truth.
          </p>
        ),
      },
      {
        title: "Ownership and updates",
        accent: "#38bdf8",
        content: (
          <ul>
            <li>The write model still owns the authoritative data.</li>
            <li>
              The read copy is refreshed after writes, usually through events.
            </li>
            <li>
              That means synchronization is async, not inline with every
              command.
            </li>
          </ul>
        ),
      },
      {
        title: "Trade-off",
        accent: "#f59e0b",
        content: (
          <p>
            The view is updated asynchronously, so the read side becomes
            eventually consistent with the write side. Fast reads now compete
            with freshness instead of raw latency.
          </p>
        ),
      },
      {
        title: "Other refresh models",
        accent: "#94a3b8",
        content: (
          <p>
            Event-driven publish/subscribe is the usual microservice fit, but
            some teams also use scheduled batch refreshes or triggers when the
            storage coupling is acceptable. Those alternatives are simpler in
            some systems, but they usually increase lag or coupling.
          </p>
        ),
      },
    ],
  },
  "command-model": {
    title: "Command Model",
    subtitle: "The authoritative write side that enforces invariants",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "What lives here",
        accent: "#38bdf8",
        content: (
          <p>
            The command model owns writes, business rules, and the source of
            truth. It is where the service validates intent, enforces
            invariants, and commits authoritative state changes.
          </p>
        ),
      },
      {
        title: "What does not belong here",
        accent: "#ef4444",
        content: (
          <p>
            The write model should not be distorted to satisfy every read use
            case directly. If query-specific shaping leaks back into the command
            side, the model becomes harder to reason about and harder to evolve.
          </p>
        ),
      },
    ],
  },
  "query-model": {
    title: "Query Model",
    subtitle: "A read-optimized view shaped for the client",
    accentColor: "#22c55e",
    sections: [
      {
        title: "What it optimizes",
        accent: "#22c55e",
        content: (
          <p>
            The query model is built for retrieval, not for enforcing write-side
            rules. It can denormalize, duplicate, or reshape data because its
            only job is to answer reads quickly and clearly.
          </p>
        ),
      },
      {
        title: "Ownership boundary",
        accent: "#38bdf8",
        content: (
          <p>
            The query model serves reads, but it does not replace the
            source-of-truth write model. Its data is intentionally copied and
            may briefly be behind.
          </p>
        ),
      },
      {
        title: "Why it is separate",
        accent: "#f59e0b",
        content: (
          <p>
            Separating the query model from the command model lets each side use
            a structure that fits its own job. That is the heart of the command
            and query split.
          </p>
        ),
      },
    ],
  },
  projection: {
    title: "Projection Worker",
    subtitle: "The async worker that refreshes the read model",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What it does",
        accent: "#f59e0b",
        content: (
          <p>
            A projector consumes events from the write side and applies them to
            the read model. That keeps the view fresh without forcing every read
            request to wait on synchronous fan-out.
          </p>
        ),
      },
      {
        title: "Typical sync model",
        accent: "#38bdf8",
        content: (
          <p>
            In microservices, this is usually event-driven publish/subscribe:
            the source owner publishes a change event and the projector updates
            its local materialized view when that event arrives.
          </p>
        ),
      },
      {
        title: "Operational concern",
        accent: "#ef4444",
        content: (
          <p>
            If the projector falls behind, the query view falls behind too.
            Projection lag therefore becomes a first-class operational metric,
            not just an implementation detail.
          </p>
        ),
      },
      {
        title: "Other options",
        accent: "#94a3b8",
        content: (
          <p>
            Some systems use scheduled batch refreshes or triggers instead of
            pub/sub. That can work, but batch increases staleness and triggers
            can couple the view more tightly to storage details.
          </p>
        ),
      },
    ],
  },
  "message-broker": {
    title: "Message Broker",
    subtitle: "Durable handoff between the write side and the projector",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "Why it matters",
        accent: "#38bdf8",
        content: (
          <p>
            The broker decouples the write path from the projection path. The
            write side can publish an event after commit, and the projector can
            consume it later without keeping the client request open.
          </p>
        ),
      },
      {
        title: "What it enables",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Durable handoff after the authoritative write.</li>
            <li>Buffered consumption when projectors are slower.</li>
            <li>Replay and re-projection when views need rebuilding.</li>
          </ul>
        ),
      },
    ],
  },
  "eventual-consistency": {
    title: "Eventual Consistency",
    subtitle: "Fast local reads can briefly lag the write side",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What it means here",
        accent: "#f59e0b",
        content: (
          <p>
            The read model is refreshed after the write commits, not during the
            same blocking request path. That means reads may briefly see an
            older duplicated snapshot while the projector is still catching up.
          </p>
        ),
      },
      {
        title: "Why teams still accept it",
        accent: "#22c55e",
        content: (
          <p>
            The payoff is a read path with lower latency, less coupling, and no
            live cross-service composition on every query. Whether that trade is
            acceptable depends on how much freshness the user experience needs.
          </p>
        ),
      },
    ],
  },
};
