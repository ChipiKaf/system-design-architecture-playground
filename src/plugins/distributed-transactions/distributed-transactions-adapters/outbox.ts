import { createPatternAdapter } from "./shared";

export const outboxAdapter = createPatternAdapter({
  id: "outbox",
  profile: {
    label: "Transactional Outbox",
    shortLabel: "Outbox",
    description:
      "Persist business state and integration intent inside one local transaction, then publish asynchronously from a durable outbox record.",
    context:
      "Use outbox when one service must publish events reliably after a local commit without trusting a separate best-effort broker call in the request path.",
    tradeoff:
      "Outbox closes the dual-write gap for one service, but it introduces an asynchronous relay, at-least-once delivery, and the need for idempotent consumers. It complements saga more often than it replaces it.",
    terms: [
      "outbox row",
      "dual-write gap",
      "relay or CDC",
      "at-least-once delivery",
      "idempotent consumer",
    ],
    criticalNodes: [
      "initiator",
      "boundary",
      "transport",
      "participant-a",
      "participant-b",
      "recovery",
    ],
  },
  colors: {
    fill: "rgba(20, 83, 45, 0.86)",
    stroke: "#22c55e",
    muted: "#bbf7d0",
  },
  metrics: {
    coordinationModel: "Async relay",
    atomicBoundary: "DB + outbox",
    deliverySemantics: "At-least-once",
    failureStrategy: "Retry + dedupe",
    consistencyStory: "Eventually published",
  },
  topology: {
    initiatorLabel: "Order Service",
    initiatorSubtitle: "Writes business state",
    boundaryLabel: "Service DB + Outbox",
    boundarySubtitle: "One atomic local commit",
    transportLabel: "Relay / CDC",
    transportSubtitle: "Publishes durable events",
    participantALabel: "Broker",
    participantASubtitle: "Fan-out transport",
    participantBLabel: "Consumers",
    participantBSubtitle: "Payment, inventory, email",
    recoveryLabel: "Idempotency Guard",
    recoverySubtitle: "Safe replay and dedupe",
    splitLabel:
      "If publish fails after commit, the outbox record stays durable and the relay tries again.",
  },
  copy: {
    overview:
      "Transactional outbox solves a narrower but critical problem: making one service's publish step reliable after a local commit. The service commits business state and an outbox record together, then a relay publishes later.",
    "local-write":
      "The initiating service commits its own business state locally. Nothing has been published yet, but the durable boundary is already established inside one service-owned database.",
    "capture-intent":
      "The same local transaction also stores an outbox record. That is the key move: business state and publish intent succeed or fail together, which closes the dual-write gap.",
    "deliver-change":
      "A relay or CDC process reads the durable outbox record and publishes it to the broker, where downstream consumers can react without coupling the original request path to broker availability.",
    "handle-failure":
      "If publish fails, the outbox record remains durable and the relay retries. Because delivery is usually at least once, consumers must be idempotent and safe under replay.",
    summary:
      "Outbox is the fit when reliable integration-event publication matters more than synchronous cross-service coordination. It hardens one service boundary and is often paired with saga for the broader workflow.",
  },
});
