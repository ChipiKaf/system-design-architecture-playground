import { createServiceAdapter } from "./shared";

export const ordersAdapter = createServiceAdapter({
  id: "orders",
  profile: {
    label: "Orders",
    shortLabel: "Orders",
    capMode: "CP",
    description:
      "Orders protect the purchase record. Losing, duplicating, or diverging order state is worse than delaying the response.",
    patterns: [
      "Transactional order write",
      "Outbox after commit",
      "Idempotent order submission",
    ],
    criticalNodes: ["service", "authority", "policy"],
  },
  colors: {
    fill: "#4a2810",
    stroke: "#f97316",
  },
  metrics: {
    capMode: "CP",
    availabilityBias: 46,
    consistencyBias: 98,
    staleBudget: "0s",
    readPolicy: "Read order status from the committed order record.",
    writePolicy:
      "Persist each order exactly once before acknowledging success.",
    partitionPolicy:
      "Stop order creation if the durable order store cannot confirm the write.",
    businessPriority: "Protect durable order correctness.",
    customerImpact:
      "Users may need to retry, but the system avoids missing or duplicate orders.",
    acceptedRisk:
      "Temporary unavailability is acceptable; corrupted order history is not.",
  },
  topology: {
    serviceLabel: "Orders API",
    serviceSubtitle: "Commit before acknowledge",
    readLabel: "Order View",
    readSubtitle: "Committed order status",
    authorityLabel: "Order DB",
    authoritySubtitle: "Authoritative purchase record",
    policyLabel: "Commit Barrier",
    policySubtitle: "No order without confirm",
    partitionLabel:
      "The durable order store is partitioned; order creation pauses.",
  },
  healthyFlows: [
    {
      from: "$edge",
      to: "$service",
      duration: 480,
      color: "#60a5fa",
      explain: "A confirmed checkout reaches the order service.",
    },
    {
      from: "$service",
      to: "$authority",
      duration: 650,
      color: "#f59e0b",
      explain: "The order is written to the durable system of record.",
    },
    {
      from: "$authority",
      to: "$read",
      duration: 560,
      color: "#22c55e",
      explain: "Only then does the committed order become visible to readers.",
    },
  ],
  partitionFlows: [
    {
      from: "$service",
      to: "$authority",
      duration: 720,
      color: "#ef4444",
      explain:
        "The order write path is now partitioned away from the durable store.",
    },
  ],
  decisionFlows: [
    {
      from: "$service",
      to: "$policy",
      duration: 620,
      color: "#a78bfa",
      explain: "Orders hold behind a commit barrier rather than invent state.",
    },
  ],
  outcomeFlows: [
    {
      from: "$policy",
      to: "$edge",
      duration: 560,
      color: "#f59e0b",
      explain:
        "The system delays or rejects the request until the store can confirm the write.",
    },
    {
      from: "$edge",
      to: "$client",
      duration: 420,
      color: "#f59e0b",
      explain: "The user may retry later, but the order record stays correct.",
    },
  ],
  healthyExplanation:
    "Orders acknowledge success only after the purchase record is durably committed. Downstream fan-out happens later, but the order itself must be real first.",
  partitionExplanation:
    "If the source of truth is partitioned away, blindly creating the order risks duplicates, gaps, or conflicting downstream views.",
  decisionExplanation:
    "Orders choose CP. The service waits for a durable commit or fails the request rather than creating an ambiguous purchase state.",
  outcomeExplanation:
    "The user may face a delay or retry, but the platform preserves one clean order history. That is the correct trade-off for order integrity.",
});
