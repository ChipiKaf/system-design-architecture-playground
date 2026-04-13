import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "aurora-overview"
  | "acid"
  | "wal"
  | "jsonb"
  | "aurora-storage"
  | "read-replicas"
  | "quorum"
  | "claims-schema"
  | "pg-extensions";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "aurora-overview": {
    title: "Aurora PostgreSQL",
    subtitle: "AWS's cloud-native PostgreSQL-compatible database",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What it is",
        content: (
          <p>
            Amazon Aurora is a fully managed relational database that's
            PostgreSQL-compatible at the wire protocol level. You use standard
            PostgreSQL drivers, SQL syntax, and extensions — but the storage
            layer is completely replaced with a purpose-built distributed system.
          </p>
        ),
      },
      {
        title: "Why insurance companies choose it",
        content: (
          <>
            <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem" }}>
              <li>
                <strong>PostgreSQL compatibility</strong> — no vendor lock-in on
                the SQL/application layer
              </li>
              <li>
                <strong>6-way replication</strong> across 3 Availability Zones
              </li>
              <li>
                <strong>Up to 15 read replicas</strong> for separating OLTP from
                analytics
              </li>
              <li>
                <strong>Auto-scaling storage</strong> — grows in 10GB increments,
                up to 128TB
              </li>
              <li>
                <strong>~30s failover</strong> vs minutes for standard RDS
              </li>
            </ul>
          </>
        ),
      },
    ],
  },

  acid: {
    title: "ACID Transactions",
    subtitle: "Atomicity, Consistency, Isolation, Durability",
    accentColor: "#4ade80",
    sections: [
      {
        title: "What ACID means",
        content: (
          <>
            <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem" }}>
              <li>
                <strong>Atomicity</strong> — all operations in a transaction
                succeed or none do. No half-paid claims.
              </li>
              <li>
                <strong>Consistency</strong> — constraints (CHECK, FK, UNIQUE)
                are enforced after every transaction.
              </li>
              <li>
                <strong>Isolation</strong> — concurrent transactions don't see
                each other's uncommitted changes.
              </li>
              <li>
                <strong>Durability</strong> — once COMMIT returns, the data
                survives crashes (WAL).
              </li>
            </ul>
          </>
        ),
      },
      {
        title: "Why insurance can't live without it",
        content: (
          <p>
            Every claim payment debits one account and credits another. Without
            atomicity, a crash between those two operations loses money. Without
            isolation, two adjusters approving the same claim simultaneously
            could double-pay. ACID isn't optional for insurance.
          </p>
        ),
      },
    ],
  },

  wal: {
    title: "Write-Ahead Log (WAL)",
    subtitle: "How PostgreSQL guarantees durability",
    accentColor: "#22d3ee",
    sections: [
      {
        title: "How it works",
        content: (
          <p>
            Before PostgreSQL modifies a data page, it writes the change to the
            WAL (a sequential on-disk log). If the server crashes, it replays
            the WAL to recover committed transactions. The WAL is the source of
            truth — data pages are just a cache.
          </p>
        ),
      },
      {
        title: "Aurora's twist",
        content: (
          <p>
            Aurora replaces PostgreSQL's local WAL with a distributed log. The
            writer sends log records to 6 storage nodes across 3 AZs. The
            storage nodes replay the log locally. This means Aurora doesn't need
            to write data pages at all — it only ships the log, reducing I/O by
            up to 6x compared to standard PostgreSQL.
          </p>
        ),
      },
    ],
  },

  jsonb: {
    title: "JSONB",
    subtitle: "Binary JSON with indexing and operators",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What it is",
        content: (
          <p>
            JSONB is PostgreSQL's binary JSON type. Unlike the text-based JSON
            type, JSONB is stored in a decomposed binary format, supports
            indexing (GIN, GiST), and has rich operators (@&gt;, &lt;@, ?, ||)
            for querying nested structures.
          </p>
        ),
      },
      {
        title: "Insurance use case",
        content: (
          <p>
            Auto policies have VIN, make, model. Home policies have square
            footage, roof year, riders. Life policies have beneficiaries and
            medical history. Instead of 20 nullable columns or a separate table
            per product, JSONB stores varying details in one column — queryable
            and indexable.
          </p>
        ),
      },
    ],
  },

  "aurora-storage": {
    title: "Aurora Storage Layer",
    subtitle: "Shared, distributed, log-structured storage",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Architecture",
        content: (
          <>
            <p>Aurora's storage is a shared log-structured distributed system:</p>
            <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem" }}>
              <li>Data is divided into <strong>10GB Protection Groups</strong></li>
              <li>Each group has <strong>6 copies across 3 AZs</strong></li>
              <li>Writes use <strong>4/6 quorum</strong>; reads use <strong>3/6 quorum</strong></li>
              <li>Storage auto-scales up to <strong>128TB</strong></li>
            </ul>
          </>
        ),
      },
      {
        title: "vs RDS PostgreSQL",
        content: (
          <p>
            RDS uses EBS volumes with synchronous replication to a standby.
            Aurora's storage is inherently multi-AZ with no standby instance
            needed for durability. This means faster writes (no data page
            shipping), faster recovery, and less storage overhead.
          </p>
        ),
      },
    ],
  },

  "read-replicas": {
    title: "Aurora Read Replicas",
    subtitle: "Scale reads without impacting the writer",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "How they work",
        content: (
          <p>
            Aurora readers connect to the <strong>same shared storage</strong> as
            the writer — no WAL streaming needed. Up to 15 replicas with
            typically &lt;10ms lag. They use cache invalidation (not data
            replication) to stay current.
          </p>
        ),
      },
      {
        title: "Insurance pattern",
        content: (
          <p>
            Route claims processing (writes) to the writer endpoint. Route
            underwriting dashboards, regulatory reporting, and actuarial
            analysis to reader endpoints. Heavy analytical queries never compete
            with OLTP writes for CPU or memory.
          </p>
        ),
      },
    ],
  },

  quorum: {
    title: "Quorum Protocol",
    subtitle: "How Aurora achieves durability without consensus overhead",
    accentColor: "#22d3ee",
    sections: [
      {
        title: "Write quorum: 4/6",
        content: (
          <p>
            A write is committed when 4 of the 6 storage node copies
            acknowledge. This means Aurora can lose an entire AZ (2 copies) and
            still commit writes. It can lose an AZ plus one additional node and
            still serve reads (3/6 quorum).
          </p>
        ),
      },
      {
        title: "Why not Raft/Paxos?",
        content: (
          <p>
            Aurora doesn't use traditional consensus protocols for data
            replication. The writer is the single authority; storage nodes are
            passive. This avoids the leader-election overhead of Raft while
            still achieving multi-AZ durability.
          </p>
        ),
      },
    ],
  },

  "claims-schema": {
    title: "Insurance Schema Design",
    subtitle: "State machines enforced by the database",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Claims as state machines",
        content: (
          <p>
            A claim moves through FNOL → Assessment → Approval → Settlement →
            Payment. Each transition is a SQL UPDATE with CHECK constraints
            preventing invalid transitions. A trigger writes to claim_history on
            every change. The schema itself is the business logic guard rail.
          </p>
        ),
      },
      {
        title: "Policy versioning",
        content: (
          <p>
            Policies change mid-term (endorsements, riders). Instead of
            overwriting, PostgreSQL stores version snapshots in a
            policy_versions table. Temporal queries like "What did this policy
            look like on March 15?" are simple SELECT statements. Regulators
            require this kind of auditability.
          </p>
        ),
      },
    ],
  },

  "pg-extensions": {
    title: "PostgreSQL Extensions",
    subtitle: "Capabilities that come for free",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Key extensions for insurance",
        content: (
          <>
            <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem" }}>
              <li><strong>PostGIS</strong> — property insurance geospatial queries (flood zones, proximity to fire stations)</li>
              <li><strong>pg_partman</strong> — automatic table partitioning (claims by month, policies by year)</li>
              <li><strong>pg_cron</strong> — scheduled database-side jobs (nightly expiry checks, materialized view refreshes)</li>
              <li><strong>pg_stat_statements</strong> — query performance monitoring (top slow queries)</li>
            </ul>
          </>
        ),
      },
      {
        title: "Aurora compatibility",
        content: (
          <p>
            Aurora PostgreSQL supports most standard extensions, plus adds its
            own: <strong>aurora_stat_activity</strong> for enhanced monitoring,
            <strong> aws_s3</strong> for direct S3 data import/export. CREATE
            EXTENSION is all it takes — no binary compilation, no downtime.
          </p>
        ),
      },
    ],
  },
};
