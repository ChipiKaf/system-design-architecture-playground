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
  | "acid"
  | "write-concern"
  | "mixed-concern"
  | "mongo-joins"
  | "token-ring";

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
  "write-concern": {
    title: "Write Concern & Failover",
    subtitle: "How MongoDB balances write speed vs. durability",
    accentColor: "#f472b6",
    sections: [
      {
        title: "w:1 — Fast but risky",
        accent: "#ef4444",
        content: (
          <ul>
            <li>
              The primary acknowledges the write <em>before</em> replicating to
              secondaries
            </li>
            <li>
              If the primary crashes right after the ack, the write is{" "}
              <strong>lost</strong> — secondaries never received it
            </li>
            <li>
              <strong>RPO &gt; 0</strong> — you can lose the most recent writes
              (the replication lag window)
            </li>
            <li>Lowest write latency; good for non-critical telemetry data</li>
          </ul>
        ),
      },
      {
        title: "w:majority — Safe but slower",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              The primary waits until a <strong>majority</strong> of replica-set
              members (including itself) confirm the write
            </li>
            <li>
              Even if the primary dies, the write survives on the other members
            </li>
            <li>
              <strong>RPO ≈ 0</strong> — committed writes are durable across the
              replica set
            </li>
            <li>
              Adds ~3-8 ms of latency per write (network round-trip to
              secondaries)
            </li>
          </ul>
        ),
      },
      {
        title: "Election & RTO",
        accent: "#f59e0b",
        content: (
          <ul>
            <li>
              When a primary fails, secondaries hold an{" "}
              <strong>election</strong> (~5-10 seconds)
            </li>
            <li>
              During the election the shard is <em>read-only</em> — no writes
              accepted
            </li>
            <li>
              <strong>RTO ≈ 5-10 s</strong> — time until a new primary is
              elected and writes resume
            </li>
            <li>
              Other shards are <em>unaffected</em> — only the shard that lost
              its primary pauses writes
            </li>
          </ul>
        ),
      },
      {
        title: "Choosing the right write concern",
        accent: "#f472b6",
        content: (
          <p>
            Use <code>w:majority</code> for any data you can't afford to lose
            (payments, orders, user accounts). Use <code>w:1</code> for
            high-volume, low-value writes where speed matters more than
            durability (logs, metrics, session pings). Many production systems
            use <code>w:majority</code> + <code>j:true</code> (journal) as the
            default safety net.
          </p>
        ),
      },
    ],
  },
  "mongo-joins": {
    title: "Joins in MongoDB",
    subtitle: "No native SQL join engine — three approaches, three trade-offs",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "Why joins are harder in MongoDB",
        accent: "#8b5cf6",
        content: (
          <ul>
            <li>
              MongoDB has <strong>no central join optimizer</strong> like a
              relational engine. There is no execution plan that combines two
              collections in one pass.
            </li>
            <li>
              Data is <strong>distributed across shards</strong> — related
              documents may live on different shards, requiring cross-shard
              coordination.
            </li>
            <li>
              Every join approach in MongoDB requires you to{" "}
              <em>design around it upfront</em>.
            </li>
          </ul>
        ),
      },
      {
        title: "Approach 1 — App-side join (most common)",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              Your application issues <strong>2 separate queries</strong>:
            </p>
            <pre
              style={{
                background: "#0f172a",
                borderRadius: 6,
                padding: "10px 14px",
                fontSize: 11,
                color: "#fde68a",
                marginTop: 8,
              }}
            >{`Step 1: db.users.find({ _id: userId })
Step 2: db.orders.find({ user_id: userId })
Step 3: merge in application code`}</pre>
            <p style={{ marginTop: 8 }}>
              <strong>Cost:</strong> 2 network round trips. Latency compounds.
              If the collections are on <em>different shards</em>, each query
              touches a different shard.
            </p>
          </>
        ),
      },
      {
        title: "Approach 2 — $lookup (aggregation pipeline)",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              MongoDB’s <code>$lookup</code> stage performs a join-like
              operation inside an aggregation pipeline:
            </p>
            <pre
              style={{
                background: "#0f172a",
                borderRadius: 6,
                padding: "10px 14px",
                fontSize: 11,
                color: "#c4b5fd",
                marginTop: 8,
              }}
            >{`db.users.aggregate([
  { $lookup: {
    from: "orders",
    localField: "_id",
    foreignField: "user_id",
    as: "orders"
  }}
])`}</pre>
            <p style={{ marginTop: 8 }}>
              Works well when data is on the <strong>same shard</strong>. When
              collections span multiple shards, MongoDB must{" "}
              <em>scatter-gather</em> the pipeline — every shard runs the join
              independently, which increases latency and coordination overhead.
            </p>
          </>
        ),
      },
      {
        title: "Approach 3 — Denormalization (the Mongo way)",
        accent: "#22c55e",
        content: (
          <>
            <p>
              Instead of joining, you <strong>embed related data</strong> in the
              parent document:
            </p>
            <pre
              style={{
                background: "#0f172a",
                borderRadius: 6,
                padding: "10px 14px",
                fontSize: 11,
                color: "#86efac",
                marginTop: 8,
              }}
            >{`{
  userId: 1,
  name: "Alice",
  orders: [
    { id: 101, amount: 50 },
    { id: 102, amount: 30 }
  ]
}`}</pre>
            <p style={{ marginTop: 8 }}>
              Single document read — <strong>no join at query time</strong>.
              Fast, targeted, and shard-local. The penalty is paid at{" "}
              <em>write time</em> (you must update the embedded array when an
              order changes).
            </p>
          </>
        ),
      },
      {
        title: "Shard key matters",
        accent: "#ef4444",
        content: (
          <table
            style={{
              width: "100%",
              fontSize: 11,
              borderCollapse: "collapse",
              color: "#e2e8f0",
            }}
          >
            <thead>
              <tr>
                {["Scenario", "Result"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "4px 8px",
                      color: "#94a3b8",
                      borderBottom: "1px solid #334155",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "users + orders sharded by userId",
                  "✅ Co-located — fast $lookup within 1 shard",
                ],
                [
                  "users by userId, orders by orderId",
                  "❌ Cross-shard scatter — slower, complex coordination",
                ],
              ].map(([sc, res]) => (
                <tr key={sc}>
                  <td
                    style={{
                      padding: "5px 8px",
                      borderBottom: "1px solid #1e293b",
                      fontFamily: "monospace",
                      fontSize: 10,
                    }}
                  >
                    {sc}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      borderBottom: "1px solid #1e293b",
                    }}
                  >
                    {res}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      },
      {
        title: "Real intuition",
        accent: "#8b5cf6",
        content: (
          <p>
            MongoDB doesn’t remove joins — it forces you to{" "}
            <strong>think about them upfront</strong>. Embed what you always
            read together. Reference what you update independently.
          </p>
        ),
      },
    ],
  },
  "mixed-concern": {
    title: "Mixed Concern (w:1 + Primary Reads)",
    subtitle: "Looks consistent — but durability is an illusion",
    accentColor: "#f97316",
    sections: [
      {
        title: "What your setup does",
        accent: "#f97316",
        content: (
          <ul>
            <li>
              <strong>Write concern w:1</strong> — primary acknowledges
              immediately, replication is async
            </li>
            <li>
              <strong>Read preference: primary</strong> — every read goes to the
              same node that just accepted the write
            </li>
            <li>
              Result: you always read the freshest value — that part feels like
              strong consistency
            </li>
          </ul>
        ),
      },
      {
        title: "Why it feels strongly consistent",
        accent: "#22c55e",
        content: (
          <>
            <p>
              Because reads and writes hit the <em>same primary</em>, you always
              get read-your-writes consistency:
            </p>
            <pre
              style={{
                background: "#0f172a",
                borderRadius: 6,
                padding: "10px 14px",
                fontSize: 11,
                color: "#86efac",
                marginTop: 8,
              }}
            >{`Primary:     NEW VALUE  ✅
Secondary A: OLD VALUE
Secondary B: OLD VALUE

Your read → goes to Primary → returns NEW VALUE`}</pre>
            <p style={{ marginTop: 8 }}>
              From the client's perspective this is indistinguishable from
              strong consistency.
            </p>
          </>
        ),
      },
      {
        title: "The hidden danger — durability is weak",
        accent: "#ef4444",
        content: (
          <>
            <p>
              That write is <strong>not durable yet</strong>. The secondaries
              haven't received it:
            </p>
            <pre
              style={{
                background: "#0f172a",
                borderRadius: 6,
                padding: "10px 14px",
                fontSize: 11,
                color: "#fca5a5",
                marginTop: 8,
              }}
            >{`Step 1  Primary writes → ACK  ✅
Step 2  Primary crashes    ❌
Step 3  Secondaries elect a new primary
Step 4  New primary only has the OLD value
Step 5  Your data is gone  ❗`}</pre>
            <p style={{ marginTop: 8 }}>
              You saw data that <strong>later disappears</strong>. This is
              called a <em>rollback</em> — the write was never committed to a
              majority, so it simply vanishes after failover.
            </p>
          </>
        ),
      },
      {
        title: 'Why it\'s called "mixed"',
        accent: "#f97316",
        content: (
          <table
            style={{
              width: "100%",
              fontSize: 12,
              borderCollapse: "collapse",
              color: "#e2e8f0",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "4px 8px",
                    color: "#94a3b8",
                    borderBottom: "1px solid #334155",
                  }}
                >
                  Property
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "4px 8px",
                    color: "#94a3b8",
                    borderBottom: "1px solid #334155",
                  }}
                >
                  Behavior
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Read consistency", "✅ Strong — you always see the latest"],
                ["Durability", "❌ Weak — the latest write can disappear"],
              ].map(([prop, beh]) => (
                <tr key={prop}>
                  <td
                    style={{
                      padding: "5px 8px",
                      borderBottom: "1px solid #1e293b",
                    }}
                  >
                    {prop}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      borderBottom: "1px solid #1e293b",
                    }}
                  >
                    {beh}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      },
      {
        title: "Comparison with other modes",
        accent: "#94a3b8",
        content: (
          <table
            style={{
              width: "100%",
              fontSize: 11,
              borderCollapse: "collapse",
              color: "#e2e8f0",
            }}
          >
            <thead>
              <tr>
                {["Setting", "Read freshness", "Durability"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "4px 8px",
                      color: "#94a3b8",
                      borderBottom: "1px solid #334155",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["w:1 + secondary", "❌ Stale reads", "❌ Weak"],
                ["w:1 + primary  (this)", "✅ Fresh reads", "❌ Weak"],
                ["w:majority + primary", "✅ Fresh reads", "✅ Strong"],
              ].map(([setting, reads, dur]) => (
                <tr key={setting}>
                  <td
                    style={{
                      padding: "5px 8px",
                      borderBottom: "1px solid #1e293b",
                      fontFamily: "monospace",
                    }}
                  >
                    {setting}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      borderBottom: "1px solid #1e293b",
                    }}
                  >
                    {reads}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      borderBottom: "1px solid #1e293b",
                    }}
                  >
                    {dur}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      },
      {
        title: "Real intuition",
        accent: "#f97316",
        content: (
          <p>
            You are reading from the <strong>source of truth</strong>, but that
            truth hasn't been safely replicated yet. It's the{" "}
            <em>illusion of strong consistency</em> — it holds perfectly right
            up until the primary crashes.
          </p>
        ),
      },
    ],
  },
  "token-ring": {
    title: "Token Ring: Nodes Are Not Shards",
    subtitle:
      "Each node owns a slice of the hash space — and also stores replicas of other slices",
    accentColor: "#f97316",
    sections: [
      {
        title: "The mental shift",
        accent: "#f97316",
        content: (
          <>
            <p>
              In Mongo sharding each shard owns{" "}
              <strong>distinct, non-overlapping data</strong>. Shard A handles
              users 0–1000, Shard B handles 1001–2000.
            </p>
            <p style={{ marginTop: 8 }}>
              In Cassandra every node owns a{" "}
              <strong>slice of the hash ring</strong> (its primary token range){" "}
              <em>and also stores replicas of nearby slices</em>. No node is a
              dedicated owner of any key — the ring distributes responsibility
              continuously.
            </p>
          </>
        ),
      },
      {
        title: "How a key lands on the ring",
        accent: "#f97316",
        content: (
          <ol style={{ paddingLeft: 18, lineHeight: 1.8 }}>
            <li>
              The partition key is hashed:{" "}
              <code style={{ fontSize: 11, color: "#fdba74" }}>
                hash(account_id)
              </code>
            </li>
            <li>
              The result is a position on the ring (0 → 2⁶⁴, shown as 0–1000 in
              the sandbox)
            </li>
            <li>
              The node whose token range <em>contains</em> that position is the{" "}
              <strong style={{ color: "#f97316" }}>key owner</strong>{" "}
              (highlighted in orange)
            </li>
          </ol>
        ),
      },
      {
        title: "Clockwise replication",
        accent: "#f97316",
        content: (
          <p>
            Starting from the key owner, the next <strong>RF − 1</strong> nodes
            clockwise each store a full replica. With RF = 3: key owner → next →
            next again. All three nodes hold the <em>same partition data</em>,
            even though each also owns its own distinct primary range.
          </p>
        ),
      },
      {
        title: "What a node actually holds",
        accent: "#f97316",
        content: (
          <>
            <p>For a 4-node ring with RF = 3, node C at T:500 holds:</p>
            <pre
              style={{
                background: "#0f172a",
                borderRadius: 6,
                padding: "10px 14px",
                fontSize: 11,
                color: "#fdba74",
                marginTop: 8,
              }}
            >{`Node C (T:500):
  PRIMARY → owns T:250–500
  REPLICA  ← receives data from T:0–250   (Node B)
  REPLICA  ← receives data from T:500–750 (Node D, it is N+1 of C)`}</pre>
            <p style={{ marginTop: 8 }}>
              With 4 nodes and RF = 3, every node holds{" "}
              <strong>75% of the total dataset</strong>.
            </p>
          </>
        ),
      },
      {
        title: "Mongo shards vs Cassandra nodes",
        accent: "#ef4444",
        content: (
          <table
            style={{
              width: "100%",
              fontSize: 11,
              borderCollapse: "collapse",
              color: "#e2e8f0",
            }}
          >
            <thead>
              <tr>
                {["", "Mongo Shard", "Cassandra Node"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "4px 8px",
                      color: "#94a3b8",
                      borderBottom: "1px solid #334155",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Owns", "One specific slice", "One primary token range"],
                  [
                    "Also stores",
                    "Replica of same slice",
                    "Replicas of RF−1 other ranges",
                  ],
                  [
                    "Data overlap",
                    "Only within replica set",
                    "Across the whole ring",
                  ],
                  [
                    "Node removed",
                    "That slice is in trouble",
                    "Neighbours take over range",
                  ],
                ] as [string, string, string][]
              ).map(([row, mongo, cass]) => (
                <tr key={row}>
                  <td
                    style={{
                      padding: "5px 8px",
                      borderBottom: "1px solid #1e293b",
                      color: "#94a3b8",
                      fontWeight: 600,
                    }}
                  >
                    {row}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      borderBottom: "1px solid #1e293b",
                    }}
                  >
                    {mongo}
                  </td>
                  <td
                    style={{
                      padding: "5px 8px",
                      borderBottom: "1px solid #1e293b",
                      color: "#f97316",
                    }}
                  >
                    {cass}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      },
    ],
  },
};
