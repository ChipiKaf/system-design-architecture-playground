import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "btree-overview"
  | "pages"
  | "tids"
  | "page-splits"
  | "internal-nodes"
  | "fill-factor"
  | "balance"
  | "gin-overview"
  | "posting-lists"
  | "fastupdate"
  | "containment-op"
  | "gin-vs-btree"
  | "gist-overview"
  | "mbr"
  | "penalty-fn"
  | "knn"
  | "gist-vs-btree-gin";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "btree-overview": {
    title: "B-tree Structure",
    subtitle:
      "A self-balancing tree whose nodes are disk pages, keeping every leaf at the same depth.",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "Why It Exists",
        accent: "#3b82f6",
        content: (
          <p>
            A B-tree organises indexed values so that PostgreSQL can find any
            row in O(log n) page reads. Unlike a binary tree, each node holds
            many keys — one per ~1 kB entry in an 8 kB page — which keeps the
            tree shallow even for millions of rows.
          </p>
        ),
      },
      {
        title: "How It Grows",
        accent: "#93c5fd",
        content: (
          <p>
            The tree starts as a single root page. As rows are inserted, entries
            fill the page. When a page is full, it splits: half the entries stay
            in the original page, half move to a new sibling, and a boundary key
            is promoted to the parent. The tree only deepens when the root
            itself must split.
          </p>
        ),
      },
    ],
  },
  pages: {
    title: "Pages (8 kB)",
    subtitle:
      "The fundamental I/O unit in PostgreSQL — every read or write touches a full 8 kB page.",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "What It Is",
        accent: "#14b8a6",
        content: (
          <p>
            A page (or block) is 8 kB of storage. PostgreSQL never reads or
            writes anything smaller than one page. Every B-tree node — whether
            root, internal, or leaf — occupies exactly one page on disk.
          </p>
        ),
      },
      {
        title: "Why Size Matters",
        accent: "#5eead4",
        content: (
          <p>
            With ~1 kB index entries, each page holds roughly 8 entries (or 8
            child pointers for internal pages). Real production indexes have
            smaller entries, so a page can hold hundreds of keys, making the
            tree very shallow.
          </p>
        ),
      },
    ],
  },
  tids: {
    title: "TIDs",
    subtitle: "Tuple Identifiers: the physical address of a row in the heap.",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What A TID Is",
        accent: "#f59e0b",
        content: (
          <div>
            <p>
              A TID (Tuple Identifier) is a pair (page number, offset) that
              tells PostgreSQL exactly where a row lives in the heap table. Leaf
              entries in a B-tree store the indexed key plus the TID.
            </p>
            <p>
              So <code>18 → (105, 3)</code> means: "the row with key 18 is on
              heap page 105, at position 3." This is how PostgreSQL jumps
              straight from the index to the actual data.
            </p>
          </div>
        ),
      },
      {
        title: "Key Difference",
        accent: "#fcd34d",
        content: (
          <div>
            <p>
              Leaf entries: <code>key → (heap page, row)</code> — points to
              actual table data. Internal entries:{" "}
              <code>key → child page pointer</code> — points to other index
              pages. One sentence: internal pages point to more index pages,
              leaf pages point to actual data rows.
            </p>
          </div>
        ),
      },
      {
        title: "Index-Only Scans",
        accent: "#fbbf24",
        content: (
          <p>
            If all the columns the query needs are in the index, PostgreSQL can
            answer from the B-tree alone without following the TID to the heap.
            This is called an index-only scan and avoids a random I/O per row.
          </p>
        ),
      },
    ],
  },
  "page-splits": {
    title: "Page Splits",
    subtitle:
      "When a page is full, PostgreSQL splits it into two and promotes a boundary key.",
    accentColor: "#ef4444",
    sections: [
      {
        title: "How It Works",
        accent: "#ef4444",
        content: (
          <p>
            When an insert would overflow a page, PostgreSQL allocates a new
            page, moves roughly half the entries to it, and inserts a boundary
            key into the parent node. The boundary key tells future queries
            which child to follow. If the parent is also full, it splits too,
            propagating upward.
          </p>
        ),
      },
      {
        title: "Root Splits",
        accent: "#fca5a5",
        content: (
          <p>
            When the root page splits, PostgreSQL creates a brand-new root with
            a single boundary key and two children. This is the only way the
            tree grows deeper. Because it always happens at the root, every leaf
            stays at the same depth — that is why the tree is balanced.
          </p>
        ),
      },
    ],
  },
  "internal-nodes": {
    title: "Internal Nodes",
    subtitle:
      "Routing pages that contain boundary keys and child pointers — no TIDs.",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What They Store",
        accent: "#a78bfa",
        content: (
          <div>
            <p>
              Internal nodes hold boundary keys and child-page pointers. They do
              not store TIDs because they are not leaf entries — their job is
              purely to route queries to the right child page.
            </p>
            <p>
              The real structure of an internal page is{" "}
              <code>[P₀ | key | P₁ | key | P₂ | …]</code>. Each P is a pointer
              to a child page. The shorthand <code>[9 | 17 | 25]</code> hides
              the first pointer P₀ — but it is always there. Rule: N boundary
              keys → N + 1 child pointers.
            </p>
          </div>
        ),
      },
      {
        title: "Routing Table",
        accent: "#c4b5fd",
        content: (
          <div>
            <p>
              An internal page with keys <code>[9 | 17 | 25]</code> creates
              these routing rules: values {"<"} 9 → child A, 9–16 → child B,
              17–24 → child C, ≥ 25 → child D. It tells PostgreSQL exactly which
              child page to go to next — it never stores actual row locations.
            </p>
            <p>
              Think of internal pages like directory signs in a library:
              "Science → Floor 2", "History → Floor 3". They tell you where to
              go, not where the book actually sits on the shelf.
            </p>
          </div>
        ),
      },
      {
        title: "Fan-Out",
        accent: "#ddd6fe",
        content: (
          <p>
            Because internal entries (key + pointer) are smaller than leaf
            entries (key + TID + overhead), internal pages can hold more
            children. High fan-out keeps the tree shallow — a depth-3 B-tree
            with 500-way branching can index over 100 million rows.
          </p>
        ),
      },
    ],
  },
  "fill-factor": {
    title: "Fill Factor",
    subtitle:
      "How full a leaf page should be before PostgreSQL considers it full.",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Default For B-tree",
        accent: "#22c55e",
        content: (
          <p>
            PostgreSQL's default fill factor for B-tree indexes is 90%. That
            means it leaves 10% free space in each leaf page during initial
            build or after a split, which allows some future inserts to land
            without triggering another split.
          </p>
        ),
      },
      {
        title: "Tuning It",
        accent: "#86efac",
        content: (
          <p>
            For append-only tables (e.g., event logs with a monotonic key), 100%
            fill factor is fine because new entries always go to the rightmost
            leaf. For tables with random inserts, a lower fill factor can reduce
            split frequency at the cost of a slightly larger index.
          </p>
        ),
      },
    ],
  },
  balance: {
    title: "Balance Property",
    subtitle:
      "Every leaf page is at the same depth — guaranteed by bottom-up splitting.",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "Why It Matters",
        accent: "#38bdf8",
        content: (
          <p>
            Because the tree only deepens when the root splits, every leaf is
            always at the same depth. That means worst-case lookup cost is
            exactly the tree depth — there is no scenario where one key takes
            more page reads than another. This is the core guarantee of the
            B-tree.
          </p>
        ),
      },
      {
        title: "Contrast With BST",
        accent: "#7dd3fc",
        content: (
          <p>
            A plain binary search tree can become skewed if keys arrive in
            sorted order, degrading to O(n). B-trees avoid this because splits
            always produce balanced siblings and depth only increases
            symmetrically at the root.
          </p>
        ),
      },
    ],
  },

  /* ── GIN Concepts ─────────────────────────────────────── */

  "gin-overview": {
    title: "GIN — Generalized Inverted Index",
    subtitle:
      "An inverted index that maps each distinct value to a posting list of row IDs containing it.",
    accentColor: "#22c55e",
    sections: [
      {
        title: "What It Is",
        accent: "#22c55e",
        content: (
          <p>
            A GIN index flips the B-tree model. Instead of mapping each row to
            its key position, GIN maps each distinct <em>value</em> to a list of
            every row that contains it. This is ideal for multi-valued columns
            like arrays, JSONB, and full-text search vectors.
          </p>
        ),
      },
      {
        title: "When To Use It",
        accent: "#86efac",
        content: (
          <p>
            Use GIN when you need to ask "which rows contain value X?" — queries
            with <code>@&gt;</code>, <code>?</code>, <code>@@</code>, or array
            containment operators. GIN excels at reads but pays a heavier cost
            on writes because one row insert can touch many posting lists.
          </p>
        ),
      },
    ],
  },
  "posting-lists": {
    title: "Posting Lists",
    subtitle:
      "Sorted arrays of row IDs (TIDs) attached to each distinct value in the GIN index.",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "What They Are",
        accent: "#14b8a6",
        content: (
          <p>
            Every distinct value in the GIN index has a posting list — a sorted
            array of TIDs (row locations) for every row that contains that
            value. For example, <code>'mobile' → [1, 2, 3, 5, 7]</code> means
            rows 1, 2, 3, 5, and 7 all have 'mobile' in their indexed column.
          </p>
        ),
      },
      {
        title: "AND = Intersect",
        accent: "#5eead4",
        content: (
          <p>
            Multi-condition queries become set operations on posting lists.{" "}
            <code>
              WHERE tags @&gt; '{"{"}mobile{"}"}' AND tags @&gt; '{"{"}priority
              {"}"}'
            </code>{" "}
            fetches both posting lists and intersects them. Only rows appearing
            in <em>both</em> lists match. This is fast because the lists are
            already sorted.
          </p>
        ),
      },
    ],
  },
  fastupdate: {
    title: "Fastupdate & Pending List",
    subtitle:
      "A write-optimization that batches new entries before merging them into the main index.",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "The Problem",
        accent: "#f59e0b",
        content: (
          <p>
            Inserting one row into a GIN index can mean updating N posting lists
            (one per extracted value). For high-write workloads, this is
            expensive. Fastupdate buffers new entries into an unsorted "pending
            list" — a simple append-only structure.
          </p>
        ),
      },
      {
        title: "The Trade-Off",
        accent: "#fcd34d",
        content: (
          <p>
            Pending entries are cheap to write but must be scanned during
            queries (since they're unsorted). VACUUM or{" "}
            <code>gin_pending_list_limit</code> triggers a batch merge,
            incorporating them into the main sorted index. Larger pending lists
            = faster writes but slower reads until merge.
          </p>
        ),
      },
    ],
  },
  "containment-op": {
    title: "Containment Operators",
    subtitle: "The @>, ?, and @@ operators that GIN indexes accelerate.",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Array Containment",
        accent: "#a78bfa",
        content: (
          <p>
            <code>@&gt;</code> checks if the left array contains all elements of
            the right array.{" "}
            <code>
              tags @&gt; '{"{"}mobile, urgent{"}"}'
            </code>{" "}
            returns rows whose <code>tags</code> column contains both 'mobile'
            AND 'urgent'. GIN handles this by intersecting the posting lists for
            each value on the right side.
          </p>
        ),
      },
      {
        title: "JSONB & Full-Text",
        accent: "#c4b5fd",
        content: (
          <p>
            For JSONB, <code>?</code> checks key existence and{" "}
            <code>@&gt;</code> checks containment. For full-text,{" "}
            <code>@@</code> matches a <code>tsvector</code> against a{" "}
            <code>tsquery</code>. All are powered by the same GIN posting-list
            mechanism — different operator classes, same inverted-index engine.
          </p>
        ),
      },
    ],
  },
  "gin-vs-btree": {
    title: "GIN vs B-tree",
    subtitle:
      "When to choose each index type — it comes down to the query pattern.",
    accentColor: "#ef4444",
    sections: [
      {
        title: "Use B-tree When",
        accent: "#3b82f6",
        content: (
          <p>
            Your queries use <code>=</code>, <code>&lt;</code>,{" "}
            <code>&gt;</code>, <code>BETWEEN</code>, or <code>ORDER BY</code>.
            B-tree supports range scans and sorted output natively. Writes are
            cheaper (one entry per row), and the index stays compact.
          </p>
        ),
      },
      {
        title: "Use GIN When",
        accent: "#22c55e",
        content: (
          <p>
            Your queries use <code>@&gt;</code>, <code>?</code>, <code>@@</code>
            , or containment operators on multi-valued columns (arrays, JSONB,
            tsvector). GIN can answer "which rows contain value X?" in a single
            posting-list lookup. The trade-off is heavier writes and larger
            index size.
          </p>
        ),
      },
    ],
  },

  /* ── GiST Concepts ───────────────────────────────────── */

  "gist-overview": {
    title: "GiST — Generalized Search Tree",
    subtitle:
      "A balanced tree that organises data by nesting bounding boxes, enabling spatial and range queries.",
    accentColor: "#e879f9",
    sections: [
      {
        title: "What It Is",
        accent: "#e879f9",
        content: (
          <p>
            GiST is PostgreSQL's framework for building custom balanced-tree
            indexes. The most common implementation is the R-tree (used by
            PostGIS for spatial data). Each internal entry stores a Minimum
            Bounding Rectangle (MBR) that covers all entries in its subtree.
          </p>
        ),
      },
      {
        title: "Key Difference",
        accent: "#f0abfc",
        content: (
          <p>
            Unlike B-tree where ranges don't overlap (keys are sorted), GiST
            bounding boxes CAN overlap. This means a query window may intersect
            multiple MBRs, forcing PostgreSQL to check multiple subtrees. The
            trade-off is flexibility: GiST can index any data type that defines
            a "contains" relationship.
          </p>
        ),
      },
    ],
  },
  mbr: {
    title: "Minimum Bounding Rectangle",
    subtitle:
      "The smallest axis-aligned rectangle that encloses all entries in a GiST subtree.",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "How MBRs Work",
        accent: "#a78bfa",
        content: (
          <p>
            Every internal GiST entry stores an MBR — a rectangle defined by
            its lower-left and upper-right corners. When a new point is
            inserted, the MBR of the target subtree may need to enlarge to
            contain it. The "penalty" function measures this enlargement, and
            GiST picks the subtree with the least enlargement.
          </p>
        ),
      },
      {
        title: "Dead Space",
        accent: "#c4b5fd",
        content: (
          <p>
            Area inside an MBR that contains no actual data points is called
            dead space. More dead space means more false-positive subtree visits
            during queries. Good split strategies minimise total dead space
            across sibling MBRs.
          </p>
        ),
      },
    ],
  },
  "penalty-fn": {
    title: "Penalty & Picksplit",
    subtitle:
      "The two functions that control where inserts land and how full pages are divided.",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Penalty",
        accent: "#f59e0b",
        content: (
          <p>
            When inserting, GiST evaluates the penalty for each possible
            subtree. For spatial data, penalty = area increase of the MBR if the
            new entry is added. GiST picks the subtree with the lowest penalty.
            If the entry is already inside the MBR, penalty is zero.
          </p>
        ),
      },
      {
        title: "Picksplit",
        accent: "#fcd34d",
        content: (
          <p>
            When a page is full, picksplit divides entries into two groups that
            minimise the total MBR area of the resulting pages. Unlike B-tree
            (split at median key), GiST splits by spatial proximity — keeping
            nearby entries together for better query performance.
          </p>
        ),
      },
    ],
  },
  knn: {
    title: "K-Nearest Neighbour (KNN)",
    subtitle:
      "GiST's unique ability to answer ORDER BY <-> distance queries efficiently.",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "How It Works",
        accent: "#14b8a6",
        content: (
          <p>
            The <code>&lt;-&gt;</code> operator computes distance between
            geometries. GiST walks the tree using a priority queue ordered by
            distance from the query point to each MBR. Closer MBRs are visited
            first. Subtrees whose MBR distance exceeds the current k-th best
            are pruned entirely.
          </p>
        ),
      },
      {
        title: "Why Only GiST?",
        accent: "#5eead4",
        content: (
          <p>
            B-tree indexes sorted scalar keys — there's no concept of
            "distance" in a sorted list. GIN indexes inverted posting lists —
            distance doesn't apply. Only GiST's bounding-box model provides the
            geometry needed to compute and compare distances during tree
            traversal.
          </p>
        ),
      },
    ],
  },
  "gist-vs-btree-gin": {
    title: "GiST vs B-tree vs GIN",
    subtitle:
      "Three index models for three different query patterns.",
    accentColor: "#ef4444",
    sections: [
      {
        title: "Choose By Query",
        accent: "#ef4444",
        content: (
          <div>
            <p>
              <strong>B-tree</strong>: <code>=</code>, <code>&lt;</code>,{" "}
              <code>&gt;</code>, <code>BETWEEN</code>, <code>ORDER BY</code> on
              scalar columns. One path, no overlap.
            </p>
            <p>
              <strong>GIN</strong>: <code>@&gt;</code>, <code>?</code>,{" "}
              <code>@@</code> on multi-valued columns (arrays, JSONB, tsvector).
              Inverted posting lists.
            </p>
            <p>
              <strong>GiST</strong>: <code>&&</code>, <code>&lt;-&gt;</code>,{" "}
              <code>@&gt;</code> on spatial/range data. Bounding boxes, overlap
              queries, KNN.
            </p>
          </div>
        ),
      },
      {
        title: "Overlap Cost",
        accent: "#fca5a5",
        content: (
          <p>
            GiST's main trade-off: because bounding boxes can overlap, queries
            may need to visit multiple subtrees. B-tree never has this problem
            (sorted keys create non-overlapping ranges). GIN avoids it too
            (flat posting lists). For spatial data, this cost is acceptable
            because the alternative is a full table scan.
          </p>
        ),
      },
    ],
  },
};
