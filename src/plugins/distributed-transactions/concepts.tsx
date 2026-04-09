import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "distributed-transactions"
  | "saga"
  | "outbox"
  | "local-transaction"
  | "compensation"
  | "eventual-consistency"
  | "dual-write"
  | "relay"
  | "idempotency";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "distributed-transactions": {
    title: "Distributed Transactions",
    subtitle: "Coordinating one business action across service-owned data",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "Core problem",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              A user thinks in one business action: place order, charge card,
              reserve stock. In a microservice system those state changes often
              belong to different services and different databases.
            </p>
            <p>
              That means one local ACID transaction is no longer enough. You
              need a coordination pattern that explains where atomicity ends,
              how intent is propagated, and what happens when part of the flow
              fails.
            </p>
          </>
        ),
      },
      {
        title: "What changes from monolith thinking",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Each service can usually commit only its own local state.</li>
            <li>Cross-service progress is message-driven, not one shared lock.</li>
            <li>Failure handling becomes explicit design, not an afterthought.</li>
          </ul>
        ),
      },
      {
        title: "Patterns in this lab",
        accent: "#f59e0b",
        content: (
          <p>
            Saga focuses on coordinating a workflow with compensating actions.
            Transactional outbox focuses on publishing integration events
            reliably from one service after a local commit. They solve adjacent,
            not identical, parts of the distributed transaction problem.
          </p>
        ),
      },
    ],
  },
  saga: {
    title: "Saga",
    subtitle: "Sequence local transactions and compensate on failure",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "Core idea",
        accent: "#60a5fa",
        content: (
          <p>
            A saga breaks one business transaction into a sequence of local
            transactions. Each service commits its own state independently. If a
            later step fails, the system does not roll back one global
            transaction; it runs compensating actions to semantically undo the
            work that already happened.
          </p>
        ),
      },
      {
        title: "How coordination happens",
        accent: "#a78bfa",
        content: (
          <ul>
            <li>Orchestration: a coordinator tells each step what to do next.</li>
            <li>Choreography: services react to events without one central boss.</li>
            <li>Either way, each participant still owns its own local commit.</li>
          </ul>
        ),
      },
      {
        title: "Trade-off",
        accent: "#f59e0b",
        content: (
          <p>
            Saga gives up global atomicity. In return, it works with
            service-owned data and explicit workflow logic. The cost is eventual
            consistency, compensation complexity, and more failure paths to
            reason about.
          </p>
        ),
      },
    ],
  },
  outbox: {
    title: "Transactional Outbox",
    subtitle: "Persist business state and publish intent from one local commit",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Core idea",
        accent: "#22c55e",
        content: (
          <p>
            A service writes both its business state and an outbox record inside
            the same local database transaction. A relay or CDC process later
            publishes that outbox record to the broker. This avoids the classic
            dual-write problem where the DB commit succeeds but event publish
            fails, or the other way around.
          </p>
        ),
      },
      {
        title: "What outbox does not do",
        accent: "#60a5fa",
        content: (
          <p>
            Outbox makes one service's publish step reliable. It does not by
            itself coordinate a full cross-service business rollback. Teams
            often use outbox together with saga, not instead of it.
          </p>
        ),
      },
      {
        title: "Operational consequence",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>Delivery is usually at least once, not exactly once.</li>
            <li>Consumers must be idempotent.</li>
            <li>Publication is asynchronous, so downstream views lag briefly.</li>
          </ul>
        ),
      },
    ],
  },
  "local-transaction": {
    title: "Local Transaction",
    subtitle: "Where ACID guarantees actually stop",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Boundary",
        accent: "#a78bfa",
        content: (
          <p>
            A local transaction usually means one service, one database, one
            commit boundary. ACID semantics are strong inside that boundary but
            do not magically extend across another service's storage.
          </p>
        ),
      },
      {
        title: "Why this matters",
        accent: "#60a5fa",
        content: (
          <p>
            Most distributed transaction patterns are really about bridging the
            gap between multiple local transaction boundaries in a controlled
            way.
          </p>
        ),
      },
    ],
  },
  compensation: {
    title: "Compensation",
    subtitle: "Semantic undo, not physical rollback",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What it is",
        accent: "#f59e0b",
        content: (
          <p>
            A compensating action is a new business action that reverses the
            meaning of a previous step. Refund payment, release inventory, or
            cancel shipment are common examples.
          </p>
        ),
      },
      {
        title: "What it is not",
        accent: "#ef4444",
        content: (
          <p>
            Compensation is not a low-level database rollback after every
            participant has already committed. It is explicit business logic,
            which means it can fail, be retried, and have side effects of its
            own.
          </p>
        ),
      },
    ],
  },
  "eventual-consistency": {
    title: "Eventual Consistency",
    subtitle: "Correct over time, not instantly everywhere",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Meaning",
        accent: "#22c55e",
        content: (
          <p>
            Different services can observe different snapshots for a while after
            an event is emitted. Given time and successful retries, they
            converge on the same business truth.
          </p>
        ),
      },
      {
        title: "Design question",
        accent: "#60a5fa",
        content: (
          <p>
            The real question is whether the business can tolerate that lag. If
            not, you need a different coordination strategy or tighter local
            ownership boundaries.
          </p>
        ),
      },
    ],
  },
  "dual-write": {
    title: "Dual Write Gap",
    subtitle: "The DB commit and broker publish can disagree",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "The gap",
        accent: "#f59e0b",
        content: (
          <p>
            If a service writes to its database and then separately publishes to
            a message broker, one call can succeed while the other fails. The
            system is left with missing integration events or phantom events
            that never matched durable business state.
          </p>
        ),
      },
      {
        title: "Why outbox exists",
        accent: "#22c55e",
        content: (
          <p>
            Transactional outbox closes that gap by making the publish intent
            part of the same local commit as the business data.
          </p>
        ),
      },
    ],
  },
  relay: {
    title: "Relay / CDC",
    subtitle: "The process that drains durable outbox records",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Role",
        accent: "#a78bfa",
        content: (
          <p>
            A relay polls the outbox table or reads database change events,
            publishes them to the broker, and marks progress so they are not
            lost. It exists because the service request path should not own the
            full publish lifecycle.
          </p>
        ),
      },
      {
        title: "Failure model",
        accent: "#60a5fa",
        content: (
          <p>
            Because relay work is retried, duplicate delivery is normal. That is
            why outbox and idempotent consumers belong together.
          </p>
        ),
      },
    ],
  },
  idempotency: {
    title: "Idempotency",
    subtitle: "Make replay safe when the system retries",
    accentColor: "#fb7185",
    sections: [
      {
        title: "Why it matters",
        accent: "#fb7185",
        content: (
          <p>
            Distributed systems retry. If a consumer processes the same command
            or event twice, the outcome should remain correct. Otherwise every
            retry becomes a data corruption risk.
          </p>
        ),
      },
      {
        title: "Typical techniques",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Deduplicate by message ID or business key.</li>
            <li>Use upsert-style handlers instead of blind inserts.</li>
            <li>Record processed offsets or event IDs durably.</li>
          </ul>
        ),
      },
    ],
  },
};
