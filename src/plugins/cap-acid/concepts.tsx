import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "cap-theorem"
  | "acid"
  | "atomicity"
  | "consistency-acid"
  | "isolation"
  | "durability"
  | "partition-tolerance"
  | "availability"
  | "consistency-cap";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "cap-theorem": {
    title: "CAP Theorem",
    subtitle: "Brewer's conjecture — pick two of three",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "The Three Properties",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              <strong>Consistency (C):</strong> Every read returns the most
              recent write or an error.
            </p>
            <p>
              <strong>Availability (A):</strong> Every request receives a
              non-error response, without guarantee it's the latest write.
            </p>
            <p>
              <strong>Partition Tolerance (P):</strong> The system continues to
              operate despite network splits between nodes.
            </p>
          </>
        ),
      },
      {
        title: "The Trade-off",
        accent: "#ef4444",
        content: (
          <>
            <p>
              In the presence of a network partition, a distributed system must
              choose between <strong>Consistency</strong> and{" "}
              <strong>Availability</strong>.
            </p>
            <p>
              <strong>CA</strong> (PostgreSQL): Refuses to serve stale data —
              blocks writes during partition.
            </p>
            <p>
              <strong>AP</strong> (Cassandra): Stays available but may serve
              stale data.
            </p>
            <p>
              <strong>CP</strong> (MongoDB): Elects a new primary — consistent
              but briefly unavailable.
            </p>
          </>
        ),
      },
    ],
  },
  acid: {
    title: "ACID Compliance",
    subtitle: "The four pillars of transaction safety",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What ACID Means",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              <strong>Atomicity:</strong> Either the entire transaction
              succeeds, or the entire thing fails. No partial writes.
            </p>
            <p>
              <strong>Consistency:</strong> All database rules (constraints,
              triggers, cascades) are enforced, or the entire transaction is
              rolled back.
            </p>
            <p>
              <strong>Isolation:</strong> No transaction is affected by any
              other transaction still in progress.
            </p>
            <p>
              <strong>Durability:</strong> Once a transaction is committed, it
              stays — even if the system crashes immediately after.
            </p>
          </>
        ),
      },
      {
        title: "ACID Across Databases",
        accent: "#22c55e",
        content: (
          <>
            <p>
              <strong>PostgreSQL:</strong> Full ACID. The gold standard —
              constraints, multi-statement txns, WAL fsync.
            </p>
            <p>
              <strong>MongoDB:</strong> Multi-document ACID since v4.0, but with
              caveats under partitions and elections.
            </p>
            <p>
              <strong>Cassandra:</strong> No multi-row ACID. Offers lightweight
              transactions (compare-and-set) for single-partition atomicity.
            </p>
          </>
        ),
      },
    ],
  },
  atomicity: {
    title: "Atomicity",
    subtitle: "All or nothing",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "What It Means",
        accent: "#8b5cf6",
        content: (
          <p>
            A transaction is an indivisible unit. If any part fails — constraint
            violation, disk error, timeout — the entire transaction rolls back
            as if nothing happened.
          </p>
        ),
      },
      {
        title: "In Practice",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              <strong>PostgreSQL:</strong> Full support via WAL (write-ahead
              log). BEGIN → multiple statements → COMMIT/ROLLBACK.
            </p>
            <p>
              <strong>MongoDB:</strong> Single-doc writes are atomic. Multi-doc
              txns are atomic since v4.0 but abort during elections.
            </p>
            <p>
              <strong>Cassandra:</strong> Single-partition batch writes are
              atomic. No cross-partition atomicity.
            </p>
          </>
        ),
      },
    ],
  },
  "consistency-acid": {
    title: "Consistency (ACID)",
    subtitle: "All rules enforced, or nothing changes",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Not the Same as CAP Consistency",
        accent: "#22c55e",
        content: (
          <>
            <p>
              <strong>ACID consistency:</strong> The database moves from one
              valid state to another. Constraints, foreign keys, and triggers
              are enforced.
            </p>
            <p>
              <strong>CAP consistency:</strong> All nodes return the same data
              at the same time (linearizability).
            </p>
            <p>
              They're related but distinct. PostgreSQL enforces both. Cassandra
              enforces neither fully.
            </p>
          </>
        ),
      },
    ],
  },
  isolation: {
    title: "Isolation Levels",
    subtitle: "How much can concurrent transactions see?",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "PostgreSQL Isolation Levels",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              <strong>Read Committed</strong> (default): Each statement sees
              only committed data. Other txns' uncommitted changes are
              invisible.
            </p>
            <p>
              <strong>Repeatable Read:</strong> Transaction sees a snapshot from
              its start. Re-reading the same row always returns the same value.
            </p>
            <p>
              <strong>Serializable:</strong> Transactions execute as if they ran
              one at a time. Maximum safety, maximum overhead.
            </p>
          </>
        ),
      },
      {
        title: "Trade-offs",
        accent: "#ef4444",
        content: (
          <p>
            Higher isolation = more locking/conflict checking = higher latency
            and lower throughput. Read Committed is usually enough; Serializable
            is for financial or safety-critical paths.
          </p>
        ),
      },
    ],
  },
  durability: {
    title: "Durability",
    subtitle: "Committed data survives crashes",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "How It Works",
        accent: "#14b8a6",
        content: (
          <>
            <p>
              After COMMIT, the data is flushed to durable storage (WAL fsync in
              PG, oplog in MongoDB, commitlog in Cassandra).
            </p>
            <p>
              Even if the server crashes immediately after, recovery replays the
              log to restore all committed transactions.
            </p>
          </>
        ),
      },
      {
        title: "When It Breaks",
        accent: "#ef4444",
        content: (
          <p>
            Durability is at risk when: (1) the only copy of data is on a
            partitioned node, (2) async replication hasn't caught up before a
            crash, or (3) write-ahead logging is disabled for performance.
          </p>
        ),
      },
    ],
  },
  "partition-tolerance": {
    title: "Partition Tolerance",
    subtitle: "Surviving network splits",
    accentColor: "#ef4444",
    sections: [
      {
        title: "What Is a Partition?",
        accent: "#ef4444",
        content: (
          <>
            <p>
              A network partition occurs when two groups of nodes can
              communicate within their group but not across groups.
            </p>
            <p>
              In practice, partitions are inevitable in distributed systems
              (network failures, cloud zone outages, misconfigurations).
            </p>
          </>
        ),
      },
      {
        title: "Why It Forces a Choice",
        accent: "#f59e0b",
        content: (
          <p>
            During a partition, the system must choose: reject requests to stay
            consistent (CP), or accept requests and risk stale data (AP). This
            is the essence of the CAP theorem.
          </p>
        ),
      },
    ],
  },
  availability: {
    title: "Availability",
    subtitle: "Every request gets a response",
    accentColor: "#22c55e",
    sections: [
      {
        title: "What It Means",
        accent: "#22c55e",
        content: (
          <p>
            Every non-failing node must return a response for every request. No
            timeouts, no errors — even if the response contains stale data.
          </p>
        ),
      },
      {
        title: "The Cost",
        accent: "#f59e0b",
        content: (
          <p>
            Guaranteeing availability during a partition means accepting that
            some responses may be inconsistent. This is the trade-off Cassandra
            makes with CL=ONE.
          </p>
        ),
      },
    ],
  },
  "consistency-cap": {
    title: "Consistency (CAP)",
    subtitle: "All nodes see the same data at the same time",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "Linearizability",
        accent: "#3b82f6",
        content: (
          <p>
            In CAP terms, consistency means every read returns the most recent
            write. This is called <strong>linearizability</strong> — the
            strongest form of consistency.
          </p>
        ),
      },
      {
        title: "How Databases Achieve It",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              <strong>PostgreSQL:</strong> Single primary handles all writes —
              reads from primary are always linearizable.
            </p>
            <p>
              <strong>MongoDB:</strong> Reads from primary with
              readConcern:linearizable.
            </p>
            <p>
              <strong>Cassandra:</strong> CL=ALL achieves it but at the cost of
              availability.
            </p>
          </>
        ),
      },
    ],
  },
};
