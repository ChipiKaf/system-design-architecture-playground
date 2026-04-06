import React, { useEffect, useLayoutEffect, useRef } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  CanvasStage,
  ConceptPills,
  PluginLayout,
  SideCard,
  SidePanel,
  StageHeader,
  StatBadge,
  useConceptModal,
} from "../../components/plugin-kit";
import type { ConceptDefinition } from "../../components/plugin-kit/useConceptModal";
import { concepts, type ConceptKey } from "./concepts";
import {
  DB_PROFILES,
  OPERATION_CATALOG,
  WORKLOAD_PROFILES,
  isTargetedOp,
  type DbType,
  type JoinMode,
  type ReadPreference,
  type WorkloadId,
  type WriteConcern,
} from "./dbTradeoffSlice";
import { useDbTradeoffAnimation, type Signal } from "./useDbTradeoffAnimation";
import "./main.scss";

/* ── Helpers ──────────────────────────────────────────── */

const isReadOp = (op: string) =>
  op === "point-read" ||
  op === "join-query" ||
  op === "aggregate" ||
  op === "read-after-write";

/* ── Needs checklist ─────────────────────────────────── */

type CheckStatus = "pass" | "warn" | "fail";
interface NeedCheck {
  need: string;
  status: CheckStatus;
  note: string;
}

function buildNeedsChecklist(
  workload: WorkloadId,
  dbType: DbType,
  writeConcern: WriteConcern,
  readPreference: ReadPreference,
  cassandraConsistency?: string,
): NeedCheck[] {
  const isRelational = dbType === "relational";
  const isMongo = dbType === "mongodb";
  const isCassandra = dbType === "cassandra";
  const mongoLevel = isMongo
    ? writeConcern === "wmajority" && readPreference === "majority"
      ? "strong"
      : writeConcern === "w1" && readPreference === "secondary"
        ? "eventual"
        : "quorum"
    : null;
  // Cassandra: CL=ALL → strong, CL=QUORUM → quorum, CL=ONE → eventual
  const cassLevel = isCassandra
    ? cassandraConsistency === "strong"
      ? "strong"
      : cassandraConsistency === "quorum"
        ? "quorum"
        : "eventual"
    : null;

  if (workload === "banking") {
    return [
      {
        need: "Strong consistency",
        status: isRelational
          ? "pass"
          : isMongo
            ? mongoLevel === "strong" || mongoLevel === "quorum"
              ? "warn"
              : "fail"
            : isCassandra
              ? cassLevel === "strong"
                ? "warn"
                : cassLevel === "quorum"
                  ? "warn"
                  : "fail"
              : "fail",
        note: isRelational
          ? "Full serialisable isolation via ACID guarantees"
          : isMongo
            ? mongoLevel === "strong"
              ? "w:majority + Majority reads — replication safe, but race conditions need atomic ops"
              : mongoLevel === "quorum"
                ? "Partial — enable Majority read mode; still needs atomic ops to prevent double-spend"
                : "w:1 + secondary reads can return stale data"
            : isCassandra
              ? cassLevel === "strong"
                ? "CL=ALL — coordinator waits for ALL replicas to ack. Reads all replicas. Strong per-partition, but no cross-partition ACID."
                : cassLevel === "quorum"
                  ? "CL=QUORUM — majority of replicas must ack. Overlapping write+read quorums guarantee you read the latest write."
                  : "CL=ONE — only 1 replica acks the write. Other replicas may lag. Reads may return stale data."
              : "Eventual-only — no strong consistency mode available",
      },
      {
        need: "ACID transactions",
        status: isRelational ? "pass" : isMongo ? "warn" : "fail",
        note: isRelational
          ? "Native multi-statement transactions across any tables"
          : isMongo
            ? "Multi-doc transactions exist but carry overhead and document-model semantics"
            : "No cross-partition transactions — LWT is limited and slow",
      },
      {
        need: "Correctness over speed",
        status: isRelational
          ? "pass"
          : isMongo
            ? writeConcern === "wmajority"
              ? "warn"
              : "fail"
            : isCassandra
              ? cassLevel === "strong" || cassLevel === "quorum"
                ? "warn"
                : "fail"
              : "fail",
        note: isRelational
          ? "Designed for correctness-first: constraints, triggers, referential integrity"
          : isMongo
            ? writeConcern === "wmajority"
              ? "w:majority reduces loss risk but ledger semantics are weaker than relational"
              : "w:1 prioritises speed — dangerous for financial ledger data"
            : isCassandra
              ? cassLevel === "strong"
                ? "CL=ALL gives durability guarantees per-partition, but lacks multi-row atomicity"
                : cassLevel === "quorum"
                  ? "CL=QUORUM balances speed and safety — not sufficient for strict ledger guarantees"
                  : "CL=ONE — writes return before all replicas confirm. Data loss risk on node failure."
              : "AP system — availability is favoured over correctness",
      },
    ];
  }

  if (workload === "ecommerce") {
    return [
      {
        need: "Flexible schema",
        status: isMongo ? "pass" : "warn",
        note: isMongo
          ? "Document model natively supports evolving attributes per product"
          : isRelational
            ? "Possible via JSONB columns, but schema migrations add friction"
            : "Wide-column allows adding columns; no nested structures",
      },
      {
        need: "Nested product data",
        status: isMongo ? "pass" : isRelational ? "warn" : "fail",
        note: isMongo
          ? "Embed variants, specs, and images directly in the document"
          : isRelational
            ? "Requires separate tables and JOINs per attribute type"
            : "Flat rows only — nesting must be pre-denormalised",
      },
      {
        need: "Read-heavy workload",
        status: isRelational || isMongo ? "pass" : "warn",
        note: isRelational
          ? "Indexed reads, query planner, and caching handle most patterns well"
          : isMongo
            ? "Rich compound indexes and aggregation pipeline scale reads well"
            : "Scales for reads only when the partition key matches — range queries require extra tables",
      },
    ];
  }

  // chat
  return [
    {
      need: "Massive write throughput",
      status: isRelational ? "fail" : isMongo ? "warn" : "pass",
      note: isRelational
        ? "Single-node write path is a bottleneck — sharding adds significant complexity"
        : isMongo
          ? "Good throughput but plateaus against Cassandra at millions of writes/sec"
          : "Log-structured storage + distributed ring — built for exactly this",
    },
    {
      need: "Partition-friendly reads",
      status: isRelational ? "warn" : isMongo ? "warn" : "pass",
      note: isRelational
        ? "Works with careful indexing; large table JOINs degrade under scale"
        : isMongo
          ? "Shard key design is critical; less natural than Cassandra partition keys"
          : "Partition key is first-class — every read is partition-scoped by design",
    },
    {
      need: "High availability",
      status: isRelational ? "warn" : isMongo ? "warn" : "pass",
      note: isRelational
        ? "Requires explicit replication and failover setup; single-region by default"
        : isMongo
          ? "Replica sets give HA but failover election takes 10–30 s"
          : "Peer-to-peer, no primary — multi-DC replication and 99.99% HA out of the box",
    },
  ];
}

const STATUS_ICON: Record<CheckStatus, string> = {
  pass: "✓",
  warn: "⚠",
  fail: "✗",
};
const STATUS_COLOR: Record<CheckStatus, string> = {
  pass: "#22c55e",
  warn: "#f59e0b",
  fail: "#ef4444",
};

/* ── Per-need modal content ──────────────────────────── */

function buildNeedConcepts(
  workload: WorkloadId,
  dbType: DbType,
  writeConcern: WriteConcern,
  readPreference: ReadPreference,
): Record<string, ConceptDefinition> {
  const isRelational = dbType === "relational";
  const isMongo = dbType === "mongodb";
  const dbLabel = isRelational
    ? "PostgreSQL"
    : isMongo
      ? "MongoDB"
      : "Cassandra";
  const mongoLevel = isMongo
    ? writeConcern === "wmajority" && readPreference === "majority"
      ? "strong"
      : writeConcern === "w1" && readPreference === "secondary"
        ? "eventual"
        : "quorum"
    : null;

  const workloadLabels: Record<WorkloadId, string> = {
    banking: "Banking / Ledger",
    ecommerce: "E-Commerce Catalog",
    chat: "Chat / Messaging",
  };
  const wl = workloadLabels[workload];

  const dbSection = (
    content: React.ReactNode,
  ): ConceptDefinition["sections"][0] => ({
    title: `How ${dbLabel} handles it`,
    accent: isRelational ? "#3b82f6" : isMongo ? "#22c55e" : "#f59e0b",
    content,
  });

  /* ── Banking needs ─────────────────────────────────── */
  if (workload === "banking") {
    return {
      "Strong consistency": {
        title: "Strong Consistency",
        subtitle: `Why ${wl} needs it — and how ${dbLabel} delivers it`,
        accentColor: "#ef4444",
        sections: [
          {
            title: `Why ${wl} needs Strong consistency`,
            accent: "#ef4444",
            content: (
              <>
                <p>
                  Two concurrent transfers from the same account both read a
                  balance of £500. Without strong consistency, both see £500 and
                  both succeed — you just paid out £1,000 from a £500 account.
                </p>
                <p style={{ marginTop: 8 }}>
                  Strong consistency guarantees every read reflects the most
                  recent committed write. There is no window where two
                  transactions can disagree on the account balance.
                </p>
              </>
            ),
          },
          dbSection(
            isRelational ? (
              <p>
                <strong>✓ Full serialisable isolation.</strong> PostgreSQL's
                MVCC engine ensures reads see only committed data. You can use{" "}
                <code>SERIALIZABLE</code> isolation level to prevent any phantom
                read or write skew — the gold standard for financial systems.
              </p>
            ) : isMongo ? (
              mongoLevel === "strong" ? (
                <>
                  <p>
                    <strong>
                      ⚠ Replication is safe — but double-spend is still
                      possible.
                    </strong>
                  </p>
                  <p style={{ marginTop: 6 }}>
                    <code>w:majority + readConcern:majority</code> means every
                    write is replicated to a quorum before the ACK, and every
                    read only returns majority-committed data.{" "}
                    <strong>No node will serve a stale value.</strong>
                  </p>
                  <p style={{ marginTop: 8 }}>
                    But this only solves <em>replication</em> correctness. It
                    does <strong>not</strong> prevent two concurrent requests
                    from both reading the same balance and both succeeding:
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
                  >{`T1 reads balance = 500  ✓ (majority-committed)
T2 reads balance = 500  ✓ (majority-committed)
T1 deducts 500 → writes 0   ✓
T2 deducts 500 → writes -500 ❗  (both passed the check!)`}</pre>
                  <p style={{ marginTop: 8 }}>
                    To actually prevent double-spend you need one of these on
                    top:
                  </p>
                  <ul style={{ marginTop: 6 }}>
                    <li>
                      <strong>Atomic conditional update</strong> —{" "}
                      <code>
                        {
                          "updateOne({ balance: { $gte: 500 } }, { $inc: { balance: -500 } })"
                        }
                      </code>{" "}
                      — check and deduct in one atomic step
                    </li>
                    <li>
                      <strong>Multi-document transaction</strong> —{" "}
                      <code>session.startTransaction()</code> — serialises
                      concurrent operations at a cost of ~3× latency
                    </li>
                    <li>
                      <strong>Optimistic locking</strong> — keep a{" "}
                      <code>version</code> field, retry on version mismatch
                    </li>
                  </ul>
                  <p style={{ marginTop: 8, color: "#f59e0b", fontSize: 11 }}>
                    Bottom line: <code>w:majority</code> is necessary but not
                    sufficient. Race conditions require application-level
                    concurrency control.
                  </p>
                </>
              ) : mongoLevel === "quorum" ? (
                <p>
                  <strong>⚠ Partial.</strong> Writes are durable (w:majority)
                  but reads go to the primary only — not majority-confirmed.
                  Enable <em>Majority read mode</em> to close the gap. With just
                  primary reads, a newly elected primary can serve a value that
                  was later rolled back.
                </p>
              ) : (
                <p>
                  <strong>✗ Not achieved.</strong> <code>w:1</code> writes
                  acknowledge before replication. A primary crash before
                  replication means the write disappears. Secondary reads can
                  return stale data. This combination is unsafe for banking.
                </p>
              )
            ) : (
              <p>
                <strong>✗ Not available.</strong> Cassandra is an AP system — it
                prefers availability over consistency during network partitions.
                Even at <code>QUORUM</code> consistency level you can get stale
                reads from nodes that haven't received the latest write yet.
              </p>
            ),
          ),
        ],
      },
      "ACID transactions": {
        title: "ACID Transactions",
        subtitle: `Why ${wl} needs them — and how ${dbLabel} delivers them`,
        accentColor: "#10b981",
        sections: [
          {
            title: `Why ${wl} needs ACID transactions`,
            accent: "#10b981",
            content: (
              <>
                <p>
                  A bank transfer is two operations:{" "}
                  <strong>debit account A</strong> then{" "}
                  <strong>credit account B</strong>. If the debit succeeds but
                  the credit fails (network blip, crash), money vanishes. ACID
                  atomicity guarantees both operations either commit together or
                  both roll back.
                </p>
                <ul style={{ marginTop: 8 }}>
                  <li>
                    <strong>Atomicity</strong> — no partial writes
                  </li>
                  <li>
                    <strong>Consistency</strong> — balance constraints enforced
                    (no negative balance)
                  </li>
                  <li>
                    <strong>Isolation</strong> — concurrent transfers don't
                    interfere
                  </li>
                  <li>
                    <strong>Durability</strong> — committed transfers survive
                    crashes
                  </li>
                </ul>
              </>
            ),
          },
          dbSection(
            isRelational ? (
              <p>
                <strong>✓ Native ACID.</strong> Every SQL statement in
                PostgreSQL runs inside a transaction. Multi-table debit+credit
                is a single <code>BEGIN / COMMIT</code>. Foreign keys enforce
                referential integrity. Serializable isolation stops double-spend
                race conditions.
              </p>
            ) : isMongo ? (
              <p>
                <strong>⚠ Multi-document transactions exist since v4.0</strong>,
                but they carry meaningful overhead (~3× latency vs single-doc
                ops). MongoDB's primary design is single-document atomicity —
                the document is the transaction boundary. For a ledger, every
                debit-credit pair spans at least two documents, so you're always
                paying the transaction overhead.
              </p>
            ) : (
              <p>
                <strong>✗ No multi-partition ACID.</strong> Cassandra has{" "}
                <em>Lightweight Transactions</em> (compare-and-set) but they
                only cover a single partition and use Paxos — slow and limited.
                There's no way to atomically update two different partitions
                (e.g., two account balances) without an external coordinator.
              </p>
            ),
          ),
        ],
      },
      "Correctness over speed": {
        title: "Correctness over Speed",
        subtitle: `Why ${wl} prioritises correctness — and how ${dbLabel} aligns`,
        accentColor: "#f59e0b",
        sections: [
          {
            title: `Why ${wl} needs Correctness over speed`,
            accent: "#f59e0b",
            content: (
              <>
                <p>
                  A bank would rather a transaction take 30ms than 5ms if the
                  5ms version has any chance of losing data. A phantom balance
                  that clears risk checks can pay out a fraudulent transaction.
                  A lost write creates an audit gap that regulators audit.
                </p>
                <p style={{ marginTop: 8 }}>
                  Regulatory environments (PCI-DSS, SOX, GDPR) require provable
                  correctness, immutable audit trails, and the ability to replay
                  every state change. Speed is measured in tens of milliseconds
                  — correctness is measured in money.
                </p>
              </>
            ),
          },
          dbSection(
            isRelational ? (
              <p>
                <strong>✓ Designed correctness-first.</strong> Schema
                constraints, foreign keys, CHECK constraints, triggers, and
                row-level security are all part of the query engine. The
                database enforces correctness so the application doesn't have
                to.
              </p>
            ) : isMongo ? (
              writeConcern === "wmajority" ? (
                <p>
                  <strong>⚠ w:majority reduces loss risk</strong> but MongoDB's
                  document model has weaker structural guarantees. There are no
                  foreign keys, no CHECK constraints enforced at DB level, and
                  no referential integrity. Your application must enforce these
                  — which is error-prone at scale.
                </p>
              ) : (
                <p>
                  <strong>✗ w:1 prioritises speed.</strong> The primary
                  fires-and-forgets to secondaries. If the primary crashes
                  before replication, the write disappears. For a financial
                  ledger this is a data loss event, not a recoverable error.
                </p>
              )
            ) : (
              <p>
                <strong>✗ AP system.</strong> Cassandra is explicitly designed
                to favour availability over correctness. Under partition, it
                will serve potentially stale or conflicting data rather than
                refuse the request. This is the opposite of what a banking
                system needs.
              </p>
            ),
          ),
        ],
      },
    };
  }

  /* ── E-Commerce needs ──────────────────────────────── */
  if (workload === "ecommerce") {
    return {
      "Flexible schema": {
        title: "Flexible Schema",
        subtitle: `Why ${wl} needs it — and how ${dbLabel} handles it`,
        accentColor: "#14b8a6",
        sections: [
          {
            title: `Why ${wl} needs Flexible schema`,
            accent: "#14b8a6",
            content: (
              <>
                <p>
                  A TV has{" "}
                  <em>
                    screen size, resolution, panel type, HDR format, HDMI ports
                  </em>
                  . A shirt has{" "}
                  <em>size, colour, material, care instructions</em>. Forcing
                  these into the same rigid table means either hundreds of NULL
                  columns or an expensive <code>ALTER TABLE</code> every time a
                  new product type is added.
                </p>
                <p style={{ marginTop: 8 }}>
                  E-commerce catalogs evolve constantly — new product
                  categories, A/B tested attributes, and regional variations
                  must ship without a database migration window.
                </p>
              </>
            ),
          },
          dbSection(
            isMongo ? (
              <p>
                <strong>✓ Native flexible schema.</strong> Each product is its
                own JSON document. A TV document has different fields from a
                shirt document. Schema validation is optional and incremental —
                you add constraints only where you need them. No migrations, no
                NULLs, no attribute tables.
              </p>
            ) : isRelational ? (
              <p>
                <strong>⚠ Workable via JSONB.</strong> PostgreSQL's{" "}
                <code>JSONB</code> column lets you store arbitrary attributes
                per product. You get GIN indexes on JSON fields and full SQL on
                structured columns. However, schema migrations for new typed
                columns still require <code>ALTER TABLE</code> with table
                rewrites on large catalogs.
              </p>
            ) : (
              <p>
                <strong>⚠ Wide-column flexibility.</strong> Cassandra allows
                adding columns without a full schema migration, but all rows in
                a partition share the same column family. You can't have truly
                per-row arbitrary structure like a document store — deeply
                nested product specs must be serialised into a blob column.
              </p>
            ),
          ),
        ],
      },
      "Nested product data": {
        title: "Nested Product Data",
        subtitle: `Why ${wl} needs it — and how ${dbLabel} handles it`,
        accentColor: "#8b5cf6",
        sections: [
          {
            title: `Why ${wl} needs Nested product data`,
            accent: "#8b5cf6",
            content: (
              <>
                <p>
                  A single product page typically needs: the product, its
                  variants (each with size/colour/price/stock), its images, its
                  category path, its specs, and its shipping rules. In a
                  relational schema this is 5–6 JOIN tables per page load.
                </p>
                <p style={{ marginTop: 8 }}>
                  At catalog scale (100k page views/min), those JOINs become the
                  bottleneck. Embedding all of this inside one document means a
                  single indexed read returns the entire page payload.
                </p>
              </>
            ),
          },
          dbSection(
            isMongo ? (
              <p>
                <strong>✓ Optimal.</strong> Variants, specs, and images embed
                directly inside the product document. One <code>findOne</code>{" "}
                returns the full product tree. Updates to variants are atomic
                within the document — no JOIN, no transaction boundary to
                manage.
              </p>
            ) : isRelational ? (
              <p>
                <strong>⚠ Possible but requires JOINs.</strong> Products,
                variants, images, and specs live in separate normalised tables.
                A full product read requires a multi-table JOIN query. With
                proper indexing this is fast for moderate scale, but at high
                read throughput it becomes a primary bottleneck.
              </p>
            ) : (
              <p>
                <strong>✗ Flat rows only.</strong> Cassandra stores data in wide
                rows but has no native nested structure. Variants and specs must
                be serialised into a blob column or spread across multiple
                tables with duplicated partition keys — losing the ability to
                query or index nested fields.
              </p>
            ),
          ),
        ],
      },
      "Read-heavy workload": {
        title: "Read-Heavy Workload",
        subtitle: `Why ${wl} needs it — and how ${dbLabel} handles it`,
        accentColor: "#3b82f6",
        sections: [
          {
            title: `Why ${wl} needs Read-heavy workload support`,
            accent: "#3b82f6",
            content: (
              <>
                <p>
                  A typical e-commerce ratio:{" "}
                  <strong>~100 product page views for every 1 purchase</strong>.
                  Browse, search, and filter traffic dwarfs write traffic. The
                  database must handle burst read load — Black Friday traffic
                  spikes — without degrading.
                </p>
                <p style={{ marginTop: 8 }}>
                  Reads also need to be fast at the 99th percentile, not just
                  average, because slow product pages directly hurt conversion
                  rates (every 100ms of latency ≈ 1% revenue loss at
                  Amazon-scale).
                </p>
              </>
            ),
          },
          dbSection(
            isMongo ? (
              <p>
                <strong>✓ Strong read scaling.</strong> Compound indexes, the
                aggregation pipeline, and read preference routing to secondaries
                all help. Sharding spreads read load horizontally. The document
                model returns complete product payloads in one round trip.
              </p>
            ) : isRelational ? (
              <p>
                <strong>✓ Excellent with indexing.</strong> PostgreSQL's query
                planner, bitmap index scans, and connection pooling handle
                read-heavy workloads well. Read replicas offload primary
                traffic. For e-commerce scale, this is a proven architecture.
              </p>
            ) : (
              <p>
                <strong>⚠ Partition-key dependent.</strong> Cassandra reads are
                extremely fast when the query matches the partition key (e.g.,
                products by category). Range queries, full-text search, or
                cross-category browsing require multiple tables or a search
                layer like Elasticsearch sitting in front of Cassandra.
              </p>
            ),
          ),
        ],
      },
    };
  }

  /* ── Chat needs ────────────────────────────────────── */
  return {
    "Massive write throughput": {
      title: "Massive Write Throughput",
      subtitle: `Why ${wl} needs it — and how ${dbLabel} handles it`,
      accentColor: "#f59e0b",
      sections: [
        {
          title: `Why ${wl} needs Massive write throughput`,
          accent: "#f59e0b",
          content: (
            <>
              <p>
                A chat platform at Slack scale handles{" "}
                <strong>hundreds of thousands of messages per second</strong>.
                Each message, reaction, and presence update is a write. Unlike a
                bank transfer, a message arriving 50ms late is acceptable — but
                a message that <em>fails</em> to write is not.
              </p>
              <p style={{ marginTop: 8 }}>
                A relational single-primary bottleneck hits its ceiling well
                before this scale. You need a DB whose write path scales{" "}
                <em>linearly</em> with the number of nodes — not one that
                requires a single primary to serialize all writes.
              </p>
            </>
          ),
        },
        dbSection(
          isRelational ? (
            <p>
              <strong>✗ Primary bottleneck.</strong> All writes must go through
              the single primary. Sharding PostgreSQL is possible but
              operationally complex (Citus, Patroni). At millions of writes/sec
              you're working against the architecture, not with it.
            </p>
          ) : isMongo ? (
            <p>
              <strong>⚠ Good but limited.</strong> MongoDB sharding distributes
              writes across shard primaries. Each shard has its own write path.
              At moderate scale this works well, but each shard still has a
              primary bottleneck. At millions of writes/sec, Cassandra's ring
              architecture with no primary outperforms MongoDB.
            </p>
          ) : (
            <p>
              <strong>✓ Built for this.</strong> Cassandra's log-structured
              merge (LSM) storage engine turns all writes into sequential
              appends — the fastest disk operation possible. Every node accepts
              writes. Adding nodes linearly increases write capacity. No
              primary, no bottleneck.
            </p>
          ),
        ),
      ],
    },
    "Partition-friendly reads": {
      title: "Partition-Friendly Reads",
      subtitle: `Why ${wl} needs it — and how ${dbLabel} handles it`,
      accentColor: "#6366f1",
      sections: [
        {
          title: `Why ${wl} needs Partition-friendly reads`,
          accent: "#6366f1",
          content: (
            <>
              <p>
                Chat reads are highly predictable:{" "}
                <strong>"get the last 50 messages in #general"</strong>. The
                partition key is the channel ID; the sort key is the timestamp.
                Every read is a single-partition range scan — cheap and fast.
              </p>
              <p style={{ marginTop: 8 }}>
                Without partition-key aligned reads, fetching a channel timeline
                requires scanning across nodes, merging results, and sorting —
                turning a O(1) lookup into a O(n) scatter-gather operation at
                scale.
              </p>
            </>
          ),
        },
        dbSection(
          isRelational ? (
            <p>
              <strong>⚠ Works with care.</strong> A{" "}
              <code>(channel_id, ts)</code> composite index makes timeline reads
              fast on a single node. However, as the messages table grows to
              billions of rows across channels, range scans slow down and
              partitioning strategies (table partitioning by date) add
              operational complexity.
            </p>
          ) : isMongo ? (
            <p>
              <strong>⚠ Shard key matters.</strong> If you shard by{" "}
              <code>channel_id</code>, timeline reads are partition-local and
              fast. If you shard by <code>_id</code> (default), messages for the
              same channel scatter across shards — requiring a scatter-gather
              aggregation for every timeline read.
            </p>
          ) : (
            <p>
              <strong>✓ First-class partition model.</strong> Cassandra's
              primary key is <code>(channel_id, ts)</code>. Every timeline read
              is a single-partition range scan — guaranteed to hit exactly one
              node. The data model is literally designed around this access
              pattern.
            </p>
          ),
        ),
      ],
    },
    "High availability": {
      title: "High Availability",
      subtitle: `Why ${wl} needs it — and how ${dbLabel} handles it`,
      accentColor: "#ec4899",
      sections: [
        {
          title: `Why ${wl} needs High availability`,
          accent: "#ec4899",
          content: (
            <>
              <p>
                Chat users expect the app to work <strong>24/7</strong>. A
                10-second election window where writes are rejected is
                unacceptable — messages fail, users see spinners, they switch to
                a competitor. A 99.9% SLA allows only 8.7 hours of downtime per
                year. 99.99% allows 52 minutes.
              </p>
              <p style={{ marginTop: 8 }}>
                High availability means the system can tolerate a node dying, a
                DC losing power, or a network partition — and continue serving
                traffic without manual intervention.
              </p>
            </>
          ),
        },
        dbSection(
          isRelational ? (
            <p>
              <strong>⚠ Requires explicit setup.</strong> PostgreSQL HA needs
              Patroni/Pacemaker/repmgr + a VIP or load balancer. Primary failure
              triggers a promotion of a standby. Depending on configuration,
              this takes 15–60 seconds of write downtime. Multi-region requires
              careful replication lag management.
            </p>
          ) : isMongo ? (
            <p>
              <strong>⚠ Automatic but not instant.</strong> Replica sets hold an
              election when the primary fails (~5–10 seconds). During the
              election, writes are rejected. Other shards are unaffected. At
              chat scale (potentially dozens of shards), the probability of{" "}
              <em>some</em> shard being in election at any moment is
              non-trivial.
            </p>
          ) : (
            <p>
              <strong>✓ Peer-to-peer, no single point of failure.</strong> With
              no primary, any node can serve writes. Cassandra's gossip protocol
              detects failures in milliseconds. Multi-DC replication with{" "}
              <code>NetworkTopologyStrategy</code> gives 99.99%+ availability
              even during full DC outages. Write traffic reroutes automatically.
            </p>
          ),
        ),
      ],
    },
  };
}

function NeedsChecklist({
  title,
  checks,
  onNeedClick,
}: {
  title: string;
  checks: NeedCheck[];
  onNeedClick: (need: string) => void;
}) {
  return (
    <div className="db-tradeoff-needs">
      <p className="db-tradeoff-needs__title">{title} needs:</p>
      {checks.map((c) => (
        <button
          key={c.need}
          className="db-tradeoff-needs__row db-tradeoff-needs__row--btn"
          onClick={() => onNeedClick(c.need)}
        >
          <span
            className="db-tradeoff-needs__icon"
            style={{ color: STATUS_COLOR[c.status] }}
          >
            {STATUS_ICON[c.status]}
          </span>
          <div className="db-tradeoff-needs__body">
            <span className="db-tradeoff-needs__label">{c.need}</span>
            <span className="db-tradeoff-needs__note">{c.note}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

interface Props {
  onAnimationComplete?: () => void;
}

const W = 960;
const H = 660;

/* ── Colour helpers ──────────────────────────────────── */

const DB_COLORS: Record<string, { fill: string; stroke: string }> = {
  relational: { fill: "#172554", stroke: "#3b82f6" },
  mongodb: { fill: "#052e16", stroke: "#22c55e" },
  cassandra: { fill: "#422006", stroke: "#f59e0b" },
};

const NODE_STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  up: { fill: "#0f3b2e", stroke: "#10b981" },
  down: { fill: "#7f1d1d", stroke: "#ef4444" },
  lagging: { fill: "#78350f", stroke: "#f59e0b" },
};

const fitColor = (score: number) => {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
};

const DbTradeoffVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useDbTradeoffAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const needConcepts = buildNeedConcepts(
    runtime.workload,
    runtime.dbType,
    runtime.writeConcern,
    runtime.readPreference,
  );
  const { openConcept: openNeedConcept, ConceptModal: NeedModal } =
    useConceptModal(needConcepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const {
    dbType,
    workload,
    selectedOp,
    consistencyLevel,
    nodes,
    result,
    dataModel,
    dataModelDetail,
    whyThisDb,
    explanation,
    hotZones,
    phase,
    targetShardIdx,
    writeConcern,
    readPreference,
    replicaAckCount,
    joinMode,
  } = runtime;

  const hot = (zone: string) => hotZones.includes(zone);
  const isReplicaAck = phase === "replica-ack";
  const isJoinMerge = phase === "join-merge";
  const profile = DB_PROFILES[dbType];
  const dbColors = DB_COLORS[dbType];

  /* ── Build VizCraft scene ────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    /* ── Client app ──────────────────────────────────── */
    b.node("client-app")
      .at(130, 280)
      .rect(130, 65, 12)
      .fill(hot("client-app") ? "#1e3a8a" : "#0f172a")
      .stroke(hot("client-app") ? "#60a5fa" : "#334155", 2)
      .label("Client App", {
        fill: "#e2e8f0",
        fontSize: 13,
        fontWeight: "bold",
        dy: -6,
      })
      .label(OPERATION_CATALOG[selectedOp].label, {
        fill: "#94a3b8",
        fontSize: 9,
        dy: 14,
      });

    /* ── Query / App Layer ───────────────────────────── */
    b.node("query-layer")
      .at(370, 280)
      .rect(160, 70, 12)
      .fill(hot("query-layer") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("query-layer") ? "#38bdf8" : "#334155", 2)
      .label("App / Query Layer", {
        fill: "#e2e8f0",
        fontSize: 13,
        fontWeight: "bold",
        dy: -6,
      })
      .label(
        dbType === "cassandra"
          ? "Coordinator Router"
          : dbType === "mongodb"
            ? "mongos / Driver"
            : "SQL Executor",
        { fill: "#7dd3fc", fontSize: 9, dy: 14 },
      )
      .onClick(() => openConcept("data-modeling"));

    b.edge("client-app", "query-layer", "e-client-query")
      .stroke(hot("client-app") ? "#60a5fa" : "#475569", 2)
      .arrow(true);

    /* ── DB topology (varies per DB type) ────────────── */

    if (dbType === "mongodb") {
      /* ── MongoDB: mongos → Sharded cluster ─────────── */
      const shardCount =
        runtime.targetShardIdx !== undefined
          ? Math.max(
              ...nodes
                .filter((n) => n.shardIdx !== undefined)
                .map((n) => n.shardIdx!),
            ) + 1
          : 1;
      const shardSpacingY = shardCount <= 2 ? 200 : 170;
      const shardStartY = H / 2 - ((shardCount - 1) * shardSpacingY) / 2;
      const shardKeyField =
        workload === "banking"
          ? "account_id"
          : workload === "ecommerce"
            ? "product_id"
            : "channel_id";

      for (let s = 0; s < shardCount; s++) {
        const sy = shardStartY + s * shardSpacingY;
        const shardNodes = nodes.filter((n) => n.shardIdx === s);
        const primary = shardNodes.find((n) => n.role === "primary");
        const secondaries = shardNodes.filter((n) => n.role === "secondary");
        const isTarget =
          isTargetedOp(selectedOp) && s === runtime.targetShardIdx;
        const isScatter = !isTargetedOp(selectedOp);
        const shardHighlighted = isTarget || isScatter;

        /* Shard background overlay */
        b.overlay((o) => {
          o.add(
            "rect",
            {
              x: 570,
              y: sy - 72,
              width: 350,
              height: 145,
              rx: 10,
              fill: shardHighlighted
                ? "rgba(34,197,94,0.05)"
                : "rgba(15,23,42,0.3)",
              stroke: shardHighlighted
                ? "rgba(34,197,94,0.25)"
                : "rgba(100,116,139,0.15)",
              strokeWidth: 1,
              strokeDasharray: "4,3",
            },
            { key: `shard-bg-${s}` },
          );
          // Shard label
          o.add(
            "text",
            {
              x: 580,
              y: sy - 57,
              text: `Shard ${s + 1}  ·  ${shardKeyField} range`,
              fill: shardHighlighted ? "#86efac" : "#64748b",
              fontSize: 9,
              fontWeight: "600",
            },
            { key: `shard-label-${s}` },
          );
          // Majority verdict banner (replica-ack phase, target shard only)
          if (isReplicaAck && isTarget) {
            const gotNew = replicaAckCount >= 2;
            o.add(
              "text",
              {
                x: 580,
                y: sy - 44,
                text: gotNew
                  ? `MAJORITY: NEW value ✓  (${replicaAckCount}/3 nodes)`
                  : `MAJORITY: OLD value  (1/3 — not yet committed)`,
                fill: gotNew ? "#22c55e" : "#f59e0b",
                fontSize: 9,
                fontWeight: "700",
              },
              { key: `shard-majority-${s}` },
            );
          }
        });

        /* Primary node */
        if (primary) {
          const px = 640;
          const py = sy - 20;
          const isHot = hot(primary.id);
          const statusColors = NODE_STATUS_COLORS[primary.status];

          b.node(primary.id)
            .at(px, py)
            .rect(120, 48, 8)
            .fill(
              isHot
                ? dbColors.fill
                : primary.status === "down"
                  ? "#1c1917"
                  : "#0f172a",
            )
            .stroke(
              primary.status === "down"
                ? statusColors.stroke
                : isHot
                  ? dbColors.stroke
                  : statusColors.stroke,
              2,
            )
            .richLabel(
              (l) => {
                l.color("PRIMARY", "#e2e8f0", { fontSize: 10, bold: true });
                l.newline();
                if (isReplicaAck && isTarget) {
                  // Primary always has the latest write
                  l.color("v2  NEW", "#22c55e", { fontSize: 8 });
                } else {
                  l.color(
                    primary.status === "down"
                      ? "OFFLINE"
                      : `${primary.loadPct}%`,
                    primary.status === "down" ? "#ef4444" : "#94a3b8",
                    { fontSize: 8 },
                  );
                }
              },
              { fill: "#fff", fontSize: 10, dy: 0, lineHeight: 1.6 },
            )
            .onClick(() => openConcept("mongodb"));

          const isMajorityResponse =
            phase === "db-response" &&
            isTarget &&
            readPreference === "majority" &&
            isReadOp(selectedOp);
          const majorityResponseColor = isMajorityResponse
            ? replicaAckCount >= 2
              ? "#22c55e"
              : "#f59e0b"
            : null;

          b.edge("query-layer", primary.id, `e-query-${primary.id}`)
            .stroke(
              majorityResponseColor ??
                (isHot
                  ? dbColors.stroke
                  : primary.status === "down"
                    ? "#7f1d1d"
                    : "#475569"),
              majorityResponseColor ? 2.5 : isHot ? 2.2 : 1.4,
            )
            .arrow(true);
        }

        /* Secondary nodes */
        secondaries.forEach((sec, si) => {
          const sx = 790 + si * 105;
          const sy2 = sy - 20;
          const isHot = hot(sec.id);
          const statusColors = NODE_STATUS_COLORS[sec.status];

          b.node(sec.id)
            .at(sx, sy2)
            .rect(95, 44, 8)
            .fill(
              isReplicaAck && isTarget
                ? replicaAckCount >= si + 2
                  ? "#052e16" // has new value — green tint
                  : "#1c0f00" // has old value — amber tint
                : isHot
                  ? dbColors.fill
                  : sec.status === "down"
                    ? "#1c1917"
                    : "#0f172a",
            )
            .stroke(
              isReplicaAck && isTarget
                ? replicaAckCount >= si + 2
                  ? "#22c55e"
                  : "#b45309"
                : sec.status === "down"
                  ? statusColors.stroke
                  : isHot
                    ? dbColors.stroke
                    : "#334155",
              isReplicaAck && isTarget ? 1.8 : 1.5,
            )
            .richLabel(
              (l) => {
                l.color(`SEC ${si + 1}`, "#cbd5e1", {
                  fontSize: 9,
                  bold: true,
                });
                l.newline();
                if (isReplicaAck && isTarget) {
                  const secHasNew = replicaAckCount >= si + 2;
                  l.color(
                    secHasNew ? "v2  NEW" : "v1  OLD",
                    secHasNew ? "#22c55e" : "#f59e0b",
                    { fontSize: 8 },
                  );
                } else {
                  l.color(
                    sec.status === "down"
                      ? "OFF"
                      : sec.status === "lagging"
                        ? "LAG"
                        : `${sec.loadPct}%`,
                    sec.status === "down"
                      ? "#ef4444"
                      : sec.status === "lagging"
                        ? "#f59e0b"
                        : "#94a3b8",
                    { fontSize: 8 },
                  );
                }
              },
              { fill: "#fff", fontSize: 9, dy: 0, lineHeight: 1.5 },
            )
            .onClick(() => openConcept("write-concern"));

          /* Primary → secondary replication edge */
          if (primary && sec.status !== "down" && primary.status !== "down") {
            b.edge(primary.id, sec.id, `rep-${primary.id}-${sec.id}`)
              .stroke("#334155", 1)
              .dashed()
              .arrow(true);
          }
        });
      }
    } else if (dbType === "cassandra") {
      /* ── Cassandra: peer-to-peer hash ring ───────────── */
      const ringNodeCount = nodes.length;
      const rf = Math.min(runtime.replicationFactor, ringNodeCount);
      const coordIdx = runtime.coordinatorIdx % Math.max(1, ringNodeCount);
      const coordId = nodes[coordIdx]?.id ?? "db-node-0";
      const koIdx = runtime.keyOwnerIdx % Math.max(1, ringNodeCount);

      // Progressive reveal: show roles only once the step has reached them
      const ROUTE_PHASES = new Set([
        "partition-route",
        "replication",
        "response",
        "stale",
        "consistent",
        "summary",
      ]);
      const FANOUT_PHASES = new Set([
        "replication",
        "response",
        "stale",
        "consistent",
        "summary",
      ]);
      const showCoordLabel = ROUTE_PHASES.has(phase);
      const showRfLabels =
        FANOUT_PHASES.has(phase) ||
        (phase === "partition-route" && isReadOp(selectedOp));

      // RF replica indices: key owner + next (RF-1) clockwise
      const rfIndices: number[] = [];
      for (let r = 0; r < rf; r++) {
        rfIndices.push((koIdx + r) % ringNodeCount);
      }
      const rfSet = new Set(rfIndices);

      // Token ring helpers (simplified 0–1000 token space)
      const TOKEN_SPACE = 1000;
      const tokenOf = (idx: number) =>
        Math.round((idx * TOKEN_SPACE) / ringNodeCount);
      const ownedRangeLabel = (idx: number) =>
        idx === 0
          ? `${tokenOf(ringNodeCount - 1)}\u21ba`
          : `${tokenOf(idx - 1)}\u2013${tokenOf(idx)}`;
      // Mid-angle of arc owned by node idx (clockwise arc from node idx-1 to node idx)
      const arcMidAngle = (idx: number) =>
        -Math.PI / 2 +
        (idx - 0.5 + (idx === 0 ? ringNodeCount : 0)) *
          ((2 * Math.PI) / ringNodeCount);

      // Ring geometry
      const cx = 730;
      const cy = H / 2 - 10;
      const R = ringNodeCount <= 3 ? 135 : ringNodeCount <= 4 ? 145 : 155;
      const nodeW = 125;
      const nodeH = 64;

      // Ring circle overlay (consistent hash ring visual)
      b.overlay((o) => {
        o.add(
          "circle",
          {
            x: cx,
            y: cy,
            r: R - 15,
            fill: "none",
            stroke: "rgba(245,158,11,0.12)",
            strokeWidth: 1.5,
            strokeDasharray: "6,4",
          },
          { key: "hash-ring" },
        );
        o.add(
          "text",
          {
            x: cx,
            y: cy - 8,
            text: "Hash Ring",
            fill: "rgba(245,158,11,0.3)",
            fontSize: 10,
            fontWeight: "600",
          },
          { key: "ring-label" },
        );
      });

      // Token boundary labels (outside ring) + arc owned-range labels (inside ring)
      // + hash-key landing dot on ring at key owner position (only after fanout)
      b.overlay((o) => {
        for (let i = 0; i < ringNodeCount; i++) {
          const nodeAngle = -Math.PI / 2 + i * ((2 * Math.PI) / ringNodeCount);
          const isKo = i === koIdx;

          // T:N label just outside the ring circle
          o.add(
            "text",
            {
              x: cx + (R + 18) * Math.cos(nodeAngle),
              y: cy + (R + 18) * Math.sin(nodeAngle),
              text: `T:${tokenOf(i)}`,
              fill: showRfLabels && isKo ? "#f97316" : "rgba(245,158,11,0.55)",
              fontSize: 8,
              fontWeight: "700",
            },
            { key: `tok-${i}` },
          );

          // Range label inside the ring at arc mid-angle
          const mid = arcMidAngle(i);
          o.add(
            "text",
            {
              x: cx + (R - 34) * Math.cos(mid),
              y: cy + (R - 34) * Math.sin(mid),
              text: ownedRangeLabel(i),
              fill:
                showRfLabels && isKo
                  ? "rgba(249,115,22,0.9)"
                  : "rgba(245,158,11,0.32)",
              fontSize: 8,
              fontWeight: showRfLabels && isKo ? "700" : "400",
            },
            { key: `arc-${i}` },
          );
        }

        // Orange dot on the ring at the key owner's position: "hash(key) lands here"
        if (showRfLabels) {
          const koAngle =
            -Math.PI / 2 + koIdx * ((2 * Math.PI) / ringNodeCount);
          o.add(
            "circle",
            {
              x: cx + (R - 15) * Math.cos(koAngle),
              y: cy + (R - 15) * Math.sin(koAngle),
              r: 5,
              fill: "#f97316",
              stroke: "#fff",
              strokeWidth: 1,
            },
            { key: "hash-land-dot" },
          );
        }
      });

      // Position nodes on ring
      nodes.forEach((node, i) => {
        const angle = -Math.PI / 2 + i * ((2 * Math.PI) / ringNodeCount);
        const nx = cx + R * Math.cos(angle) - nodeW / 2;
        const ny = cy + R * Math.sin(angle) - nodeH / 2;

        const isCoord = i === coordIdx;
        const isKeyOwner = i === koIdx;
        const isRf = rfSet.has(i);
        const statusColors = NODE_STATUS_COLORS[node.status];
        const isHot = hot(node.id);

        // Progressive role label
        const roleLabel =
          showCoordLabel && showRfLabels && isCoord && isKeyOwner
            ? "COORD \u00b7 KEY"
            : showCoordLabel && isCoord
              ? "COORDINATOR"
              : showRfLabels && isKeyOwner
                ? "KEY OWNER"
                : showRfLabels && isRf
                  ? "RF Replica"
                  : `Node ${i + 1}`;
        const statusLabel =
          node.status === "down"
            ? "OFFLINE"
            : node.status === "lagging"
              ? "LAGGING"
              : `${node.loadPct}%`;

        // Progressive fill/stroke
        const revealCoord = showCoordLabel && isCoord;
        const revealKo = showRfLabels && isKeyOwner;
        const revealRf = showRfLabels && isRf;

        b.node(node.id)
          .at(nx, ny)
          .rect(nodeW, nodeH, 10)
          .fill(
            node.status === "down"
              ? "#1c1917"
              : isHot
                ? dbColors.fill
                : revealKo
                  ? "rgba(120,53,15,0.7)"
                  : revealRf
                    ? "rgba(66,32,6,0.5)"
                    : "#0f172a",
          )
          .stroke(
            node.status === "down"
              ? statusColors.stroke
              : revealKo
                ? "#f97316"
                : revealCoord
                  ? "#fbbf24"
                  : isHot
                    ? dbColors.stroke
                    : revealRf
                      ? "rgba(245,158,11,0.45)"
                      : statusColors.stroke,
            revealKo || revealCoord ? 2.5 : 2,
          )
          .richLabel(
            (l) => {
              l.color(
                roleLabel,
                revealKo ? "#f97316" : revealCoord ? "#fbbf24" : "#e2e8f0",
                {
                  fontSize: 10,
                  bold: true,
                },
              );
              l.newline();
              l.color(
                statusLabel,
                node.status === "down"
                  ? "#ef4444"
                  : node.status === "lagging"
                    ? "#f59e0b"
                    : "#94a3b8",
                { fontSize: 9 },
              );
            },
            { fill: "#fff", fontSize: 10, dy: 0, lineHeight: 1.5 },
          )
          .onClick(() => openConcept("token-ring"));
      });

      // Edge: query-layer → coordinator (shown once coordinator is revealed)
      if (showCoordLabel && nodes[coordIdx]?.status !== "down") {
        b.edge("query-layer", coordId, `e-query-${coordId}`)
          .stroke(hot(coordId) ? "#fbbf24" : "#78350f", 2)
          .arrow(true);
      }

      // Edges: coordinator → each RF node (shown once RF is revealed)
      if (showRfLabels) {
        rfIndices.forEach((ri) => {
          if (
            ri !== coordIdx &&
            nodes[ri]?.status !== "down" &&
            nodes[coordIdx]?.status !== "down"
          ) {
            b.edge(coordId, nodes[ri].id, `e-coord-${nodes[ri].id}`)
              .stroke(
                ri === koIdx ? "rgba(249,115,22,0.5)" : "rgba(245,158,11,0.4)",
                1.4,
              )
              .arrow(true);
          }
        });
      }

      // Ring gossip edges (skip if already a coordinator→replica edge)
      if (ringNodeCount >= 2) {
        const coordRfEdges = new Set(
          rfIndices
            .filter((ri) => ri !== coordIdx)
            .map((ri) => `${coordIdx}-${ri}`),
        );
        for (let i = 0; i < ringNodeCount; i++) {
          const next = (i + 1) % ringNodeCount;
          if (
            nodes[i].status !== "down" &&
            nodes[next].status !== "down" &&
            !coordRfEdges.has(`${i}-${next}`)
          ) {
            b.edge(nodes[i].id, nodes[next].id, `ring-${i}-${next}`)
              .stroke("rgba(120,53,15,0.5)", 1)
              .dashed();
          }
        }
      }
    } else {
      /* ── Relational: flat node list ──────────────────── */
      const nodeCount = nodes.length;
      const dbLeft = 640;
      const dbSpacingY = nodeCount <= 3 ? 120 : 100;
      const dbStartY = 280 - ((nodeCount - 1) * dbSpacingY) / 2;

      nodes.forEach((node, i) => {
        const y = dbStartY + i * dbSpacingY;
        const statusColors = NODE_STATUS_COLORS[node.status];
        const isHot = hot(node.id);

        const roleLabel =
          node.role === "primary" ? "Primary" : `Secondary ${i}`;

        const statusLabel =
          node.status === "down"
            ? "OFFLINE"
            : node.status === "lagging"
              ? "LAGGING"
              : `${node.loadPct}% load`;

        b.node(node.id)
          .at(dbLeft + (i % 2 === 1 ? 60 : 0), y)
          .rect(170, 80, 12)
          .fill(
            isHot
              ? dbColors.fill
              : node.status === "down"
                ? "#1c1917"
                : "#0f172a",
          )
          .stroke(
            node.status === "down"
              ? statusColors.stroke
              : isHot
                ? dbColors.stroke
                : statusColors.stroke,
            2,
          )
          .richLabel(
            (l) => {
              l.color(roleLabel, "#e2e8f0", { fontSize: 11, bold: true });
              l.color("  DB Node", "#64748b", { fontSize: 9 });
              l.newline();
              l.color(
                statusLabel,
                node.status === "down"
                  ? "#ef4444"
                  : node.status === "lagging"
                    ? "#f59e0b"
                    : "#94a3b8",
                { fontSize: 9 },
              );
            },
            { fill: "#fff", fontSize: 11, dy: 2, lineHeight: 1.7 },
          )
          .onClick(() => openConcept("relational"));

        b.edge("query-layer", node.id, `e-query-${node.id}`)
          .stroke(
            isHot
              ? dbColors.stroke
              : node.status === "down"
                ? "#7f1d1d"
                : "#475569",
            isHot ? 2.2 : 1.5,
          )
          .arrow(true);
      });

      /* ── Replication edges ─────────────────────────── */
      if (nodeCount >= 2) {
        for (let i = 1; i < nodeCount; i++) {
          if (nodes[i].status !== "down") {
            b.edge(nodes[0].id, nodes[i].id, `rep-0-${i}`)
              .stroke("#334155", 1.2)
              .dashed();
          }
        }
      }
    }

    /* ── Join-mode annotation overlay ───────────────── */
    if (selectedOp === "join-query" && dbType === "mongodb") {
      const JOIN_MODE_META: Record<
        JoinMode,
        { text: string; fill: string; sub: string }
      > = {
        "app-join": {
          text: "App-side join — 2 sequential round trips",
          fill: "#f59e0b",
          sub: isJoinMerge ? "MERGING COLLECTIONS IN APPLICATION LAYER" : "",
        },
        lookup: {
          text: "$lookup aggregation pipeline — scatter-gather",
          fill: "#8b5cf6",
          sub: "",
        },
        denormalized: {
          text: "Denormalized — embedded document, no join needed",
          fill: "#22c55e",
          sub: "",
        },
      };
      const meta = JOIN_MODE_META[joinMode];
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: W / 2,
            y: 22,
            text: meta.text,
            fill: meta.fill,
            fontSize: 11,
            fontWeight: "700",
          },
          { key: "join-mode-label" },
        );
        if (meta.sub) {
          o.add(
            "text",
            {
              x: W / 2,
              y: 40,
              text: meta.sub,
              fill: "#f97316",
              fontSize: 10,
              fontWeight: "700",
            },
            { key: "join-merge-label" },
          );
        }
      });
    }

    /* ── Cassandra CL annotation overlay (progressive) ──── */
    if (
      dbType === "cassandra" &&
      phase !== "" &&
      phase !== "data-model" &&
      phase !== "request"
    ) {
      const rf = Math.min(runtime.replicationFactor, nodes.length);
      const koIdx = runtime.keyOwnerIdx % Math.max(1, nodes.length);
      const coordNode =
        (runtime.coordinatorIdx % Math.max(1, nodes.length)) + 1;
      const rfNodeLabels = Array.from(
        { length: rf },
        (_, r) => `N${((koIdx + r) % nodes.length) + 1}`,
      );
      const clName =
        consistencyLevel === "strong"
          ? "ALL"
          : consistencyLevel === "quorum"
            ? "QUORUM"
            : "ONE";
      const acksNeeded =
        consistencyLevel === "strong"
          ? rf
          : consistencyLevel === "quorum"
            ? Math.floor(rf / 2) + 1
            : 1;

      // Phase-appropriate text
      const showFanout =
        phase === "replication" ||
        phase === "response" ||
        phase === "summary" ||
        (phase === "partition-route" && isReadOp(selectedOp));
      const text = showFanout
        ? `Coord: N${coordNode}  ·  hash(key) → N${koIdx + 1}  ·  RF=[${rfNodeLabels.join(" → ")}]  ·  CL=${clName} (${acksNeeded}/${rf} acks)`
        : `Coord: N${coordNode}  ·  CL=${clName}`;

      b.overlay((o) => {
        o.add(
          "text",
          {
            x: W / 2,
            y: 22,
            text,
            fill: "#fbbf24",
            fontSize: 11,
            fontWeight: "700",
          },
          { key: "cassandra-cl-label" },
        );
      });
    }

    /* ── Data model overlay ──────────────────────────── */
    if (phase === "data-model" || phase === "summary") {
      b.overlay((o) => {
        dataModelDetail.forEach((line, i) => {
          o.add(
            "text",
            {
              x: 30,
              y: 520 + i * 18,
              text: line,
              fill: "#94a3b8",
              fontSize: 10,
              fontWeight: "400",
            },
            { key: `dm-${i}` },
          );
        });
      });
    }

    /* ── Stale read warning overlay ──────────────────── */
    if (phase === "stale") {
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: W / 2,
            y: 40,
            text: "⚠ STALE READ DETECTED",
            fill: "#ef4444",
            fontSize: 16,
            fontWeight: "700",
          },
          { key: "stale-warn" },
        );
      });
    }

    /* ── Signals ─────────────────────────────────────── */
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig) => {
          const { id, colorClass, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, {
            key: id,
            ...(colorClass ? { className: colorClass } : {}),
          });
        });
      });
    }

    return b;
  })();

  /* ── Mount / destroy ─────────────────────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
    const unsub = pzRef.current?.onChange((s) => {
      viewportRef.current = s;
    });
    return () => {
      unsub?.();
    };
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  /* ── Pills ──────────────────────────────────────────── */
  const pills = [
    {
      key: "relational",
      label: "PostgreSQL",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "mongodb",
      label: "MongoDB",
      color: "#86efac",
      borderColor: "#22c55e",
    },
    {
      key: "cassandra",
      label: "Cassandra",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "consistency",
      label: "Consistency",
      color: "#fecaca",
      borderColor: "#ef4444",
    },
    {
      key: "availability",
      label: "Availability",
      color: "#ddd6fe",
      borderColor: "#8b5cf6",
    },
    {
      key: "data-modeling",
      label: "Data Modeling",
      color: "#99f6e4",
      borderColor: "#14b8a6",
    },
    {
      key: "cap-theorem",
      label: "CAP Theorem",
      color: "#fbcfe8",
      borderColor: "#ec4899",
    },
    {
      key: "replication",
      label: "Replication",
      color: "#c7d2fe",
      borderColor: "#6366f1",
    },
    {
      key: "denormalization",
      label: "Denormalization",
      color: "#a5f3fc",
      borderColor: "#0ea5e9",
    },
    {
      key: "ledger-critical",
      label: "Ledger Critical",
      color: "#fde68a",
      borderColor: "#f59e0b",
    },
    {
      key: "acid",
      label: "ACID",
      color: "#6ee7b7",
      borderColor: "#10b981",
    },
    {
      key: "write-concern",
      label: "Write Concern",
      color: "#f9a8d4",
      borderColor: "#f472b6",
    },
    {
      key: "mixed-concern",
      label: "Mixed Concern",
      color: "#fed7aa",
      borderColor: "#f97316",
    },
    {
      key: "mongo-joins",
      label: "MongoDB Joins",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    {
      key: "token-ring",
      label: "Token Ring",
      color: "#fed7aa",
      borderColor: "#f97316",
    },
    {
      key: "coordinator",
      label: "Coordinator",
      color: "#fef3c7",
      borderColor: "#fbbf24",
    },
    {
      key: "key-owner",
      label: "Key Owner",
      color: "#ffedd5",
      borderColor: "#f97316",
    },
  ];

  return (
    <div className="db-tradeoff-root">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className={`db-tradeoff-stage db-tradeoff-stage--${phase}`}>
            <StageHeader
              title="Database Tradeoff Lab"
              subtitle="Pick a database and workload — see how behavior, latency, and reliability change"
            >
              <StatBadge
                label="DB"
                value={profile.label.split(" ")[0]}
                color={dbColors.stroke}
              />
              <StatBadge
                label="Fit"
                value={`${result.fitScore}/100`}
                color={fitColor(result.fitScore)}
              />
              <StatBadge
                label="Read"
                value={`~${result.readLatencyMs}ms`}
                color="#bae6fd"
              />
              <StatBadge
                label="Write"
                value={`~${result.writeLatencyMs}ms`}
                color="#fca5a5"
              />
              <StatBadge
                label="Avail"
                value={`${result.availability}%`}
                color="#c4b5fd"
              />
              {dbType === "mongodb" && (
                <StatBadge
                  label="Shards"
                  value={`${result.shardsTouched}/${runtime.nodeCount}`}
                  color={result.shardsTouched === 1 ? "#22c55e" : "#f59e0b"}
                />
              )}
              {dbType === "mongodb" && selectedOp === "join-query" && (
                <StatBadge
                  label="Join"
                  value={
                    joinMode === "app-join"
                      ? "App-side"
                      : joinMode === "lookup"
                        ? "$lookup"
                        : "Embed'd"
                  }
                  color={
                    joinMode === "app-join"
                      ? "#f59e0b"
                      : joinMode === "lookup"
                        ? "#a78bfa"
                        : "#22c55e"
                  }
                />
              )}
              {dbType === "mongodb" && (
                <StatBadge
                  label="RPO"
                  value={
                    result.rpoRisk === "high"
                      ? "> 0"
                      : result.rpoRisk === "low"
                        ? "~low"
                        : "≈ 0"
                  }
                  color={result.rpoRisk === "none" ? "#22c55e" : "#ef4444"}
                />
              )}
              {result.rtoMs > 0 && (
                <StatBadge
                  label="RTO"
                  value={`~${(result.rtoMs / 1000).toFixed(0)}s`}
                  color="#f59e0b"
                />
              )}
              {dbType === "mongodb" && (
                <StatBadge
                  label="Mode"
                  value={
                    writeConcern === "wmajority" &&
                    readPreference === "majority"
                      ? "Strong"
                      : writeConcern === "w1" && readPreference === "secondary"
                        ? "Eventual"
                        : "Mixed"
                  }
                  color={
                    writeConcern === "wmajority" &&
                    readPreference === "majority"
                      ? "#22c55e"
                      : writeConcern === "w1" && readPreference === "secondary"
                        ? "#ef4444"
                        : "#f59e0b"
                  }
                />
              )}
              {dbType === "cassandra" && (
                <StatBadge
                  label="RF"
                  value={Math.min(runtime.replicationFactor, runtime.nodeCount)}
                  color="#fbbf24"
                />
              )}
              {dbType === "cassandra" &&
                (() => {
                  const _rf = Math.min(
                    runtime.replicationFactor,
                    runtime.nodeCount,
                  );
                  const _acks =
                    consistencyLevel === "strong"
                      ? _rf
                      : consistencyLevel === "quorum"
                        ? Math.floor(_rf / 2) + 1
                        : 1;
                  const _rPlusW = _acks * 2;
                  const _mode =
                    _rPlusW > _rf
                      ? "Strong"
                      : _rPlusW === _rf
                        ? "Mixed"
                        : "Eventual";
                  const _color =
                    _mode === "Strong"
                      ? "#22c55e"
                      : _mode === "Mixed"
                        ? "#f59e0b"
                        : "#ef4444";
                  return (
                    <StatBadge label="MODE" value={_mode} color={_color} />
                  );
                })()}
              {dbType === "cassandra" && (
                <StatBadge
                  label="Coord"
                  value={`Node ${(runtime.coordinatorIdx % Math.max(1, runtime.nodeCount)) + 1}`}
                  color="#fbbf24"
                />
              )}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              {phase === "summary" ? (
                <NeedsChecklist
                  title={WORKLOAD_PROFILES[workload].label}
                  checks={buildNeedsChecklist(
                    workload,
                    dbType,
                    writeConcern,
                    readPreference,
                    consistencyLevel,
                  )}
                  onNeedClick={openNeedConcept}
                />
              ) : (
                <p>{explanation}</p>
              )}
            </SideCard>

            <SideCard label="Why This DB?" variant="info">
              <p>{whyThisDb}</p>
            </SideCard>

            <SideCard label="Data Model" variant="info">
              <p style={{ color: "#94a3b8", fontSize: 12 }}>{dataModel}</p>
              <div className="db-tradeoff-schema">
                {dataModelDetail.map((line, i) => (
                  <code key={i}>{line}</code>
                ))}
              </div>
            </SideCard>

            <SideCard label="Metrics" variant="info">
              <div className="db-tradeoff-kpis">
                <div className="db-tradeoff-kpis__row">
                  <span>Read latency</span>
                  <strong>~{result.readLatencyMs}ms</strong>
                </div>
                <div className="db-tradeoff-kpis__row">
                  <span>Write latency</span>
                  <strong>~{result.writeLatencyMs}ms</strong>
                </div>
                <div className="db-tradeoff-kpis__row">
                  <span>Throughput</span>
                  <strong>{result.throughputRps.toLocaleString()} rps</strong>
                </div>
                <div className="db-tradeoff-kpis__row">
                  <span>Consistency</span>
                  <strong>{result.consistency}</strong>
                </div>
                <div className="db-tradeoff-kpis__row">
                  <span>Availability</span>
                  <strong>{result.availability}%</strong>
                </div>
                <div className="db-tradeoff-kpis__row">
                  <span>Nodes touched</span>
                  <strong>{result.nodesTouched}</strong>
                </div>
                {dbType === "mongodb" && (
                  <div className="db-tradeoff-kpis__row">
                    <span>Shards touched</span>
                    <strong
                      style={{
                        color:
                          result.shardsTouched === 1 ? "#22c55e" : "#f59e0b",
                      }}
                    >
                      {result.shardsTouched}/{runtime.nodeCount}
                    </strong>
                  </div>
                )}
                {dbType === "mongodb" && (
                  <div className="db-tradeoff-kpis__row">
                    <span>Write concern</span>
                    <strong
                      style={{
                        color: writeConcern === "w1" ? "#ef4444" : "#22c55e",
                      }}
                    >
                      {writeConcern === "w1" ? "w:1 (fast)" : "w:majority"}
                    </strong>
                  </div>
                )}
                {dbType === "mongodb" && (
                  <div className="db-tradeoff-kpis__row">
                    <span>Read mode</span>
                    <strong
                      style={{
                        color:
                          readPreference === "secondary"
                            ? "#f59e0b"
                            : readPreference === "majority"
                              ? "#22c55e"
                              : "#3b82f6",
                      }}
                    >
                      {readPreference === "secondary"
                        ? "Secondary (may be stale)"
                        : readPreference === "majority"
                          ? "Majority (consistent)"
                          : "Primary (latest)"}
                    </strong>
                  </div>
                )}
                {dbType === "mongodb" && (
                  <div className="db-tradeoff-kpis__row">
                    <span>RPO risk</span>
                    <strong
                      style={{
                        color:
                          result.rpoRisk === "none" ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {result.rpoRisk === "high"
                        ? "Data loss possible"
                        : result.rpoRisk === "low"
                          ? "Low risk"
                          : "Safe (≈ 0)"}
                    </strong>
                  </div>
                )}
                {result.rtoMs > 0 && (
                  <div className="db-tradeoff-kpis__row">
                    <span>RTO (recovery)</span>
                    <strong style={{ color: "#f59e0b" }}>
                      ~{(result.rtoMs / 1000).toFixed(0)}s election
                    </strong>
                  </div>
                )}
                <div className="db-tradeoff-kpis__row">
                  <span>Stale read risk</span>
                  <strong
                    style={{
                      color: result.staleReadRisk ? "#ef4444" : "#22c55e",
                    }}
                  >
                    {result.staleReadRisk ? "Yes" : "No"}
                  </strong>
                </div>
                <div className="db-tradeoff-kpis__row">
                  <span>Complexity</span>
                  <strong>{result.complexity}/10</strong>
                </div>
              </div>
            </SideCard>

            <SideCard label="Strengths & Weaknesses" variant="info">
              <div className="db-tradeoff-traits">
                <div>
                  <strong style={{ color: "#22c55e", fontSize: 11 }}>
                    Strengths
                  </strong>
                  {profile.strengths.map((s, i) => (
                    <p key={i}>+ {s}</p>
                  ))}
                </div>
                <div>
                  <strong style={{ color: "#ef4444", fontSize: 11 }}>
                    Weaknesses
                  </strong>
                  {profile.weaknesses.map((w, i) => (
                    <p key={i}>− {w}</p>
                  ))}
                </div>
              </div>
            </SideCard>

            <SideCard label="Workload Info" variant="info">
              <p>
                <strong>{WORKLOAD_PROFILES[workload].label}</strong>
              </p>
              <p style={{ color: "#94a3b8", fontSize: 12 }}>
                {WORKLOAD_PROFILES[workload].description}
              </p>
              <ul className="db-tradeoff-needs">
                {WORKLOAD_PROFILES[workload].needs.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
      <NeedModal />
    </div>
  );
};

export default DbTradeoffVisualization;
