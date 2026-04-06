import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "relational"
  | "mongodb"
  | "cassandra"
  | "consistency"
  | "availability"
  | "data-modeling"
  | "cap-theorem"
  | "replication"
  | "denormalization"
  | "ledger-critical"
  | "acid";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  relational: {
    title: "Relational Database (PostgreSQL)",
    subtitle: "Structured tables with SQL and ACID guarantees",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "How it works",
        accent: "#3b82f6",
        content: (
          <p>
            Data lives in <strong>normalized tables</strong> with rows and
            columns. Foreign keys enforce relationships. Queries use SQL with
            full JOIN support.
          </p>
        ),
      },
      {
        title: "Strengths",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>ACID transactions — all-or-nothing writes</li>
            <li>Rich ad-hoc queries with SQL</li>
            <li>Strong consistency by default</li>
            <li>Well-understood integrity constraints</li>
          </ul>
        ),
      },
      {
        title: "Weaknesses",
        accent: "#3b82f6",
        content: (
          <ul>
            <li>Harder to scale horizontally</li>
            <li>Schema changes can be painful</li>
            <li>Write throughput limited by single-primary design</li>
          </ul>
        ),
      },
    ],
  },
  mongodb: {
    title: "MongoDB (Document Store)",
    subtitle: "Flexible JSON-like documents in collections",
    accentColor: "#22c55e",
    sections: [
      {
        title: "How it works",
        accent: "#22c55e",
        content: (
          <p>
            Data is stored as <strong>JSON-like documents</strong> in
            collections. Each document can have a different shape. Related data
            is often embedded (nested) inside the parent document.
          </p>
        ),
      },
      {
        title: "Strengths",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Flexible, schema-less documents</li>
            <li>Nested data avoids JOINs for common reads</li>
            <li>Horizontal scaling via sharding</li>
            <li>Fast developer iteration</li>
          </ul>
        ),
      },
      {
        title: "Weaknesses",
        accent: "#22c55e",
        content: (
          <ul>
            <li>Cross-collection "joins" are application-level</li>
            <li>Data duplication is common</li>
            <li>Less strict integrity enforcement</li>
          </ul>
        ),
      },
    ],
  },
  cassandra: {
    title: "Cassandra (Wide-Column)",
    subtitle: "Distributed-first with partition-key routing",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "How it works",
        accent: "#f59e0b",
        content: (
          <p>
            Data is organized by <strong>partition key</strong>. Each partition
            holds wide rows. Writes go to multiple replicas. No single primary —
            every node can accept reads and writes.
          </p>
        ),
      },
      {
        title: "Strengths",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>Massive write throughput</li>
            <li>High availability — survives node failures</li>
            <li>Linear horizontal scaling</li>
            <li>Multi-region friendly</li>
          </ul>
        ),
      },
      {
        title: "Weaknesses",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>
              Query-driven data modeling (design tables around access patterns)
            </li>
            <li>No ad-hoc JOINs</li>
            <li>Heavy denormalization required</li>
            <li>Eventual consistency can return stale data</li>
          </ul>
        ),
      },
    ],
  },
  consistency: {
    title: "Consistency Levels",
    subtitle: "How fresh the data is when you read it",
    accentColor: "#ef4444",
    sections: [
      {
        title: "Strong consistency",
        accent: "#ef4444",
        content: (
          <p>
            Every read returns the latest written value. Writes are confirmed
            only after all replicas agree. Safest, but slowest.
          </p>
        ),
      },
      {
        title: "Quorum consistency",
        accent: "#f59e0b",
        content: (
          <p>
            A majority of replicas must agree on both reads and writes. Balances
            freshness with speed. If you write to a quorum and read from a
            quorum, you always see the latest value.
          </p>
        ),
      },
      {
        title: "Eventual consistency",
        accent: "#22c55e",
        content: (
          <p>
            Writes succeed immediately on one replica. Other nodes catch up
            later. Fastest writes, but reads may return stale data.
          </p>
        ),
      },
    ],
  },
  availability: {
    title: "Availability",
    subtitle: "Will the system still work if a node dies?",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "What it means",
        accent: "#8b5cf6",
        content: (
          <p>
            High availability means the database can still serve reads and
            writes even when some nodes are down. The trade-off is usually
            consistency — a system that stays "up" during a failure might return
            stale data.
          </p>
        ),
      },
      {
        title: "DB comparison",
        accent: "#8b5cf6",
        content: (
          <ul>
            <li>
              <strong>Relational:</strong> primary fails → writes stop until
              failover completes
            </li>
            <li>
              <strong>MongoDB:</strong> elections pick a new primary
              automatically (~seconds)
            </li>
            <li>
              <strong>Cassandra:</strong> no single primary, so one node dying
              barely disrupts the cluster
            </li>
          </ul>
        ),
      },
    ],
  },
  "data-modeling": {
    title: "Data Modeling",
    subtitle: "The same domain looks different in each database",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "Key insight",
        accent: "#14b8a6",
        content: (
          <p>
            The database you choose changes <strong>how you model</strong> the
            same business domain. A relational DB normalizes into tables; a
            document store nests; Cassandra duplicates data across
            query-specific tables.
          </p>
        ),
      },
      {
        title: "Example: e-commerce",
        accent: "#14b8a6",
        content: (
          <ul>
            <li>
              <strong>Relational:</strong> users, products, orders, order_items
              — 4 tables, JOINs
            </li>
            <li>
              <strong>MongoDB:</strong> orders embed items, products have
              flexible attributes
            </li>
            <li>
              <strong>Cassandra:</strong> orders_by_user, products_by_category —
              duplicate data, fast lookups
            </li>
          </ul>
        ),
      },
    ],
  },
  "cap-theorem": {
    title: "CAP Theorem",
    subtitle: "Pick two: Consistency, Availability, Partition tolerance",
    accentColor: "#ec4899",
    sections: [
      {
        title: "The trade-off",
        accent: "#ec4899",
        content: (
          <p>
            During a network partition (nodes can't talk to each other), a
            distributed system must choose: keep serving requests (availability)
            or refuse until it can guarantee freshness (consistency).
          </p>
        ),
      },
      {
        title: "Where each DB sits",
        accent: "#ec4899",
        content: (
          <ul>
            <li>
              <strong>Relational:</strong> CP — prefers consistency, may become
              unavailable during partitions
            </li>
            <li>
              <strong>MongoDB:</strong> CP by default (elections pause writes
              briefly)
            </li>
            <li>
              <strong>Cassandra:</strong> AP — prefers availability, tunable
              consistency
            </li>
          </ul>
        ),
      },
    ],
  },
  replication: {
    title: "Replication",
    subtitle: "Copying data across nodes for durability and reads",
    accentColor: "#6366f1",
    sections: [
      {
        title: "How each DB replicates",
        accent: "#6366f1",
        content: (
          <ul>
            <li>
              <strong>Relational:</strong> Primary → secondary streaming
              replication (synchronous or async)
            </li>
            <li>
              <strong>MongoDB:</strong> Primary → secondaries in a replica set
              (oplog replication)
            </li>
            <li>
              <strong>Cassandra:</strong> Peer-to-peer — every replica can
              accept writes, gossip protocol syncs data
            </li>
          </ul>
        ),
      },
    ],
  },
  denormalization: {
    title: "Denormalization",
    subtitle: "Duplicating data to avoid expensive queries",
    accentColor: "#0ea5e9",
    sections: [
      {
        title: "Why",
        accent: "#0ea5e9",
        content: (
          <p>
            When JOINs are expensive or impossible (Cassandra), you store the
            same data in multiple tables — each optimized for a specific query
            pattern. Writes become more expensive, but reads get fast.
          </p>
        ),
      },
      {
        title: "Trade-off",
        accent: "#0ea5e9",
        content: (
          <p>
            More write work and storage, but reads hit a single partition
            instead of joining across the cluster. Essential in Cassandra,
            optional in MongoDB, usually avoided in relational.
          </p>
        ),
      },
    ],
  },
  "ledger-critical": {
    title: "Ledger-Critical Systems",
    subtitle: "When every record must be provably correct and auditable",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What makes a system ledger-critical?",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>Financial transactions — bank transfers, payments, billing</li>
            <li>Regulatory audit trails — healthcare records, tax ledgers</li>
            <li>Inventory & supply-chain — stock counts that must reconcile</li>
            <li>
              Any domain where a lost or duplicated write means real-world money
              loss
            </li>
          </ul>
        ),
      },
      {
        title: "Why relational DBs dominate here",
        accent: "#f59e0b",
        content: (
          <p>
            ACID transactions guarantee that a debit and its matching credit
            either both commit or both roll back. Foreign-key constraints
            prevent orphaned records. Serializable isolation stops double-spend
            race conditions. These guarantees are <em>built-in</em> with
            PostgreSQL — you'd have to build them yourself on top of Cassandra
            or MongoDB.
          </p>
        ),
      },
      {
        title: "Cost of choosing the wrong DB",
        accent: "#ef4444",
        content: (
          <p>
            Eventual consistency in a banking system can produce phantom
            balances, duplicate charges, or audit failures. Fixing these after
            the fact is far more expensive than the performance overhead of
            strong consistency.
          </p>
        ),
      },
    ],
  },
  acid: {
    title: "ACID Transactions",
    subtitle: "Atomicity, Consistency, Isolation, Durability",
    accentColor: "#10b981",
    sections: [
      {
        title: "The four guarantees",
        accent: "#10b981",
        content: (
          <ul>
            <li>
              <strong>Atomicity</strong> — a transaction is all-or-nothing;
              partial writes never persist
            </li>
            <li>
              <strong>Consistency</strong> — every transaction moves the DB from
              one valid state to another (constraints enforced)
            </li>
            <li>
              <strong>Isolation</strong> — concurrent transactions don't see
              each other's uncommitted changes
            </li>
            <li>
              <strong>Durability</strong> — once committed, the data survives
              crashes (WAL, fsync)
            </li>
          </ul>
        ),
      },
      {
        title: "DB support",
        accent: "#10b981",
        content: (
          <ul>
            <li>
              <strong>PostgreSQL:</strong> Full ACID with serializable isolation
              available
            </li>
            <li>
              <strong>MongoDB:</strong> Multi-document ACID since v4.0, but
              single-document atomicity is the design preference
            </li>
            <li>
              <strong>Cassandra:</strong> No multi-partition ACID — lightweight
              transactions (LWT) offer compare-and-set on a single partition
              only
            </li>
          </ul>
        ),
      },
      {
        title: "Performance trade-off",
        accent: "#f59e0b",
        content: (
          <p>
            Stronger isolation levels (serializable) reduce throughput because
            transactions must coordinate. Most systems use read-committed or
            snapshot isolation as a practical middle ground, reserving
            serializable for critical paths like balance transfers.
          </p>
        ),
      },
    ],
  },
};
