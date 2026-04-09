import { createServiceAdapter } from "./shared";

export const notificationsAdapter = createServiceAdapter({
  id: "notifications",
  profile: {
    label: "Notifications",
    shortLabel: "Notifications",
    capMode: "AP",
    description:
      "Notifications are side effects. Delayed email, SMS, or push delivery is usually acceptable if the core order and payment flow stays available.",
    patterns: [
      "Durable retry queue",
      "At-least-once delivery",
      "Outbox plus async worker",
    ],
    criticalNodes: ["service", "policy", "authority"],
  },
  colors: {
    fill: "#0f4c3a",
    stroke: "#22c55e",
  },
  metrics: {
    capMode: "AP",
    availabilityBias: 97,
    consistencyBias: 24,
    staleBudget: "minutes",
    readPolicy:
      "Serve the latest known delivery state even if it lags the provider.",
    writePolicy:
      "Queue send intents durably and retry delivery asynchronously.",
    partitionPolicy:
      "Buffer notifications locally and replay after the downstream channel recovers.",
    businessPriority: "Never block checkout on an email or push send.",
    customerImpact:
      "Messages may arrive late, but the purchase flow keeps moving.",
    acceptedRisk:
      "Delayed, duplicated, or re-ordered notifications are acceptable if retries remain durable.",
  },
  topology: {
    serviceLabel: "Notifier",
    serviceSubtitle: "Async side-effect service",
    readLabel: "Delivery Log",
    readSubtitle: "Latest known send status",
    authorityLabel: "Channel Provider",
    authoritySubtitle: "Email / SMS / push vendor",
    policyLabel: "Retry Queue",
    policySubtitle: "At-least-once delivery buffer",
    partitionLabel:
      "The provider is partitioned; queue locally and replay later.",
  },
  healthyFlows: [
    {
      from: "$service",
      to: "$policy",
      duration: 560,
      color: "#a78bfa",
      explain: "Notification intent is first written to a durable queue.",
    },
    {
      from: "$policy",
      to: "$authority",
      duration: 680,
      color: "#22c55e",
      explain: "A worker sends the message to the external provider.",
    },
    {
      from: "$authority",
      to: "$read",
      duration: 540,
      color: "#60a5fa",
      explain: "Delivery status eventually updates the local log.",
    },
  ],
  partitionFlows: [
    {
      from: "$policy",
      to: "$authority",
      duration: 720,
      color: "#ef4444",
      explain:
        "The downstream email or SMS provider is now behind a partition.",
    },
  ],
  decisionFlows: [
    {
      from: "$service",
      to: "$read",
      duration: 560,
      color: "#22c55e",
      explain: "The system records intent locally and keeps core flows moving.",
    },
  ],
  outcomeFlows: [
    {
      from: "$read",
      to: "$edge",
      duration: 540,
      color: "#22c55e",
      explain: "Checkout does not block on a notification side effect.",
    },
    {
      from: "$edge",
      to: "$client",
      duration: 420,
      color: "#22c55e",
      explain: "Delivery will catch up later after the provider recovers.",
    },
  ],
  healthyExplanation:
    "Notifications are decoupled from the critical purchase path. Intent lands in a durable queue and workers deliver to external channels asynchronously.",
  partitionExplanation:
    "If the provider is partitioned away, that should be inconvenient, not catastrophic. Email delay is cheaper than blocking checkout.",
  decisionExplanation:
    "Notifications choose AP. Buffer the side effect, retry later, and keep the user-facing transaction available.",
  outcomeExplanation:
    "Core commerce stays up while messages drain after recovery. Delivery freshness may wobble, but the important transaction path keeps moving.",
});
