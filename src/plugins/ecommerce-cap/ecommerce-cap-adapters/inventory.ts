import { createServiceAdapter } from "./shared";

export const inventoryAdapter = createServiceAdapter({
  id: "inventory",
  profile: {
    label: "Inventory",
    shortLabel: "Inventory",
    capMode: "Hybrid",
    description:
      "Inventory splits behavior: read-side availability matters for product pages, but checkout reservations must stay consistent to avoid overselling.",
    patterns: [
      "Replica or cache for browse reads",
      "Primary stock reservation on checkout",
      "Soft hold or reservation gate",
    ],
    criticalNodes: ["service", "read-model", "authority", "policy"],
  },
  colors: {
    fill: "#164e63",
    stroke: "#2dd4bf",
  },
  metrics: {
    capMode: "Hybrid",
    availabilityBias: 78,
    consistencyBias: 88,
    staleBudget: "1-5s browse, 0s checkout",
    readPolicy: "Browse inventory from replicas or cache close to the shopper.",
    writePolicy:
      "Reserve stock only against the authoritative ledger during checkout.",
    partitionPolicy:
      "Keep browse reads available, but gate reservations until the source of truth confirms stock.",
    businessPriority: "Avoid overselling without breaking discovery.",
    customerImpact:
      "Browsing stays responsive, but checkout may pause on low-stock items.",
    acceptedRisk:
      "Slightly stale stock counts are acceptable on product pages; oversold checkout is not.",
  },
  topology: {
    serviceLabel: "Inventory API",
    serviceSubtitle: "AP reads, CP writes",
    readLabel: "Replica Cache",
    readSubtitle: "Fast browse-side stock view",
    authorityLabel: "Stock Ledger",
    authoritySubtitle: "Reservation source of truth",
    policyLabel: "Checkout Gate",
    policySubtitle: "Reserve only on confirmed write",
    partitionLabel: "Browse survives, but the reservation path is partitioned.",
  },
  healthyFlows: [
    {
      from: "$client",
      to: "$edge",
      duration: 420,
      color: "#60a5fa",
      explain:
        "A shopper requests inventory information through the front door.",
    },
    {
      from: "$edge",
      to: "$service",
      duration: 480,
      color: "#60a5fa",
      explain: "Inventory handles the browse request locally when possible.",
    },
    {
      from: "$service",
      to: "$read",
      duration: 620,
      color: "#22c55e",
      explain: "The read side leans AP through replicas and cache.",
    },
  ],
  partitionFlows: [
    {
      from: "$service",
      to: "$authority",
      duration: 720,
      color: "#ef4444",
      explain:
        "The write path to the stock ledger is now across a broken link.",
    },
  ],
  decisionFlows: [
    {
      from: "$service",
      to: "$policy",
      duration: 620,
      color: "#f59e0b",
      explain:
        "Inventory opens a checkout gate: reads continue, but reservations require authoritative confirmation.",
    },
  ],
  outcomeFlows: [
    {
      from: "$read",
      to: "$edge",
      duration: 540,
      color: "#22c55e",
      explain: "Browse traffic still resolves from the replicated read path.",
    },
    {
      from: "$policy",
      to: "$edge",
      duration: 560,
      color: "#f59e0b",
      explain:
        "Checkout is slowed or blocked until the stock ledger is trustworthy again.",
    },
  ],
  healthyExplanation:
    "Inventory already uses two paths: a fast read path for browsing and a stricter reservation path for checkout.",
  partitionExplanation:
    "A partition makes the reservation path uncertain. Replicas can still answer browse reads, but they cannot safely reserve the last unit.",
  decisionExplanation:
    "Inventory goes hybrid: AP for read-side browsing, CP for write-side reservation. The system protects the checkout invariant instead of guessing.",
  outcomeExplanation:
    "Product pages stay available, but checkout may wait or fail fast for scarce items. This is the classic AP reads plus CP writes split.",
});
