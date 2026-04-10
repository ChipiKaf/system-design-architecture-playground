import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "indexing-strategies"
  | "oltp"
  | "wal"
  | "btree"
  | "containment-operator"
  | "gin"
  | "gist"
  | "brin"
  | "hash"
  | "composite-indexes";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "indexing-strategies": {
    title: "Indexing Strategies",
    subtitle:
      "Choose indexes from query evidence, operator semantics, and operational cost.",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "Decision Framework",
        accent: "#60a5fa",
        content: (
          <p>
            Start with actual query patterns, not the schema. Look at the most
            frequent and most expensive queries, then inspect what shows up in
            WHERE, JOIN, ORDER BY, and GROUP BY clauses. After that, weigh
            selectivity, read versus write pressure, and whether the table is
            append-only or frequently updated.
          </p>
        ),
      },
      {
        title: "Operational Trade-offs",
        accent: "#22c55e",
        content: (
          <p>
            Every index improves some reads and makes some writes more
            expensive. More indexes mean more WAL, more vacuum work, more cache
            pressure, and more maintenance during heavy updates. The right
            answer is rarely "index everything".
          </p>
        ),
      },
    ],
  },
  oltp: {
    title: "OLTP",
    subtitle:
      "Online Transaction Processing: database systems built for many small, fast, real-time transactions.",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "What It Means",
        accent: "#14b8a6",
        content: (
          <p>
            OLTP stands for Online Transaction Processing. It describes systems
            where many users interact with the database at the same time, each
            interaction is small and fast, and every transaction needs to stay
            accurate and consistent.
          </p>
        ),
      },
      {
        title: "Why It Matters For Indexing",
        accent: "#5eead4",
        content: (
          <p>
            In OLTP workloads, indexes must help common point lookups, short
            range scans, joins, and ordering without making inserts, updates,
            and deletes too expensive. That is why B-tree is so often the
            default starting point for transactional applications.
          </p>
        ),
      },
    ],
  },
  wal: {
    title: "WAL",
    subtitle:
      "Write-Ahead Log: PostgreSQL records the change in a durable log before the actual data page is updated.",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Plain English",
        accent: "#f59e0b",
        content: (
          <p>
            WAL stands for Write-Ahead Log. Think of it like PostgreSQL writing
            down the change in a journal first, before it updates the real table
            or index page. If the database crashes halfway through, PostgreSQL
            can replay that journal and recover to a consistent state.
          </p>
        ),
      },
      {
        title: "Why Indexes Increase It",
        accent: "#fcd34d",
        content: (
          <p>
            Every extra index means more structures to update on inserts,
            deletes, and indexed-column updates. Those index changes also get
            written to WAL, so more indexes usually means more log volume, more
            disk write pressure, and more work for replication and recovery.
          </p>
        ),
      },
      {
        title: "Why It Matters In This Lab",
        accent: "#fb923c",
        content: (
          <p>
            In the B-tree write step, the amber path shows PostgreSQL finding
            the right leaf page for the new entry. The WAL note is there because
            the database is not only changing the index in memory - it is also
            logging that change so it can survive crashes and be replayed on
            replicas.
          </p>
        ),
      },
    ],
  },
  btree: {
    title: "B-tree",
    subtitle:
      "Best default for most normal app queries in transactional systems.",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "Plain English",
        accent: "#3b82f6",
        content: (
          <p>
            A B-tree is like a phone book: values stay sorted, so the database
            can jump close to the right value and then scan forward. That is why
            it is usually the default index for OLTP, meaning transactional
            systems with many small, fast queries.
          </p>
        ),
      },
      {
        title: "Use It When",
        accent: "#93c5fd",
        content: (
          <p>
            Use it for exact matches, ranges, sorting, joins, and starts-with
            text like LIKE 'Joh%'. If the hot query filters by multiple columns
            and sorts, a composite B-tree like (account_id, status, created_at
            DESC) is often better than several single-column indexes. It is less
            useful for contains matches like LIKE '%ohn' or document-style
            search.
          </p>
        ),
      },
      {
        title: "Why It Is Not Free",
        accent: "#60a5fa",
        content: (
          <p>
            Every extra B-tree has to be updated when rows are inserted,
            deleted, or when indexed values change. That means more disk writes,
            more WAL, more vacuum work, and more memory pressure. So even though
            B-tree is usually the right default, adding too many of them can
            slow down write-heavy tables.
          </p>
        ),
      },
    ],
  },
  "containment-operator": {
    title: "@> Containment",
    subtitle:
      "A structural containment operator for JSONB and arrays, not a text match.",
    accentColor: "#34d399",
    sections: [
      {
        title: "What It Really Means",
        accent: "#22c55e",
        content: (
          <div>
            <p>
              <code>@&gt;</code> is not doing a text search. It asks whether the
              left JSONB document or array structurally contains the value on
              the right.
            </p>
            <p>
              That means PostgreSQL checks keys and values inside the structure,
              not string patterns. This is a very different mental model from
              <code>LIKE</code> or plain <code>=</code> on text.
            </p>
          </div>
        ),
      },
      {
        title: "Why Formatting Does Not Matter",
        accent: "#86efac",
        content: (
          <div>
            <p>
              For JSONB, PostgreSQL stores parsed structure, not the original
              text formatting. So <code>{'\'{"channel":"mobile"}\''}</code>{" "}
              still matches even if key order or whitespace differs in the
              stored document.
            </p>
            <p>
              The important question is whether the structure contains the
              requested key-value pair, not whether the text looks identical.
            </p>
          </div>
        ),
      },
      {
        title: "Why GIN Helps",
        accent: "#bbf7d0",
        content: (
          <div>
            <p>
              Because <code>@&gt;</code> searches inside a structure, PostgreSQL
              benefits from an index that can break one row into searchable
              pieces. That is exactly what GIN does.
            </p>
            <p>
              Rule of thumb: if you are comparing one scalar value, think
              B-tree. If you need to ask whether JSONB or an array contains
              something inside it, think GIN.
            </p>
          </div>
        ),
      },
    ],
  },
  gin: {
    title: "GIN",
    subtitle: "An inverted index for JSONB, arrays, and search-like queries.",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Flip The Mental Model",
        accent: "#22c55e",
        content: (
          <div>
            <p>
              GIN feels confusing at first because it does not work like a
              B-tree. A B-tree helps PostgreSQL find where a row sits in sorted
              order. GIN flips that around and stores each value with the row
              ids that contain it.
            </p>
            <p>
              The one-line intuition is: <code>value -&gt; rows</code>. That is
              why it fits JSONB, arrays, and full-text search so well.
            </p>
          </div>
        ),
      },
      {
        title: "How A Read Works",
        accent: "#86efac",
        content: (
          <div>
            <p>
              Suppose the query needs <code>channel = 'mobile'</code> and
              <code>tag = 'priority'</code>. GIN looks up each value and fetches
              its posting list of matching row ids.
            </p>
            <p>
              That gives something like <code>mobile -&gt; [12, 18, 27]</code>{" "}
              and
              <code>priority -&gt; [7, 18]</code>. Because the query uses
              <code>AND</code>, PostgreSQL intersects those lists and keeps only
              <code>[18]</code>, then fetches row 18 from the table.
            </p>
          </div>
        ),
      },
      {
        title: "Why Writes Are Heavier",
        accent: "#bbf7d0",
        content: (
          <div>
            <p>
              One new row can contain several searchable values, so one insert
              can update several GIN entries. That is different from a simple
              one-path B-tree update.
            </p>
            <p>
              PostgreSQL may need to touch multiple posting lists, write WAL for
              those changes, and later merge or clean up pending work. That is
              why GIN is powerful for reads but noticeably heavier on writes.
            </p>
          </div>
        ),
      },
      {
        title: "Not A Tree — Posting Lists",
        accent: "#4ade80",
        content: (
          <div>
            <p>
              The diagram shows lines branching from source to terms to posting
              lists, which can look like a tree growing sideways. But those
              lines represent separate term lookups, not a branching decision
              path.
            </p>
            <p>
              In reality, GIN is a set of{" "}
              <code>value \u2192 posting lists</code>. Adding a new searchable
              value just adds another posting list. A query picks the relevant
              lists and intersects or unions them. It scales by more
              value\u2192rows mappings, not by deeper tree paths.
            </p>
          </div>
        ),
      },
      {
        title: "Composite GIN \u2260 Composite B-tree",
        accent: "#34d399",
        content: (
          <div>
            <p>
              A composite B-tree like{" "}
              <code>(account_id, status, created_at)</code> has strict
              left-to-right column ordering. A composite GIN like{" "}
              <code>GIN (tags, data)</code> does not. It indexes values from
              both columns into one inverted index — think multiple inverted
              maps merged, not a combined key.
            </p>
            <p>
              A query can use the composite GIN if it matches supported
              operators (<code>@&gt;</code>, <code>?</code>, <code>@@</code>) on
              any of those columns. There is no leftmost prefix rule — each
              column independently adds its values as posting lists.
            </p>
          </div>
        ),
      },
    ],
  },
  gist: {
    title: "GiST",
    subtitle:
      "Flexible operator support for spatial, range, and overlap queries.",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Best Fit",
        accent: "#a78bfa",
        content: (
          <p>
            Use GiST when the operators are geometric, proximity-based,
            overlap-oriented, or range-aware. That includes geospatial data,
            range types, nearest-neighbor search, and exclusion constraints.
          </p>
        ),
      },
      {
        title: "Trade-off",
        accent: "#ddd6fe",
        content: (
          <p>
            GiST is flexible, but it is usually not the first choice for normal
            business predicates. If the workload is simple equality or sorting,
            B-tree is typically a better default.
          </p>
        ),
      },
    ],
  },
  brin: {
    title: "BRIN",
    subtitle:
      "Tiny, low-maintenance indexes for physically ordered large tables.",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Best Fit",
        accent: "#f59e0b",
        content: (
          <p>
            BRIN works well on very large tables when the indexed values track
            physical row order, such as append-only event or time-series tables
            filtered by created_at or another monotonic key.
          </p>
        ),
      },
      {
        title: "Trade-off",
        accent: "#fcd34d",
        content: (
          <p>
            It is fast to maintain and tiny on disk, but it depends on strong
            locality. PostgreSQL 17 improved BRIN further with better update
            behavior and multi-column support, which makes it more practical on
            modern large tables.
          </p>
        ),
      },
    ],
  },
  hash: {
    title: "Hash",
    subtitle:
      "A niche equality-only option that is valid but rarely the best default.",
    accentColor: "#fb7185",
    sections: [
      {
        title: "Best Fit",
        accent: "#fb7185",
        content: (
          <p>
            Modern PostgreSQL hash indexes are WAL-logged and safe, so they are
            no longer experimental. They only support equality lookups, so the
            use case is narrow by design.
          </p>
        ),
      },
      {
        title: "Trade-off",
        accent: "#fecdd3",
        content: (
          <p>
            B-tree usually wins anyway because it handles equality well enough
            while also supporting ranges and ordering. Hash is the exception,
            not the starting point.
          </p>
        ),
      },
    ],
  },
  "composite-indexes": {
    title: "Composite Indexes",
    subtitle: "Multi-column indexes that match how a query filters and sorts.",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "What It Is",
        accent: "#38bdf8",
        content: (
          <div>
            <p>
              A composite index is just an index on more than one column. For
              example, <code>(account_id, status, created_at DESC)</code> is a
              composite B-tree because it stores three columns together, in that
              order.
            </p>
            <p>
              That matters because many real queries do not filter on just one
              field. They filter on a few columns together and then sort the
              result.
            </p>
          </div>
        ),
      },
      {
        title: "Why This Order",
        accent: "#7dd3fc",
        content: (
          <div>
            <p>
              Think of the index as sorted like{" "}
              <code>account_id -&gt; status -&gt; created_at DESC</code>. First
              rows are grouped by
              <code>account_id</code>, then by <code>status</code>, then within
              that group the newest <code>created_at</code> values come first.
            </p>
            <p>
              It is used like that because the query often says: find invoices
              for this account, narrow to this status, then show the latest ones
              first. Matching that order lets PostgreSQL filter and sort in one
              pass.
            </p>
          </div>
        ),
      },
      {
        title: "Leftmost Prefix Rule",
        accent: "#0ea5e9",
        content: (
          <div>
            <p>
              PostgreSQL can use a composite index from left to right, but it
              cannot efficiently skip the first column. So this index is great
              for <code>account_id</code>, for <code>account_id + status</code>,
              and for <code>account_id + status + created_at</code>.
            </p>
            <p>
              It is not a good fit for <code>WHERE status = 'paid'</code> by
              itself, because that skips <code>account_id</code>. That is the
              key rule behind column order in composite indexes.
            </p>
          </div>
        ),
      },
      {
        title: "GIN Composites Are Different",
        accent: "#22c55e",
        content: (
          <div>
            <p>
              Everything above applies to B-tree composites. GIN composites work
              differently: <code>GIN (tags, data)</code> does not have a
              left-to-right column rule. It indexes values from both columns
              into one set of posting lists.
            </p>
            <p>
              Think of it as merging multiple inverted maps into one index
              rather than laying columns side by side. A query can use it if it
              matches supported operators (<code>@&gt;</code>, <code>?</code>)
              on any of the indexed columns — no prefix needed.
            </p>
          </div>
        ),
      },
    ],
  },
};
