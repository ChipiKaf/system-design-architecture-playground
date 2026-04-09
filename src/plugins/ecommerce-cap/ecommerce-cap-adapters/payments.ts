import { createServiceAdapter } from "./shared";

export const paymentsAdapter = createServiceAdapter({
  id: "payments",
  profile: {
    label: "Payments",
    shortLabel: "Payments",
    capMode: "CP",
    description:
      "Payments protect correctness over uptime. If the ledger is uncertain, the service prefers to fail or retry rather than risk double charge or missing money movement.",
    patterns: [
      "Strongly consistent payment ledger",
      "Idempotency keys",
      "Fail-fast or retry on uncertain commit",
    ],
    criticalNodes: ["service", "authority", "policy"],
  },
  colors: {
    fill: "#4c1d1d",
    stroke: "#fb7185",
  },
  metrics: {
    capMode: "CP",
    availabilityBias: 38,
    consistencyBias: 99,
    staleBudget: "0s",
    readPolicy: "Read payment status from the committed ledger of record.",
    writePolicy:
      "Confirm charges only after durable, strongly consistent ledger acknowledgment.",
    partitionPolicy: "Reject or retry charges if the ledger path is uncertain.",
    businessPriority: "Never lose or duplicate money movement.",
    customerImpact:
      "Checkout may temporarily fail or retry instead of risking a bad charge.",
    acceptedRisk:
      "Short-term unavailability is acceptable; inconsistent payment state is not.",
  },
  topology: {
    serviceLabel: "Payments API",
    serviceSubtitle: "Correctness before availability",
    readLabel: "Ledger View",
    readSubtitle: "Committed transaction state",
    authorityLabel: "Payment Ledger",
    authoritySubtitle: "Durable charge record",
    policyLabel: "Idempotency Gate",
    policySubtitle: "Retry instead of double charge",
    partitionLabel: "The ledger is partitioned; uncertain charges are blocked.",
  },
  healthyFlows: [
    {
      from: "$edge",
      to: "$service",
      duration: 480,
      color: "#60a5fa",
      explain: "A payment request reaches the service.",
    },
    {
      from: "$service",
      to: "$policy",
      duration: 560,
      color: "#a78bfa",
      explain: "The idempotency gate protects against duplicate intent.",
    },
    {
      from: "$policy",
      to: "$authority",
      duration: 660,
      color: "#f59e0b",
      explain: "Only a durable ledger write makes the charge real.",
    },
  ],
  partitionFlows: [
    {
      from: "$service",
      to: "$authority",
      duration: 720,
      color: "#ef4444",
      explain:
        "The ledger is no longer reliably reachable across the partition.",
    },
  ],
  decisionFlows: [
    {
      from: "$policy",
      to: "$edge",
      duration: 620,
      color: "#f59e0b",
      explain:
        "Payments keep the gate closed and surface retry semantics instead of guessing.",
    },
  ],
  outcomeFlows: [
    {
      from: "$edge",
      to: "$client",
      duration: 440,
      color: "#f59e0b",
      explain: "The user sees a retry or failure instead of an unsafe charge.",
    },
  ],
  healthyExplanation:
    "Payments are already designed around durable commit. The happy path routes through idempotency checks and a strongly consistent ledger.",
  partitionExplanation:
    "If the ledger path becomes uncertain, committing anyway risks the worst possible outcome: duplicate or missing charges.",
  decisionExplanation:
    "Payments choose CP. The service refuses to guess, fails or retries the request, and preserves ledger correctness over immediate availability.",
  outcomeExplanation:
    "Some payment attempts become temporarily unavailable, but money movement remains correct. That trade-off is exactly what CP is for.",
});
