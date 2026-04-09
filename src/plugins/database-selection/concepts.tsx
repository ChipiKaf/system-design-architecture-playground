import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "relational"
  | "document"
  | "key-value"
  | "wide-column"
  | "graph"
  | "acid-vs-base"
  | "cap-theorem"
  | "consistency-cap"
  | "availability-cap"
  | "partition-tolerance"
  | "ca-systems"
  | "cp-systems"
  | "ap-systems"
  | "partitioning-basics"
  | "horizontal-partitioning"
  | "vertical-partitioning"
  | "shard-keys"
  | "functional-partitioning"
  | "polyglot-persistence"
  | "selection-principles";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  relational: {
    title: "Relational Databases",
    subtitle: "Structured tables, SQL, ACID, and explicit relationships",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What they optimize for",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              Relational systems store data in structured tables with predefined
              schemas. SQL is the main query language for selecting,
              aggregating, and joining data across related tables.
            </p>
            <p style={{ marginTop: 8 }}>
              They are strongest when the service cares about strong data
              consistency, explicit keys, and multi-table transactional rules.
            </p>
          </>
        ),
      },
      {
        title: "When to use them",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Strong consistency and ACID compliance are required.</li>
            <li>Data is highly structured and predictable.</li>
            <li>Complex queries and joins are part of the workload.</li>
            <li>Normalization and integrity constraints matter.</li>
          </ul>
        ),
      },
      {
        title: "Examples",
        accent: "#94a3b8",
        content: (
          <p>
            PostgreSQL, MySQL, SQL Server, and Oracle are the standard examples.
            In microservices, these are often a strong fit for ordering,
            payments, and ledger-style services.
          </p>
        ),
      },
    ],
  },
  document: {
    title: "Document Databases",
    subtitle: "Flexible JSON-like documents with embedded structure",
    accentColor: "#34d399",
    sections: [
      {
        title: "What they optimize for",
        accent: "#34d399",
        content: (
          <>
            <p>
              Document databases store records as self-contained documents,
              usually JSON or BSON. Each document can carry its own structure,
              which makes the model flexible when the shape changes over time.
            </p>
            <p style={{ marginTop: 8 }}>
              Related fields are often embedded together so a service can fetch
              one product, article, or profile aggregate without assembling a
              chain of joins.
            </p>
          </>
        ),
      },
      {
        title: "When to use them",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Flexible schema and dynamic data are required.</li>
            <li>Each document should be largely self-contained.</li>
            <li>Hierarchical data is usually embedded in one aggregate.</li>
            <li>
              Reducing complex joins matters more than strict normalization.
            </li>
          </ul>
        ),
      },
      {
        title: "Examples",
        accent: "#94a3b8",
        content: (
          <p>
            MongoDB, Couchbase, and Amazon DocumentDB are the typical examples.
            Catalog, content, and profile services often land here.
          </p>
        ),
      },
    ],
  },
  "key-value": {
    title: "Key-Value Databases",
    subtitle: "The simplest NoSQL model: key in, value out",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What they optimize for",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              A key-value store keeps data as a collection of key-value pairs.
              The main question is simple: do you already know the key?
            </p>
            <p style={{ marginTop: 8 }}>
              If the request path already knows the session ID, cart ID, or
              cache key, this model is often the fastest and operationally
              simplest answer.
            </p>
          </>
        ),
      },
      {
        title: "When to use them",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Extremely fast lookups by key are the priority.</li>
            <li>Read and write paths are simple and predictable.</li>
            <li>High availability and horizontal scale matter.</li>
            <li>
              Joins, graph traversal, and rich filtering are not required.
            </li>
          </ul>
        ),
      },
      {
        title: "Examples",
        accent: "#94a3b8",
        content: (
          <p>
            Redis, Memcached, DynamoDB, and Azure Cache for Redis are common.
            Session, cache, and real-time cart lookups are classic fits.
          </p>
        ),
      },
    ],
  },
  "wide-column": {
    title: "Wide-Column Databases",
    subtitle: "Column families, huge write throughput, and large datasets",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What they optimize for",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              Wide-column systems store data in rows with dynamic columns,
              usually grouped into column families. They are built for huge,
              partitioned datasets where the query shape is known up front.
            </p>
            <p style={{ marginTop: 8 }}>
              Instead of asking for rich relational joins, the workload usually
              wants fast writes and efficient reads of only the columns it
              needs.
            </p>
          </>
        ),
      },
      {
        title: "When to use them",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Queries touch specific columns over very large datasets.</li>
            <li>Write-heavy workloads dominate the architecture.</li>
            <li>
              Time-series, logging, or big-data style access patterns matter.
            </li>
            <li>Horizontal scale is more important than relational joins.</li>
          </ul>
        ),
      },
      {
        title: "Examples",
        accent: "#94a3b8",
        content: (
          <p>
            Apache Cassandra, Apache HBase, Google Bigtable, and Cosmos DB's
            Cassandra API are common wide-column choices for telemetry and large
            event stores.
          </p>
        ),
      },
    ],
  },
  graph: {
    title: "Graph Databases",
    subtitle: "Nodes and edges where relationships are first-class data",
    accentColor: "#f472b6",
    sections: [
      {
        title: "What they optimize for",
        accent: "#f472b6",
        content: (
          <>
            <p>
              Graph databases store entities as nodes and relationships as
              edges. The main advantage is that traversing connected data is a
              core operation rather than an awkward afterthought.
            </p>
            <p style={{ marginTop: 8 }}>
              They are strongest when the question is about paths, neighbors,
              recommendations, or fraud rings instead of flat row lookups.
            </p>
          </>
        ),
      },
      {
        title: "When to use them",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Data is naturally modeled as nodes and relationships.</li>
            <li>Traversing multi-hop connections is part of the workload.</li>
            <li>Connections matter as much as the records themselves.</li>
            <li>
              Recommendation, fraud, and knowledge-graph queries dominate.
            </li>
          </ul>
        ),
      },
      {
        title: "Examples",
        accent: "#94a3b8",
        content: (
          <p>
            Neo4j, Amazon Neptune, and Cosmos DB's Gremlin API are common graph
            choices for recommendation and connected-entity domains.
          </p>
        ),
      },
    ],
  },
  "acid-vs-base": {
    title: "ACID vs BASE",
    subtitle:
      "Consistency, availability, and transaction boundaries drive the choice",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Relational default",
        accent: "#60a5fa",
        content: (
          <p>
            Relational systems usually emphasize ACID: atomicity, consistency,
            isolation, and durability. That is why they remain a strong fit for
            ordering, payments, and strict workflow invariants.
          </p>
        ),
      },
      {
        title: "NoSQL trade-off",
        accent: "#34d399",
        content: (
          <p>
            Many NoSQL systems lean toward BASE-style thinking: basically
            available, soft state, and eventual consistency. That trade can be
            correct when the payoff is higher scale, simpler distribution, or a
            data model that better matches the workload.
          </p>
        ),
      },
      {
        title: "How to decide",
        accent: "#f59e0b",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Start with transactional boundaries, not vendor names.</li>
            <li>If double-spend is unacceptable, stay close to ACID.</li>
            <li>
              If the workload is eventually consistent by nature, exploit that.
            </li>
            <li>
              Always weigh consistency against scale and availability needs.
            </li>
          </ul>
        ),
      },
    ],
  },
  "cap-theorem": {
    title: "CAP Theorem",
    subtitle:
      "In a distributed system under partition, you choose which pair survives",
    accentColor: "#f472b6",
    sections: [
      {
        title: "The three properties",
        accent: "#f472b6",
        content: (
          <>
            <p>
              <strong>Consistency (C):</strong> reads see the latest
              acknowledged write or fail.
            </p>
            <p>
              <strong>Availability (A):</strong> every request gets a non-error
              response.
            </p>
            <p>
              <strong>Partition tolerance (P):</strong> the system keeps
              operating even if replicas cannot communicate.
            </p>
          </>
        ),
      },
      {
        title: "The impossible triangle",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Once the network is partitioned, a distributed system cannot keep
              all three at once. The real choice becomes <strong>C</strong>
              versus <strong>A</strong> while still tolerating{" "}
              <strong>P</strong>.
            </p>
            <p>
              That is why CAP is not a vendor slogan. It is a failure-mode
              decision about what the system does when replicas stop talking.
            </p>
          </>
        ),
      },
    ],
  },
  "consistency-cap": {
    title: "Consistency In CAP",
    subtitle: "One correct view of data, even under coordination pressure",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What it means",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              CAP consistency means clients do not see different truths at the
              same time. A read gets the latest acknowledged write or it fails.
            </p>
            <p>
              This is different from ACID consistency, which is about database
              rules and valid state transitions.
            </p>
          </>
        ),
      },
      {
        title: "What it costs",
        accent: "#f59e0b",
        content: (
          <p>
            Protecting C during a partition usually means quorum checks, leader
            election, blocked writes, or outright request failures.
          </p>
        ),
      },
    ],
  },
  "availability-cap": {
    title: "Availability In CAP",
    subtitle: "Always answer, even if the freshest state is not everywhere yet",
    accentColor: "#34d399",
    sections: [
      {
        title: "What it means",
        accent: "#34d399",
        content: (
          <>
            <p>
              CAP availability means every request receives a response. The
              trade-off is that the response may not reflect the latest write on
              every replica.
            </p>
            <p>
              Availability is attractive for user-facing systems that must keep
              responding under failure.
            </p>
          </>
        ),
      },
      {
        title: "What it costs",
        accent: "#f59e0b",
        content: (
          <p>
            Protecting A during a partition can mean stale reads, write
            conflicts, and asynchronous repair after the network heals.
          </p>
        ),
      },
    ],
  },
  "partition-tolerance": {
    title: "Partition Tolerance",
    subtitle: "The network will split; the system still needs a failure plan",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Why it matters",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Partition tolerance matters because distributed nodes can lose
              connectivity, be delayed, or become isolated from each other.
            </p>
            <p>
              In modern distributed systems, partitions are expected events, not
              edge cases.
            </p>
          </>
        ),
      },
      {
        title: "The consequence",
        accent: "#ef4444",
        content: (
          <p>
            Once P is required, the system must decide whether to keep strong
            consistency or keep always-on availability during the split.
          </p>
        ),
      },
    ],
  },
  "ca-systems": {
    title: "CA Systems",
    subtitle:
      "Consistency plus availability, while partition is not the governing constraint",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What they do",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              CA systems behave like one correct, available source of truth as
              long as the deployment is effectively centralized or the network
              is assumed healthy.
            </p>
            <p>
              This is the classic mental model for single-node databases and
              many traditional SQL deployments.
            </p>
          </>
        ),
      },
      {
        title: "Limitation",
        accent: "#ef4444",
        content: (
          <p>
            CA is not a steady-state answer once real partitions matter. Under a
            split, the system must become CP, become AP, or stop serving.
          </p>
        ),
      },
    ],
  },
  "cp-systems": {
    title: "CP Systems",
    subtitle:
      "Consistency plus partition tolerance, even if requests must fail",
    accentColor: "#f472b6",
    sections: [
      {
        title: "What they do",
        accent: "#f472b6",
        content: (
          <>
            <p>
              CP systems preserve one correct view of data during a partition.
              They may pause writes, reject reads, or wait for leader election
              rather than admit inconsistency.
            </p>
            <p>
              That is why CP is common for coordination, ledgers, and data where
              contradictory answers are unacceptable.
            </p>
          </>
        ),
      },
      {
        title: "Examples",
        accent: "#94a3b8",
        content: (
          <p>
            MongoDB replica sets, etcd, ZooKeeper, and HBase are common CP-style
            examples.
          </p>
        ),
      },
    ],
  },
  "ap-systems": {
    title: "AP Systems",
    subtitle:
      "Availability plus partition tolerance, with eventual reconciliation",
    accentColor: "#34d399",
    sections: [
      {
        title: "What they do",
        accent: "#34d399",
        content: (
          <>
            <p>
              AP systems keep responding during a partition. Different replicas
              may accept writes independently and converge later.
            </p>
            <p>
              That makes AP a good fit when uptime and low latency matter more
              than immediate global agreement.
            </p>
          </>
        ),
      },
      {
        title: "Examples",
        accent: "#94a3b8",
        content: (
          <p>
            Cassandra, Riak, and Dynamo-style systems are standard examples of
            availability-first, eventually consistent designs.
          </p>
        ),
      },
    ],
  },
  "partitioning-basics": {
    title: "Data Partitioning",
    subtitle: "Split a large database into smaller, manageable pieces",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "What it is",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              Data partitioning divides one large database into smaller,
              independent partitions so the data tier can scale beyond a single
              server bottleneck.
            </p>
            <p>
              To clients, the system can still look like one logical database,
              even though the data is now distributed underneath.
            </p>
          </>
        ),
      },
      {
        title: "Why teams do it",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Improve throughput by spreading load across partitions.</li>
            <li>Reduce the impact of one overloaded or failed server.</li>
            <li>Keep smaller data subsets easier to manage and maintain.</li>
            <li>Move the data tier toward better scale and availability.</li>
          </ul>
        ),
      },
      {
        title: "Main strategies",
        accent: "#f59e0b",
        content: (
          <p>
            The main patterns are horizontal partitioning by rows, vertical
            partitioning by columns, and functional partitioning by bounded
            context or business capability.
          </p>
        ),
      },
    ],
  },
  "horizontal-partitioning": {
    title: "Horizontal Partitioning",
    subtitle: "Sharding divides rows across multiple partitions",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "How it works",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              Horizontal partitioning splits a table by rows. Each shard keeps
              the same schema, but only owns a subset of the total records.
            </p>
            <p>
              The routing rule is usually a partition key such as customer ID,
              region, tenant, or a hash bucket.
            </p>
          </>
        ),
      },
      {
        title: "Benefits",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Massive horizontal scale for high-volume tables.</li>
            <li>Better fault isolation when one shard has trouble.</li>
            <li>Potential geographic placement closer to users.</li>
          </ul>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#ef4444",
        content: (
          <p>
            Cross-shard joins, global aggregates, resharding, and hot-spot risk
            all become harder. A bad shard key can ruin the design.
          </p>
        ),
      },
    ],
  },
  "vertical-partitioning": {
    title: "Vertical Partitioning",
    subtitle: "Split columns so hot paths touch fewer fields",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "How it works",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              Vertical partitioning splits a table by columns. Each partition
              keeps all rows, but only a subset of the original columns.
            </p>
            <p>
              Teams often separate frequently accessed columns from large text,
              blob, audit, or rarely used columns.
            </p>
          </>
        ),
      },
      {
        title: "Benefits",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Narrow reads become cheaper and faster.</li>
            <li>
              Hot updates avoid dragging cold columns into the write path.
            </li>
            <li>Frequently changed data can be isolated from static data.</li>
          </ul>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#ef4444",
        content: (
          <p>
            Reconstructing a full row now requires joins across partitions, so
            application logic and query complexity increase as the split grows.
          </p>
        ),
      },
    ],
  },
  "shard-keys": {
    title: "Shard Keys",
    subtitle: "The routing rule decides whether sharding works or fails",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Why the key matters",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              In horizontal partitioning, the shard key decides where a row
              lives. Good keys spread traffic evenly and make common queries hit
              one shard directly.
            </p>
            <p>
              Bad keys create hot spots, poor balance, and expensive
              scatter-gather queries across many shards.
            </p>
          </>
        ),
      },
      {
        title: "Good choices",
        accent: "#22c55e",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>High-cardinality keys with even traffic distribution.</li>
            <li>Keys that appear naturally in the main query path.</li>
            <li>Stable values that do not change often.</li>
          </ul>
        ),
      },
    ],
  },
  "functional-partitioning": {
    title: "Functional Partitioning",
    subtitle: "Split data by business function or bounded context",
    accentColor: "#34d399",
    sections: [
      {
        title: "What it means",
        accent: "#34d399",
        content: (
          <>
            <p>
              Functional partitioning separates data by business capability, not
              by rows or columns alone. Product data lives with Catalog, orders
              with Ordering, payments with Billing, and so on.
            </p>
            <p>
              In microservices, this often becomes the natural outcome of
              database-per-service and bounded contexts.
            </p>
          </>
        ),
      },
      {
        title: "Why it matters",
        accent: "#f59e0b",
        content: (
          <p>
            This strategy aligns data ownership with service boundaries, which
            reduces accidental coupling and makes polyglot persistence more
            practical.
          </p>
        ),
      },
    ],
  },
  "polyglot-persistence": {
    title: "Polyglot Persistence",
    subtitle:
      "Different microservices can choose different stores for different jobs",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Core idea",
        accent: "#22c55e",
        content: (
          <p>
            The best practice in microservices is to use the right data store
            for the right service instead of defaulting to one database family
            for everything.
          </p>
        ),
      },
      {
        title: "Example mix",
        accent: "#38bdf8",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Catalog service → Document database</li>
            <li>Shopping cart or session service → Key-value store</li>
            <li>Ordering or payment service → Relational database</li>
            <li>Telemetry service → Wide-column store</li>
            <li>Recommendation service → Graph database</li>
          </ul>
        ),
      },
      {
        title: "Why it matters",
        accent: "#f59e0b",
        content: (
          <p>
            Polyglot persistence keeps service boundaries honest. Each service
            owns its data model and can choose the database family that matches
            its own access pattern, consistency model, and operational profile.
          </p>
        ),
      },
    ],
  },
  "selection-principles": {
    title: "Selection Principles",
    subtitle: "The database decision should follow the workload, not habit",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "Best practices",
        accent: "#38bdf8",
        content: (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>Use the right tool for the right job.</li>
            <li>Focus on the data type and access patterns.</li>
            <li>Consider consistency versus availability trade-offs.</li>
            <li>Align the choice with transactional boundaries.</li>
            <li>Factor in team competence and operational maturity.</li>
          </ul>
        ),
      },
      {
        title: "Relational vs NoSQL",
        accent: "#22c55e",
        content: (
          <p>
            Relational and NoSQL are not enemies. They solve different shapes of
            problems. Relational usually wins on structured transactions and
            joins. NoSQL families win when the workload naturally wants
            documents, keys, wide partitions, or graph traversal.
          </p>
        ),
      },
      {
        title: "Practical rule",
        accent: "#f59e0b",
        content: (
          <p>
            Start with the service boundary, the shape of the data, and the most
            important query. If the same choice is not obviously correct for
            Catalog, Cart, Ordering, Analytics, and Recommendations, the system
            is a polyglot candidate by default.
          </p>
        ),
      },
    ],
  },
};
