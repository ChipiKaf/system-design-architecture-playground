import { createServiceAdapter } from "./shared";

export const catalogAdapter = createServiceAdapter({
  id: "catalog",
  profile: {
    label: "Product Catalog",
    shortLabel: "Catalog",
    capMode: "AP",
    description:
      "Catalog favors availability. Browsing can tolerate short-lived stale data, but a storefront outage immediately costs traffic and revenue.",
    patterns: [
      "CDN and edge caching",
      "Async cache invalidation",
      "Search index fan-out",
    ],
    criticalNodes: ["service", "read-model", "policy"],
  },
  colors: {
    fill: "#123a66",
    stroke: "#60a5fa",
  },
  metrics: {
    capMode: "AP",
    availabilityBias: 96,
    consistencyBias: 36,
    staleBudget: "5-30s",
    readPolicy: "Serve product reads from the nearest cache or CDN edge.",
    writePolicy:
      "Propagate catalog mutations asynchronously to caches and indexes.",
    partitionPolicy:
      "Keep storefront reads available from local cache during a split.",
    businessPriority: "Keep discovery and browsing online.",
    customerImpact:
      "Customers can still browse even if price or stock hints are briefly stale.",
    acceptedRisk:
      "Short-lived stale price, description, or stock metadata is acceptable.",
  },
  topology: {
    serviceLabel: "Catalog API",
    serviceSubtitle: "Availability-first browse path",
    readLabel: "CDN / Cache",
    readSubtitle: "Regional product snapshot",
    authorityLabel: "Catalog DB",
    authoritySubtitle: "Authoritative product source",
    policyLabel: "Async Fanout",
    policySubtitle: "Invalidate and converge later",
    partitionLabel: "Catalog authority is partitioned; cached reads stay live.",
  },
  healthyFlows: [
    {
      from: "$client",
      to: "$edge",
      duration: 420,
      color: "#60a5fa",
      explain: "A shopper hits the nearest region first.",
    },
    {
      from: "$edge",
      to: "$service",
      duration: 520,
      color: "#60a5fa",
      explain: "The catalog service resolves the request locally.",
    },
    {
      from: "$service",
      to: "$read",
      duration: 620,
      color: "#22c55e",
      explain: "The fast path prefers replicated cache state for browsing.",
    },
  ],
  partitionFlows: [
    {
      from: "$service",
      to: "$authority",
      duration: 700,
      color: "#ef4444",
      explain:
        "A network split cuts this region off from the authoritative catalog database.",
    },
  ],
  decisionFlows: [
    {
      from: "$service",
      to: "$policy",
      duration: 620,
      color: "#a78bfa",
      explain:
        "Catalog chooses to keep the storefront up and defer synchronization.",
    },
    {
      from: "$policy",
      to: "$read",
      duration: 560,
      color: "#22c55e",
      explain:
        "Local cache remains the serving layer while updates queue behind the split.",
    },
  ],
  outcomeFlows: [
    {
      from: "$read",
      to: "$edge",
      duration: 540,
      color: "#22c55e",
      explain: "The cached product view keeps flowing back toward the user.",
    },
    {
      from: "$edge",
      to: "$client",
      duration: 420,
      color: "#22c55e",
      explain:
        "Browsing remains available even though the source of truth is disconnected.",
    },
  ],
  healthyExplanation:
    "Catalog is built for reach. Product pages are normally served from nearby caches so browsing stays fast and resilient.",
  partitionExplanation:
    "When the authoritative catalog database is partitioned away, the service still has enough replicated state to keep answering browse requests.",
  decisionExplanation:
    "Catalog leans AP. It serves from local cache and accepts eventual consistency because a brief mismatch is cheaper than a dead storefront.",
  outcomeExplanation:
    "Customers keep discovering products. The trade-off is temporary staleness until the partition heals and cache invalidation catches up.",
});
