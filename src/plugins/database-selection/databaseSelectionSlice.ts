import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";

export type VariantKey =
  | "relational"
  | "document"
  | "key-value"
  | "wide-column"
  | "graph";

export type ScenarioKey =
  | "payments"
  | "catalog"
  | "sessions"
  | "telemetry"
  | "recommendations";

export type LessonMode = "selection" | "cap" | "partitioning";

export type PartitionStrategyKey = "none" | "horizontal" | "vertical";

export type CapPropertyKey =
  | "consistency"
  | "availability"
  | "partition-tolerance";

export type CapProfileKey = "ca" | "cp" | "ap";

export type PartitionLevel = 0 | 1 | 2;

export type FitBand = "strong match" | "workable" | "stretch";

export type TraitKey =
  | "transactions"
  | "schemaFlex"
  | "embeddedReads"
  | "keyLookups"
  | "writeScale"
  | "columnAnalytics"
  | "relationships"
  | "availability"
  | "joins";

export interface CapPropertyProfile {
  key: CapPropertyKey;
  label: string;
  shortLabel: "C" | "A" | "P";
  color: string;
  promise: string;
  meaning: string;
  failureMode: string;
}

export interface CapProfile {
  key: CapProfileKey;
  label: string;
  color: string;
  keeps: [CapPropertyKey, CapPropertyKey];
  givesUp: CapPropertyKey;
  summary: string;
  normalBehavior: string;
  partitionBehavior: string;
  chooseWhen: string;
  risk: string;
  examples: string[];
  familyFit: string;
}

export interface PartitionStrategyMeta {
  key: Exclude<PartitionStrategyKey, "none">;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
}

export interface PartitionStageProfile {
  level: Exclude<PartitionLevel, 0>;
  label: string;
  partitionCount: number;
  keyLabel: string;
  changeSummary: string;
  keyNote: string;
  benefit: string;
  tradeoff: string;
  throughput: number;
  joinCost: number;
  routingCost: number;
  isolation: number;
}

export interface VariantProfile {
  key: VariantKey;
  label: string;
  shortLabel: string;
  family: "Relational" | "NoSQL";
  color: string;
  accentText: string;
  overview: string;
  dataModel: string;
  consistencyModel: string;
  scaleModel: string;
  queryModel: string;
  visibleTags: [string, string, string];
  examples: string[];
  strengths: string[];
  tradeoffs: string[];
  shapeNote: string;
  accessNote: string;
  consistencyNote: string;
  scaleNote: string;
  summaryNote: string;
  capabilities: Record<TraitKey, number>;
}

export interface ScenarioProfile {
  key: ScenarioKey;
  label: string;
  shortLabel: string;
  serviceName: string;
  color: string;
  description: string;
  recommended: VariantKey;
  requirements: [string, string, string, string];
  dataShapeNeed: string;
  accessNeed: string;
  consistencyNeed: string;
  scaleNeed: string;
  summaryNeed: string;
  polyglotService: PolyglotServiceKey;
  weights: Record<TraitKey, number>;
}

export type PolyglotServiceKey =
  | "catalog"
  | "cart"
  | "ordering"
  | "analytics"
  | "recommendations";

export const FAMILY_NODE_IDS: Record<VariantKey, string> = {
  relational: "family-relational",
  document: "family-document",
  "key-value": "family-key-value",
  "wide-column": "family-wide-column",
  graph: "family-graph",
};

export const VARIANT_KEYS: VariantKey[] = [
  "relational",
  "document",
  "key-value",
  "wide-column",
  "graph",
];

export const SCENARIO_KEYS: ScenarioKey[] = [
  "payments",
  "catalog",
  "sessions",
  "telemetry",
  "recommendations",
];

export const CAP_PROFILE_KEYS: CapProfileKey[] = ["ca", "cp", "ap"];

export const PARTITION_STRATEGIES: Exclude<PartitionStrategyKey, "none">[] = [
  "horizontal",
  "vertical",
];

export const PARTITION_STRATEGY_META: Record<
  Exclude<PartitionStrategyKey, "none">,
  PartitionStrategyMeta
> = {
  horizontal: {
    key: "horizontal",
    label: "Horizontal Partitioning",
    shortLabel: "Sharding",
    color: "#38bdf8",
    description:
      "Split rows into independent shards and route requests by a shard key.",
  },
  vertical: {
    key: "vertical",
    label: "Vertical Partitioning",
    shortLabel: "Column Split",
    color: "#a78bfa",
    description:
      "Split columns into separate partitions so hot fields stay lean and cold fields move out of the hot path.",
  },
};

export const PARTITION_BASELINE = {
  label: "Single database",
  partitionCount: 1,
  keyLabel: "No partition key yet",
  changeSummary:
    "All rows and columns still live in one database, so throughput, storage pressure, and maintenance all hit the same box.",
  keyNote:
    "Every query lands on the same server because there is only one place to go.",
  benefit:
    "The model is simple and joins stay local because everything lives together.",
  tradeoff:
    "One server becomes the bottleneck and a single database tier is harder to scale or isolate.",
  throughput: 100,
  joinCost: 12,
  routingCost: 0,
  isolation: 8,
} as const;

export const PARTITION_STAGE_PROFILES: Record<
  Exclude<PartitionStrategyKey, "none">,
  PartitionStageProfile[]
> = {
  horizontal: [
    {
      level: 1,
      label: "2 shards",
      partitionCount: 2,
      keyLabel: "Shard key: region",
      changeSummary:
        "The table is split by rows into two shards, so each partition owns a subset of the total records.",
      keyNote:
        "Queries now route by region, so the app or data layer can hit East or West directly instead of scanning one giant table.",
      benefit:
        "Throughput climbs because write pressure and row volume are distributed across two servers.",
      tradeoff:
        "Cross-shard joins, rebalancing, and aggregate queries become more complex because not all rows live together anymore.",
      throughput: 145,
      joinCost: 42,
      routingCost: 30,
      isolation: 48,
    },
    {
      level: 2,
      label: "4 shards",
      partitionCount: 4,
      keyLabel: "Shard key: hash(customer_id) mod 4",
      changeSummary:
        "The table is now spread across four shards, which pushes more data and traffic off any single database node.",
      keyNote:
        "Routing now depends on a shard map and a stable partition key, so operational discipline matters as much as schema design.",
      benefit:
        "Capacity, parallelism, and failure isolation improve again because the hot path fans out across more shards.",
      tradeoff:
        "Scatter-gather queries, hot-spot risk, and shard rebalancing become serious concerns as the shard count rises.",
      throughput: 210,
      joinCost: 74,
      routingCost: 68,
      isolation: 78,
    },
  ],
  vertical: [
    {
      level: 1,
      label: "2 column partitions",
      partitionCount: 2,
      keyLabel: "Split by access pattern",
      changeSummary:
        "The row is split into hot columns and cold columns, so frequently accessed fields no longer drag the entire row with them.",
      keyNote:
        "Core fields stay in one partition while wider or less frequent fields move to another partition linked by the same key.",
      benefit:
        "Narrow reads and hot updates get faster because the main path touches fewer columns and smaller pages.",
      tradeoff:
        "Any request that needs the full row now has to reconstruct it across partitions, so join complexity rises immediately.",
      throughput: 128,
      joinCost: 58,
      routingCost: 18,
      isolation: 28,
    },
    {
      level: 2,
      label: "3 column partitions",
      partitionCount: 3,
      keyLabel: "Identity | profile | activity columns",
      changeSummary:
        "The schema is split even further so each access path reads only the columns it cares about.",
      keyNote:
        "The service layer now needs strong awareness of which partition owns identity, profile, or activity fields.",
      benefit:
        "Hot paths stay lean and targeted updates avoid touching wide or rarely used data blocks.",
      tradeoff:
        "Row reconstruction, multi-partition updates, and schema coordination keep getting more expensive as the split deepens.",
      throughput: 148,
      joinCost: 82,
      routingCost: 42,
      isolation: 40,
    },
  ],
};

export const CAP_PROPERTY_PROFILES: Record<CapPropertyKey, CapPropertyProfile> =
  {
    consistency: {
      key: "consistency",
      label: "Consistency",
      shortLabel: "C",
      color: "#60a5fa",
      promise:
        "Every client sees the same, latest acknowledged value or gets an error.",
      meaning:
        "Consistency is about one correct view of the data, not just good validation rules.",
      failureMode:
        "If you protect C during a partition, some requests must wait or fail rather than return stale data.",
    },
    availability: {
      key: "availability",
      label: "Availability",
      shortLabel: "A",
      color: "#34d399",
      promise:
        "Every request gets a non-error response, even if the answer is not the newest write.",
      meaning:
        "Availability is about always responding, especially when parts of the system are degraded.",
      failureMode:
        "If you protect A during a partition, you may serve stale or conflicting data and reconcile later.",
    },
    "partition-tolerance": {
      key: "partition-tolerance",
      label: "Partition Tolerance",
      shortLabel: "P",
      color: "#f59e0b",
      promise:
        "The system continues operating even when replicas cannot talk to each other.",
      meaning:
        "P matters because network splits, packet loss, and delayed links are normal in distributed systems.",
      failureMode:
        "Once P matters, the real choice becomes C versus A during the partition.",
    },
  };

export const CAP_PROFILES: Record<CapProfileKey, CapProfile> = {
  ca: {
    key: "ca",
    label: "CA",
    color: "#60a5fa",
    keeps: ["consistency", "availability"],
    givesUp: "partition-tolerance",
    summary:
      "CA systems behave like one correct, always-on database while the network is healthy, centralized, or not treated as a partitioned system.",
    normalBehavior:
      "Reads and writes stay simple because replicas are assumed reachable or the deployment is effectively centralized.",
    partitionBehavior:
      "When a real partition hits, CA cannot keep both C and A. The system must stop, degrade, or stop pretending it is CA.",
    chooseWhen:
      "Choose this posture for centralized deployments, a single primary in one failure domain, or when network partitions are outside the design target.",
    risk: "The risk is assuming partitions do not matter. Once they do, CA is no longer a valid steady-state guarantee.",
    examples: [
      "Single-node PostgreSQL",
      "Traditional SQL in one region",
      "Centralized leader-based deployments",
    ],
    familyFit:
      "Common mental model for relational systems before you distribute them across unreliable network boundaries.",
  },
  cp: {
    key: "cp",
    label: "CP",
    color: "#f472b6",
    keeps: ["consistency", "partition-tolerance"],
    givesUp: "availability",
    summary:
      "CP systems keep one correct view of data across a partition, even if they must reject or delay some requests.",
    normalBehavior:
      "Leader election, quorum checks, or write coordination keep data aligned before the system admits success.",
    partitionBehavior:
      "During a partition, the system would rather fail or pause requests than allow stale or conflicting writes.",
    chooseWhen:
      "Choose this posture when stale reads, double-spend, or contradictory writes are worse than temporary errors.",
    risk: "The risk is user-visible unavailability during elections, quorum loss, or split-brain prevention.",
    examples: ["MongoDB replica set", "ZooKeeper", "HBase", "Etcd"],
    familyFit:
      "Typical for leader-based document stores, coordination systems, and consistency-first distributed data platforms.",
  },
  ap: {
    key: "ap",
    label: "AP",
    color: "#34d399",
    keeps: ["availability", "partition-tolerance"],
    givesUp: "consistency",
    summary:
      "AP systems keep answering requests on both sides of a partition and repair divergence later.",
    normalBehavior:
      "Replicas favor responsiveness and local acceptance of writes, often with reconciliation or conflict resolution afterwards.",
    partitionBehavior:
      "During a partition, different nodes may temporarily return different answers, but the service keeps responding.",
    chooseWhen:
      "Choose this posture when uptime and low latency are more important than every node seeing the exact latest value immediately.",
    risk: "The risk is stale reads, conflicting writes, and the need for downstream reconciliation or idempotent logic.",
    examples: [
      "Cassandra",
      "Riak",
      "Dynamo-style stores",
      "Multi-region caches",
    ],
    familyFit:
      "Typical for availability-first key-value and wide-column systems designed to stay responsive under partition.",
  },
};

export const CAP_PROFILE_FOR_VARIANT: Record<VariantKey, CapProfileKey> = {
  relational: "ca",
  document: "cp",
  "key-value": "ap",
  "wide-column": "ap",
  graph: "cp",
};

export const VARIANT_PROFILES: Record<VariantKey, VariantProfile> = {
  relational: {
    key: "relational",
    label: "Relational",
    shortLabel: "RDBMS",
    family: "Relational",
    color: "#60a5fa",
    accentText: "SQL tables, ACID, and joins",
    overview:
      "Structured tables with predefined schemas, SQL, and strong transactional guarantees.",
    dataModel:
      "Rows and columns with clear keys, foreign keys, and normalized structure.",
    consistencyModel:
      "ACID and strong consistency for transactional workloads.",
    scaleModel:
      "Usually scales up first, then out carefully with replicas and partitioning.",
    queryModel:
      "SQL, joins, reporting, and secondary indexes across related tables.",
    visibleTags: ["SQL tables", "ACID", "joins + keys"],
    examples: ["PostgreSQL", "MySQL", "SQL Server", "Oracle"],
    strengths: [
      "Strong data consistency and ACID transactions.",
      "Excellent for highly structured data and complex relational queries.",
      "Primary and foreign keys keep relationships explicit.",
    ],
    tradeoffs: [
      "Rigid schemas slow down fast-changing document-style data.",
      "Horizontal write scaling is harder than in distributed NoSQL systems.",
      "Not the best default for huge write-heavy or key-only workloads.",
    ],
    shapeNote:
      "Rigid schemas shine when the data is highly structured, predictable, and normalized.",
    accessNote:
      "SQL and joins are strongest when queries span related tables, reports, and secondary filters.",
    consistencyNote:
      "ACID transactions fit services that cannot tolerate double-spend, partial writes, or conflicting balances.",
    scaleNote:
      "Relational systems usually scale up first. That is fine when workload volume is manageable and correctness matters more than unconstrained fan-out.",
    summaryNote:
      "you need strict transactions, normalized data, and complex relational queries.",
    capabilities: {
      transactions: 5,
      schemaFlex: 2,
      embeddedReads: 1,
      keyLookups: 3,
      writeScale: 2,
      columnAnalytics: 2,
      relationships: 2,
      availability: 3,
      joins: 5,
    },
  },
  document: {
    key: "document",
    label: "Document",
    shortLabel: "Document",
    family: "NoSQL",
    color: "#34d399",
    accentText: "JSON documents with flexible schema",
    overview:
      "Self-contained documents such as JSON or BSON with room for each record to evolve independently.",
    dataModel:
      "Collections of documents with embedded fields and flexible per-document structure.",
    consistencyModel:
      "Often per-document atomic with less emphasis on cross-document ACID workflows.",
    scaleModel:
      "Scales horizontally for read-heavy content and product-style data sets.",
    queryModel:
      "Fetch one aggregate document, nested attributes, and hierarchical reads with fewer joins.",
    visibleTags: ["JSON / BSON", "flexible schema", "embed related data"],
    examples: ["MongoDB", "Couchbase", "Amazon DocumentDB"],
    strengths: [
      "Flexible schema for rapidly evolving or variable product attributes.",
      "Documents are self-contained and good for hierarchical data.",
      "Embedding related data reduces the need for complex joins.",
    ],
    tradeoffs: [
      "Cross-document transactions and joins are weaker than in RDBMS.",
      "Denormalization can duplicate data across documents.",
      "Not ideal when the primary question is graph traversal or strict ledgers.",
    ],
    shapeNote:
      "Document stores fit data that arrives as self-contained JSON and changes shape frequently.",
    accessNote:
      "Embedding related data removes many joins and keeps hierarchical reads inside one document.",
    consistencyNote:
      "They usually trade some cross-document transactional convenience for schema flexibility and easier distribution.",
    scaleNote:
      "Horizontal scaling works well for read-heavy product and content workloads.",
    summaryNote:
      "the service owns flexible, nested data that is usually fetched as one aggregate.",
    capabilities: {
      transactions: 2,
      schemaFlex: 5,
      embeddedReads: 5,
      keyLookups: 3,
      writeScale: 3,
      columnAnalytics: 2,
      relationships: 1,
      availability: 4,
      joins: 2,
    },
  },
  "key-value": {
    key: "key-value",
    label: "Key-Value",
    shortLabel: "Key-Value",
    family: "NoSQL",
    color: "#f59e0b",
    accentText: "Simplest model: key in, value out",
    overview:
      "A collection of unique keys mapped to values, optimized for one-hop lookups and simple updates.",
    dataModel: "Opaque or lightweight values addressed by a unique key.",
    consistencyModel:
      "Often tuned for availability and speed over rich transactional semantics.",
    scaleModel:
      "Built for low-latency horizontal scale, TTL, caching, and session-style traffic.",
    queryModel:
      "Get, set, expire, and increment by key without joins or broad filtering.",
    visibleTags: ["key → value", "fast lookups", "simple read / write"],
    examples: ["Redis", "Memcached", "DynamoDB"],
    strengths: [
      "Extremely fast lookups by key.",
      "Highly scalable for simple read and write operations.",
      "Excellent for caching, sessions, and real-time lookup paths.",
    ],
    tradeoffs: [
      "No natural fit for joins, graph traversal, or ad-hoc reporting.",
      "You need the key up front; exploratory queries are weak.",
      "Not a good fit for rich relational invariants.",
    ],
    shapeNote:
      "Key-value stores work best when the data can be addressed by a unique key without rich relationships.",
    accessNote:
      "They are built for extremely fast get/set paths, not joins, filters, or graph-style questions.",
    consistencyNote:
      "Teams often choose them when availability and latency matter more than complex transactional guarantees.",
    scaleNote:
      "They scale horizontally for simple, hot read/write paths such as sessions, carts, and caches.",
    summaryNote:
      "the request path already knows the key and needs speed more than query richness.",
    capabilities: {
      transactions: 1,
      schemaFlex: 2,
      embeddedReads: 1,
      keyLookups: 5,
      writeScale: 4,
      columnAnalytics: 0,
      relationships: 0,
      availability: 5,
      joins: 0,
    },
  },
  "wide-column": {
    key: "wide-column",
    label: "Wide Column",
    shortLabel: "Wide Column",
    family: "NoSQL",
    color: "#a78bfa",
    accentText: "Column families for big, write-heavy data",
    overview:
      "Rows grouped into column families with dynamic columns, tuned for huge datasets and partitioned writes.",
    dataModel:
      "Rows and dynamic columns organized by partition key and column family.",
    consistencyModel:
      "Usually favors distributed writes with tunable or eventual consistency.",
    scaleModel:
      "Excellent for massive horizontal write throughput and large analytic data footprints.",
    queryModel:
      "Read only the columns you need across large partitions or time windows.",
    visibleTags: ["column families", "write-heavy", "big data reads"],
    examples: ["Apache Cassandra", "Apache HBase", "Google Bigtable"],
    strengths: [
      "Optimized for large datasets that access specific columns.",
      "Reads of selected columns are efficient.",
      "Highly scalable for write-heavy, time-series, and logging workloads.",
    ],
    tradeoffs: [
      "Data modeling is query-first and often denormalized.",
      "Not ideal for joins or flexible graph traversal.",
      "Operationally more specialized than a simple document or relational store.",
    ],
    shapeNote:
      "Wide-column models group data into column families and tolerate sparse, evolving columns at scale.",
    accessNote:
      "They excel when reads touch only specific columns across large partitions or time windows.",
    consistencyNote:
      "The model usually assumes tunable or eventual consistency instead of strict relational ACID.",
    scaleNote:
      "They are built for high-write, distributed workloads such as telemetry, logs, and time-series data.",
    summaryNote:
      "you need horizontally scalable writes and column-oriented reads over large datasets.",
    capabilities: {
      transactions: 1,
      schemaFlex: 3,
      embeddedReads: 1,
      keyLookups: 3,
      writeScale: 5,
      columnAnalytics: 5,
      relationships: 0,
      availability: 5,
      joins: 0,
    },
  },
  graph: {
    key: "graph",
    label: "Graph",
    shortLabel: "Graph",
    family: "NoSQL",
    color: "#f472b6",
    accentText: "Nodes and edges for connected queries",
    overview:
      "Entities are nodes, relationships are edges, and traversal is a first-class query shape.",
    dataModel:
      "Nodes, edges, and properties where relationships matter as much as attributes.",
    consistencyModel:
      "Often chosen for traversal power and connected-domain clarity over generic SQL-style reporting.",
    scaleModel:
      "Specialized for connected domains rather than simple key throughput or column analytics.",
    queryModel:
      "Traverse neighbors, paths, recommendations, fraud links, and multi-hop relationships.",
    visibleTags: ["nodes + edges", "traversal", "connected data"],
    examples: ["Neo4j", "Amazon Neptune", "Cosmos DB (Gremlin)"],
    strengths: [
      "Stores data as nodes and edges for rich relationship queries.",
      "Excellent when the connections are as important as the data itself.",
      "Strong fit for recommendation engines, fraud graphs, and social networks.",
    ],
    tradeoffs: [
      "Overkill for simple key-value or tabular transaction workloads.",
      "Specialized operational model and query language.",
      "Not the cheapest choice for pure write-throughput or reporting workloads.",
    ],
    shapeNote:
      "Graph stores model entities as nodes and relationships as first-class edges.",
    accessNote:
      "They are strongest when the real question is about traversing relationships, paths, and neighborhoods.",
    consistencyNote:
      "They optimize connected queries rather than pretending relationships are just foreign keys in flat rows.",
    scaleNote:
      "They are selected for traversal-heavy domains even if that means more specialized operational trade-offs.",
    summaryNote: "connections are as important as the records themselves.",
    capabilities: {
      transactions: 2,
      schemaFlex: 4,
      embeddedReads: 2,
      keyLookups: 1,
      writeScale: 2,
      columnAnalytics: 1,
      relationships: 5,
      availability: 3,
      joins: 3,
    },
  },
};

export const SCENARIO_PROFILES: Record<ScenarioKey, ScenarioProfile> = {
  payments: {
    key: "payments",
    label: "Payments and Ordering",
    shortLabel: "Payments",
    serviceName: "Ordering / Payment Service",
    color: "#60a5fa",
    description:
      "A money-moving service cares about transactional integrity, explicit relationships, and predictable schemas.",
    recommended: "relational",
    requirements: [
      "Structured tables and clear keys",
      "Joins and transactional reports",
      "Strong consistency and ACID",
      "Scale carefully, not blindly",
    ],
    dataShapeNeed:
      "The data is highly structured and predictable: orders, payments, balances, and foreign-key style relationships.",
    accessNeed:
      "The service needs SQL, joins, and reporting across related entities instead of one-key lookups or graph traversals.",
    consistencyNeed:
      "Atomicity, consistency, isolation, and durability matter more than squeezing out every millisecond of distributed availability.",
    scaleNeed:
      "The workload is usually manageable with controlled scaling because correctness matters more than unconstrained write fan-out.",
    summaryNeed:
      "the workload needs ACID, strong consistency, and relational queries inside clear transactional boundaries",
    polyglotService: "ordering",
    weights: {
      transactions: 5,
      schemaFlex: 1,
      embeddedReads: 1,
      keyLookups: 2,
      writeScale: 2,
      columnAnalytics: 1,
      relationships: 1,
      availability: 2,
      joins: 5,
    },
  },
  catalog: {
    key: "catalog",
    label: "Catalog and Content",
    shortLabel: "Catalog",
    serviceName: "Catalog Service",
    color: "#34d399",
    description:
      "A product catalog changes shape constantly, carries nested attributes, and is usually read as one product aggregate.",
    recommended: "document",
    requirements: [
      "Flexible product schema",
      "Nested attributes, fewer joins",
      "Moderate consistency is acceptable",
      "Scale reads across many products",
    ],
    dataShapeNeed:
      "Product documents evolve frequently and different items can have completely different fields.",
    accessNeed:
      "The usual read path wants one product with embedded attributes and variants, not relational joins across many tables.",
    consistencyNeed:
      "Per-document correctness matters, but the service rarely needs strict multi-entity ACID like a payment ledger.",
    scaleNeed:
      "Read-heavy traffic and flexible product onboarding matter more than perfectly normalized schemas.",
    summaryNeed:
      "the service owns flexible, nested product data that is fetched as a document-shaped aggregate",
    polyglotService: "catalog",
    weights: {
      transactions: 1,
      schemaFlex: 5,
      embeddedReads: 5,
      keyLookups: 3,
      writeScale: 2,
      columnAnalytics: 1,
      relationships: 1,
      availability: 3,
      joins: 1,
    },
  },
  sessions: {
    key: "sessions",
    label: "Cart and Session State",
    shortLabel: "Sessions",
    serviceName: "Cart / Session Service",
    color: "#f59e0b",
    description:
      "Session-heavy services want very fast key lookups, simple state updates, and high availability under bursty traffic.",
    recommended: "key-value",
    requirements: [
      "Simple value payloads",
      "Get by key in one hop",
      "Availability over rich queries",
      "Horizontal low-latency scale",
    ],
    dataShapeNeed:
      "The state is usually small, ephemeral, and naturally addressed by a cart ID, user ID, or session key.",
    accessNeed:
      "The hot path knows the key already. It does not need joins, graph traversal, or wide analytics.",
    consistencyNeed:
      "The system usually values speed and availability over relational guarantees or multi-entity transactions.",
    scaleNeed:
      "Burst traffic, TTL, and huge parallel lookups push the service toward horizontally scalable low-latency storage.",
    summaryNeed:
      "the request path already knows the key and mainly needs speed, TTL, and availability",
    polyglotService: "cart",
    weights: {
      transactions: 1,
      schemaFlex: 2,
      embeddedReads: 1,
      keyLookups: 5,
      writeScale: 4,
      columnAnalytics: 1,
      relationships: 0,
      availability: 5,
      joins: 0,
    },
  },
  telemetry: {
    key: "telemetry",
    label: "Telemetry and Event Metrics",
    shortLabel: "Telemetry",
    serviceName: "Telemetry / Events Service",
    color: "#a78bfa",
    description:
      "Metrics and event streams are write-heavy, time-oriented, and often queried by partition, time window, or a few selected columns.",
    recommended: "wide-column",
    requirements: [
      "Dynamic columns at huge scale",
      "Read only the needed columns",
      "Eventual consistency is fine",
      "Write-heavy horizontal scale",
    ],
    dataShapeNeed:
      "The dataset grows quickly and often benefits from sparse, evolving columns grouped by partition and time.",
    accessNeed:
      "Queries usually target slices of columns over a very large dataset rather than full relational joins.",
    consistencyNeed:
      "The service can usually tolerate eventual or tunable consistency because the focus is ingestion and analytics, not ledgers.",
    scaleNeed:
      "Horizontal write throughput and big-data style partitions are the main pressure, not rich transactional semantics.",
    summaryNeed:
      "the service is dominated by write-heavy time-series or analytic access patterns over a large dataset",
    polyglotService: "analytics",
    weights: {
      transactions: 0,
      schemaFlex: 3,
      embeddedReads: 1,
      keyLookups: 2,
      writeScale: 5,
      columnAnalytics: 5,
      relationships: 0,
      availability: 5,
      joins: 0,
    },
  },
  recommendations: {
    key: "recommendations",
    label: "Recommendations and Fraud Links",
    shortLabel: "Graph",
    serviceName: "Recommendation / Fraud Service",
    color: "#f472b6",
    description:
      "This service cares about multi-hop relationships, neighborhoods, and connected entities more than flat rows or key-only reads.",
    recommended: "graph",
    requirements: [
      "Connected entities and edges",
      "Multi-hop traversals matter",
      "Consistency is contextual",
      "Scale around graph queries",
    ],
    dataShapeNeed:
      "Entities such as users, products, merchants, and events are valuable mainly because of the relationships between them.",
    accessNeed:
      "The core question is about traversing paths, recommendations, and graph neighborhoods, not about joining flat tables once.",
    consistencyNeed:
      "The model should preserve relationship meaning, but the service is not primarily about financial-grade ACID transactions.",
    scaleNeed:
      "The pressure is on relationship traversal and graph-friendly query performance rather than pure key throughput.",
    summaryNeed:
      "the connections between entities are as important as the entities themselves",
    polyglotService: "recommendations",
    weights: {
      transactions: 1,
      schemaFlex: 3,
      embeddedReads: 2,
      keyLookups: 2,
      writeScale: 2,
      columnAnalytics: 1,
      relationships: 5,
      availability: 3,
      joins: 2,
    },
  },
};

export const POLYGLOT_STACK: Array<{
  key: PolyglotServiceKey;
  service: string;
  storeLabel: string;
  variant: VariantKey;
  reason: string;
}> = [
  {
    key: "catalog",
    service: "Catalog",
    storeLabel: "Document",
    variant: "document",
    reason: "Flexible product attributes",
  },
  {
    key: "cart",
    service: "Cart",
    storeLabel: "Key-Value",
    variant: "key-value",
    reason: "Fast session lookups",
  },
  {
    key: "ordering",
    service: "Ordering",
    storeLabel: "RDBMS",
    variant: "relational",
    reason: "Transactions and invariants",
  },
  {
    key: "analytics",
    service: "Analytics",
    storeLabel: "Wide Column",
    variant: "wide-column",
    reason: "Write-heavy telemetry",
  },
  {
    key: "recommendations",
    service: "Recommender",
    storeLabel: "Graph",
    variant: "graph",
    reason: "Relationship traversal",
  },
];

const ALL_TRAITS: TraitKey[] = [
  "transactions",
  "schemaFlex",
  "embeddedReads",
  "keyLookups",
  "writeScale",
  "columnAnalytics",
  "relationships",
  "availability",
  "joins",
];

const QUERY_TRAITS: TraitKey[] = [
  "embeddedReads",
  "keyLookups",
  "columnAnalytics",
  "relationships",
  "joins",
];

const CONSISTENCY_TRAITS: TraitKey[] = ["transactions", "availability"];
const SCALE_TRAITS: TraitKey[] = ["writeScale", "availability"];

export interface DatabaseSelectionState extends LabState {
  lessonMode: LessonMode;
  variant: VariantKey;
  scenario: ScenarioKey;
  capProfile: CapProfileKey;
  partitionStrategy: PartitionStrategyKey;
  partitionLevel: PartitionLevel;
  partitionCount: number;
  partitionThroughput: number;
  partitionJoinCost: number;
  partitionRoutingCost: number;
  partitionIsolation: number;
  fitScore: number;
  queryFit: number;
  consistencyFit: number;
  scaleFit: number;
  recommendedVariant: VariantKey;
  recommendationLevel: FitBand;
}

export function defaultCapProfileForVariant(
  variant: VariantKey,
): CapProfileKey {
  return CAP_PROFILE_FOR_VARIANT[variant];
}

function maxPartitionLevel(
  strategy: Exclude<PartitionStrategyKey, "none">,
): PartitionLevel {
  return PARTITION_STAGE_PROFILES[strategy].at(-1)?.level ?? 0;
}

function currentPartitionStageProfile(
  strategy: PartitionStrategyKey,
  level: PartitionLevel,
) {
  if (strategy === "none" || level === 0) return null;
  return (
    PARTITION_STAGE_PROFILES[strategy].find(
      (profile) => profile.level === level,
    ) ?? null
  );
}

function weightedScore(
  capabilities: Record<TraitKey, number>,
  weights: Record<TraitKey, number>,
  traits: TraitKey[],
): number {
  let total = 0;
  let maxTotal = 0;

  traits.forEach((trait) => {
    const weight = weights[trait];
    if (weight <= 0) return;
    total += capabilities[trait] * weight;
    maxTotal += 5 * weight;
  });

  if (maxTotal === 0) return 0;
  return Math.round((total / maxTotal) * 100);
}

export function fitBandForScore(score: number): FitBand {
  if (score >= 70) return "strong match";
  if (score >= 50) return "workable";
  return "stretch";
}

export function selectionIntroFor(state: DatabaseSelectionState): string {
  const scenario = SCENARIO_PROFILES[state.scenario];
  const selected = VARIANT_PROFILES[state.variant];
  const recommended = VARIANT_PROFILES[state.recommendedVariant];

  if (state.variant === state.recommendedVariant) {
    return `${scenario.serviceName} is currently lined up with ${selected.label}. This scenario is a ${state.recommendationLevel} at ${state.fitScore}/100.`;
  }

  return `${scenario.serviceName} is currently evaluating ${selected.label} at ${state.fitScore}/100. ${recommended.label} is the stronger default for this workload.`;
}

function capPropertiesFor(profile: CapProfile): string {
  return profile.keeps
    .map((key) => CAP_PROPERTY_PROFILES[key].shortLabel)
    .join(" + ");
}

export function capIntroFor(state: DatabaseSelectionState): string {
  const profile = CAP_PROFILES[state.capProfile];
  const dropped = CAP_PROPERTY_PROFILES[profile.givesUp];

  return `${profile.label} keeps ${capPropertiesFor(profile)} and gives up ${dropped.shortLabel} when the network is partitioned. ${profile.partitionBehavior}`;
}

export function partitioningIntroFor(state: DatabaseSelectionState): string {
  const strategy = state.partitionStrategy;
  const level = state.partitionLevel;

  if (strategy === "none" || level === 0) {
    return "Start with one large database. Then press Horizontal or Vertical to see how splitting rows or columns changes throughput, routing, and join complexity.";
  }

  const strategyMeta = PARTITION_STRATEGY_META[strategy];
  const profile = currentPartitionStageProfile(strategy, level);
  if (!profile) {
    return "Choose a partitioning strategy to inspect how the database changes as it is split.";
  }

  return `${strategyMeta.label} is now at ${profile.label}. ${profile.changeSummary} ${profile.tradeoff}`;
}

export function computeMetrics(state: DatabaseSelectionState) {
  const scenario = SCENARIO_PROFILES[state.scenario];
  const selected = VARIANT_PROFILES[state.variant];

  state.fitScore = weightedScore(
    selected.capabilities,
    scenario.weights,
    ALL_TRAITS,
  );
  state.queryFit = weightedScore(
    selected.capabilities,
    scenario.weights,
    QUERY_TRAITS,
  );
  state.consistencyFit = weightedScore(
    selected.capabilities,
    scenario.weights,
    CONSISTENCY_TRAITS,
  );
  state.scaleFit = weightedScore(
    selected.capabilities,
    scenario.weights,
    SCALE_TRAITS,
  );

  let bestVariant = VARIANT_KEYS[0];
  let bestScore = weightedScore(
    VARIANT_PROFILES[bestVariant].capabilities,
    scenario.weights,
    ALL_TRAITS,
  );

  VARIANT_KEYS.slice(1).forEach((key) => {
    const score = weightedScore(
      VARIANT_PROFILES[key].capabilities,
      scenario.weights,
      ALL_TRAITS,
    );
    if (score > bestScore) {
      bestScore = score;
      bestVariant = key;
    }
  });

  state.recommendedVariant = bestVariant;
  state.recommendationLevel = fitBandForScore(state.fitScore);
}

export function computePartitionMetrics(state: DatabaseSelectionState) {
  const profile = currentPartitionStageProfile(
    state.partitionStrategy,
    state.partitionLevel,
  );

  if (!profile) {
    state.partitionCount = PARTITION_BASELINE.partitionCount;
    state.partitionThroughput = PARTITION_BASELINE.throughput;
    state.partitionJoinCost = PARTITION_BASELINE.joinCost;
    state.partitionRoutingCost = PARTITION_BASELINE.routingCost;
    state.partitionIsolation = PARTITION_BASELINE.isolation;
    return;
  }

  state.partitionCount = profile.partitionCount;
  state.partitionThroughput = profile.throughput;
  state.partitionJoinCost = profile.joinCost;
  state.partitionRoutingCost = profile.routingCost;
  state.partitionIsolation = profile.isolation;
}

function resetVisualState(state: DatabaseSelectionState) {
  state.hotZones = [];
  computeMetrics(state);
  computePartitionMetrics(state);

  if (state.lessonMode === "cap") {
    state.phase = "cap-overview";
    state.explanation = capIntroFor(state);
    return;
  }

  if (state.lessonMode === "partitioning") {
    state.phase = "partition-overview";
    state.explanation = partitioningIntroFor(state);
    return;
  }

  state.phase = "overview";
  state.explanation = selectionIntroFor(state);
}

export const initialState: DatabaseSelectionState = {
  lessonMode: "selection",
  variant: "relational",
  scenario: "payments",
  capProfile: "ca",
  partitionStrategy: "none",
  partitionLevel: 0,
  partitionCount: PARTITION_BASELINE.partitionCount,
  partitionThroughput: PARTITION_BASELINE.throughput,
  partitionJoinCost: PARTITION_BASELINE.joinCost,
  partitionRoutingCost: PARTITION_BASELINE.routingCost,
  partitionIsolation: PARTITION_BASELINE.isolation,
  fitScore: 0,
  queryFit: 0,
  consistencyFit: 0,
  scaleFit: 0,
  recommendedVariant: "relational",
  recommendationLevel: "strong match",
  hotZones: [],
  explanation:
    "Select a microservice workload and compare the database families one decision lens at a time.",
  phase: "overview",
};

computeMetrics(initialState);
computePartitionMetrics(initialState);
initialState.capProfile = defaultCapProfileForVariant(initialState.variant);
initialState.explanation = selectionIntroFor(initialState);

const databaseSelectionSlice = createSlice({
  name: "databaseSelection",
  initialState,
  reducers: {
    reset: () => {
      const next = { ...initialState };
      computeMetrics(next);
      next.explanation = selectionIntroFor(next);
      return next;
    },
    softResetRun: (state) => {
      resetVisualState(state);
    },
    patchState(state, action: PayloadAction<Partial<DatabaseSelectionState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setLessonMode(state, action: PayloadAction<LessonMode>) {
      state.lessonMode = action.payload;
      if (action.payload === "cap") {
        state.capProfile = defaultCapProfileForVariant(state.variant);
      }
      if (action.payload === "partitioning") {
        state.partitionStrategy = "none";
        state.partitionLevel = 0;
      }
      resetVisualState(state);
    },
    setCapProfile(state, action: PayloadAction<CapProfileKey>) {
      state.capProfile = action.payload;
      resetVisualState(state);
    },
    pressPartitionStrategy(
      state,
      action: PayloadAction<Exclude<PartitionStrategyKey, "none">>,
    ) {
      const strategy = action.payload;

      if (state.partitionStrategy !== strategy) {
        state.partitionStrategy = strategy;
        state.partitionLevel = 1;
      } else {
        state.partitionLevel = Math.min(
          (state.partitionLevel + 1) as PartitionLevel,
          maxPartitionLevel(strategy),
        ) as PartitionLevel;
      }

      resetVisualState(state);
    },
    setVariant(state, action: PayloadAction<VariantKey>) {
      state.variant = action.payload;
      resetVisualState(state);
    },
    setScenario(state, action: PayloadAction<ScenarioKey>) {
      state.scenario = action.payload;
      resetVisualState(state);
    },
  },
});

export const {
  reset,
  softResetRun,
  patchState,
  recalcMetrics,
  setLessonMode,
  setCapProfile,
  pressPartitionStrategy,
  setVariant,
  setScenario,
} = databaseSelectionSlice.actions;

export default databaseSelectionSlice.reducer;
