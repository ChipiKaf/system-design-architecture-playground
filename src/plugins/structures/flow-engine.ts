import type { StructuresState } from "./structuresSlice";
import { getAdapter } from "./structures-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   Structures Lab — Declarative Flow Engine

   Uses the shared lab-engine for build/execute logic.
   Token expansion and flow beats delegate to adapters.
   Steps use `when` guards to show only for the active topic.
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<StructuresState>;
export type StepDef = GenericStepDef<StructuresState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<StructuresState>;

/* ── Token expansion (delegates to adapter) ──────────── */

export function expandToken(token: string, state: StructuresState): string[] {
  const adapter = getAdapter(state.variant);
  const expanded = adapter.expandToken(token, state);
  return expanded ?? [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  | "struct-overview"
  | "struct-empty-root"
  | "struct-first-rows"
  | "struct-page-fills"
  | "struct-page-full"
  | "struct-split"
  | "struct-internal"
  | "struct-more-inserts"
  | "struct-deepen"
  | "struct-summary"
  /* GIN steps */
  | "gin-overview"
  | "gin-empty"
  | "gin-first-row"
  | "gin-second-row"
  | "gin-third-row"
  | "gin-many-rows"
  | "gin-lookup-single"
  | "gin-lookup-and"
  | "gin-pending"
  | "gin-summary"
  /* GiST steps */
  | "gist-overview"
  | "gist-empty"
  | "gist-first-row"
  | "gist-second-row"
  | "gist-third-row"
  | "gist-many-rows"
  | "gist-overlap-query"
  | "gist-knn"
  | "gist-penalty-split"
  | "gist-summary";

const isIndexStructures = (s: StructuresState) =>
  s.topic === "index-structures";

const isBtree = (s: StructuresState) =>
  isIndexStructures(s) && s.variant === "btree-struct";

const isGin = (s: StructuresState) =>
  isIndexStructures(s) && s.variant === "gin-struct";

const isGist = (s: StructuresState) =>
  isIndexStructures(s) && s.variant === "gist-struct";

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  {
    key: "struct-overview",
    label: "Overview",
    when: isBtree,
    nextButton: "Start Building →",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label}: we'll build the index structure from scratch. Each step inserts rows and shows how the tree evolves — page fills, splits, new internal nodes, and depth increases.`;
    },
  },
  {
    key: "struct-empty-root",
    label: "Empty Root",
    when: isBtree,
    phase: "processing",
    processingText: "Creating empty B-tree…",
    nextButtonColor: "#3b82f6",
    finalHotZones: ["step-empty-root"],
    recalcMetrics: true,
    explain: () =>
      `CREATE INDEX starts with a single empty root page. In PostgreSQL, this page is 8 kB on disk. It's both the root and the only leaf — there are no other pages yet. The tree has depth 1.`,
  },
  {
    key: "struct-first-rows",
    label: "Insert Rows 1–3",
    when: isBtree,
    phase: "processing",
    processingText: "Inserting first rows…",
    nextButtonColor: "#3b82f6",
    finalHotZones: ["step-first-rows"],
    recalcMetrics: true,
    explain: () =>
      `Three rows inserted. Each leaf entry is key → (heap page, row), roughly 1 kB. For example, 1 → (100,1) means "row with key 1 is on heap page 100, position 1." The entries are kept sorted so binary search works. Right now the root is the only page — it’s both root and leaf.`,
  },
  {
    key: "struct-page-fills",
    label: "Insert Rows 4–6",
    when: isBtree,
    phase: "processing",
    processingText: "Page filling up…",
    nextButtonColor: "#3b82f6",
    finalHotZones: ["step-page-fills"],
    recalcMetrics: true,
    explain: () =>
      `Six entries now: 1→(100,1) through 6→(101,2). Each entry is key + TID pointing to an actual heap row. With ~1 kB per entry and 8 kB pages, we can fit about 8. The page is 75% full. PostgreSQL’s default fill factor (90%) leaves room for future inserts without immediate splits.`,
  },
  {
    key: "struct-page-full",
    label: "Insert Rows 7–8",
    when: isBtree,
    phase: "comparison",
    processingText: "Page is now full…",
    nextButtonColor: "#f59e0b",
    finalHotZones: ["step-page-full"],
    recalcMetrics: true,
    explain: () =>
      `Eight entries fill the page. The next insert won't fit — it will trigger a page split. This is the critical moment in B-tree growth. PostgreSQL must allocate a new page, move half the entries there, and create an internal node to route between the two leaves.`,
  },
  {
    key: "struct-split",
    label: "Insert Row 9 → Split!",
    when: isBtree,
    phase: "comparison",
    processingText: "Splitting page…",
    nextButtonColor: "#f59e0b",
    finalHotZones: ["step-split"],
    recalcMetrics: true,
    explain: () =>
      `Row 9 triggers a page split — and creates the first INTERNAL page. The internal page stores [P₀ | 5 | P₁]: boundary key 5 + two child pointers. It holds NO TIDs — it’s a routing table: "keys < 5 → Leaf 1, keys ≥ 5 → Leaf 2." The leaf pages still store key → (heap page, row). Key difference: internal pages point to other index pages, leaf pages point to actual data rows.`,
  },
  {
    key: "struct-internal",
    label: "Grow to 16 Rows",
    when: isBtree,
    phase: "comparison",
    processingText: "Inserting more rows…",
    nextButtonColor: "#3b82f6",
    finalHotZones: ["step-internal"],
    recalcMetrics: true,
    explain: () =>
      `16 rows across 2 leaf pages. The root is an internal page with structure [P₀ | 9 | P₁]: 1 boundary key, 2 child pointers. Rule: #children = #keys + 1. To find key 12: root says 12 ≥ 9 → go to Leaf 2. Leaf 2 says 12 → (102,4) → heap page 102, row 4. Internal pages point to index pages. Leaf pages point to heap rows. Two page reads total.`,
  },
  {
    key: "struct-more-inserts",
    label: "Grow to 36 Rows",
    when: isBtree,
    phase: "comparison",
    processingText: "Filling more leaf pages…",
    nextButtonColor: "#3b82f6",
    finalHotZones: ["step-more-inserts"],
    recalcMetrics: true,
    explain: () =>
      `36 rows, 5 leaf pages. The root internal page is a routing table: [P₀ | 9 | P₁ | 17 | P₂ | 25 | P₃ | 33 | P₄]. That means: <9→L1, 9–16→L2, 17–24→L3, 25–32→L4, ≥33→L5. To find key 18: root says 18≥17 and <25 → follow P₂ to Leaf 3 → 18→(105,3) → heap page 105, row 3. Leaf pages link sideways for range scans. Internal = routing, Leaf = data.`,
  },
  {
    key: "struct-deepen",
    label: "Root Splits → Depth 3",
    when: isBtree,
    phase: "comparison",
    processingText: "Root page splitting…",
    nextButtonColor: "#f59e0b",
    finalHotZones: ["step-deepen"],
    recalcMetrics: true,
    explain: () =>
      `The root internal page filled up. Same split logic: PostgreSQL creates a new root [P₀ | 33 | P₁] with two internal children. The tree is now depth 3: root (internal) → internal → leaf. All three levels use the same idea: internal pages hold [P₀ | key | P₁ | …] for routing, leaf pages hold key → (heap page, row) for data. Any row is reachable in 2 page reads. With real pages holding hundreds of keys, depth 3 indexes millions of rows.`,
  },
  {
    key: "struct-summary",
    label: "Summary",
    when: isBtree,
    phase: "summary",
    finalHotZones: ["step-summary"],
    explain: () =>
      `Key takeaways: (1) Internal pages = routing tables — they store key + child page pointer and tell you which index page to visit next. (2) Leaf pages = data access — they store key + TID (heap page, row) and point to actual table rows. (3) Internal pages are like library directory signs; leaf pages are the actual shelves. (4) Pages split when full, promoting a boundary key. (5) The tree only deepens when the root splits — that’s why every leaf is at the same depth and lookup is O(log n).`,
  },
  /* ══════════════════════════════════════════════════════
     GIN STEPS — Inverted Index Structure Evolution
     ══════════════════════════════════════════════════════ */

  {
    key: "gin-overview",
    label: "Overview",
    when: isGin,
    nextButton: "Start Building →",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label}: we'll build a GIN inverted index from scratch. The key insight: B-tree maps row → sorted key position. GIN flips it — each distinct value maps to a posting list of row IDs that contain it. One row insert can create MULTIPLE index entries.`;
    },
  },
  {
    key: "gin-empty",
    label: "Empty GIN",
    when: isGin,
    phase: "processing",
    processingText: "Creating empty GIN index…",
    nextButtonColor: "#22c55e",
    finalHotZones: ["gin-empty"],
    recalcMetrics: true,
    explain: () =>
      `CREATE INDEX … USING GIN creates an empty inverted index. Unlike a B-tree that starts with an empty root page for sorted keys, a GIN index starts with no entries and no posting lists. It's waiting for data — specifically, for values it can extract from each row and build posting lists around.`,
  },
  {
    key: "gin-first-row",
    label: "Insert Row 1",
    when: isGin,
    phase: "processing",
    processingText: "Extracting values from row 1…",
    nextButtonColor: "#22c55e",
    finalHotZones: ["gin-first-row"],
    recalcMetrics: true,
    explain: () =>
      `Row 1 has tags = ['mobile', 'urgent']. PostgreSQL extracts EACH value and creates a separate GIN entry with its own posting list. 'mobile' → [row 1] and 'urgent' → [row 1]. This is the fundamental difference: a B-tree creates ONE entry per row (key → TID). GIN creates N entries per row — one per searchable value. The posting list is the "inverted" part: it maps value → rows, not row → value.`,
  },
  {
    key: "gin-second-row",
    label: "Insert Row 2",
    when: isGin,
    phase: "processing",
    processingText: "Appending to posting lists…",
    nextButtonColor: "#22c55e",
    finalHotZones: ["gin-second-row"],
    recalcMetrics: true,
    explain: () =>
      `Row 2 has tags = ['mobile', 'email']. 'mobile' already has a GIN entry — so PostgreSQL APPENDS row 2's TID to the existing posting list: 'mobile' → [row 1, row 2]. 'email' is a brand new value — PostgreSQL creates a new entry: 'email' → [row 2]. This is how posting lists grow: shared values mean longer lists, new values mean new entries.`,
  },
  {
    key: "gin-third-row",
    label: "Insert Row 3",
    when: isGin,
    phase: "processing",
    processingText: "Growing posting lists…",
    nextButtonColor: "#22c55e",
    finalHotZones: ["gin-third-row"],
    recalcMetrics: true,
    explain: () =>
      `Row 3 has tags = ['mobile', 'priority']. 'mobile' → [row 1, row 2, row 3] — the posting list keeps growing because many rows share this value. 'priority' is new → [row 3]. We now have 4 distinct values, each with its own posting list. Notice: 3 rows inserted but the GIN index has been updated 6 times (2 values × 3 rows). That's why GIN writes are heavier than B-tree.`,
  },
  {
    key: "gin-many-rows",
    label: "Grow to 8 Rows",
    when: isGin,
    phase: "comparison",
    processingText: "Building full inverted index…",
    nextButtonColor: "#22c55e",
    finalHotZones: ["gin-many-rows"],
    recalcMetrics: true,
    explain: () =>
      `8 rows, 6 distinct values, each with its own posting list. 'mobile' → [1,2,3,4,5,7,8] (7 rows share it), 'urgent' → [1,4,6] (3 rows), etc. The GIN index is a complete value → rows map. Key mental model: think of it like a book's back-of-the-book index — "mobile: see pages 1,2,3,4,5,7,8". One insert can touch MULTIPLE posting lists because one row can contain multiple searchable values.`,
  },
  {
    key: "gin-lookup-single",
    label: "Single Value Lookup",
    when: isGin,
    phase: "comparison",
    processingText: "Looking up value…",
    nextButtonColor: "#f59e0b",
    finalHotZones: ["gin-lookup-single"],
    recalcMetrics: true,
    explain: () =>
      `Query: WHERE tags @> '{mobile}'. PostgreSQL: (1) find 'mobile' entry in the GIN index, (2) read its posting list → [1,2,3,4,5,7,8], (3) fetch those 7 heap rows. That's it — one lookup gets all matching rows. Compare with B-tree: B-tree finds ONE row at a time by navigating the tree. GIN finds ALL rows for a value at once, because the posting list already has them collected.`,
  },
  {
    key: "gin-lookup-and",
    label: "AND → Intersect Lists",
    when: isGin,
    phase: "comparison",
    processingText: "Intersecting posting lists…",
    nextButtonColor: "#f59e0b",
    finalHotZones: ["gin-lookup-and"],
    recalcMetrics: true,
    explain: () =>
      `Query: WHERE tags @> '{mobile}' AND tags @> '{priority}'. PostgreSQL: (1) fetch 'mobile' posting list → [1,2,3,4,5,7,8], (2) fetch 'priority' posting list → [3,6,7], (3) INTERSECT both lists → [3, 7] — only rows that appear in BOTH. Then fetch just those 2 heap rows. This is the power of GIN: multi-value AND queries become set intersections on pre-built posting lists.`,
  },
  {
    key: "gin-pending",
    label: "Pending List (Fastupdate)",
    when: isGin,
    phase: "comparison",
    processingText: "Showing fastupdate…",
    nextButtonColor: "#f59e0b",
    finalHotZones: ["gin-pending"],
    recalcMetrics: true,
    explain: () =>
      `GIN writes are expensive (one insert → N posting list updates). PostgreSQL's solution: fastupdate. New entries go to an unsorted "pending list" first — much cheaper than updating each posting list immediately. When the pending list gets big enough (or on VACUUM), PostgreSQL batch-merges it into the main index. Trade-off: reads may need to scan the pending list too until merge completes.`,
  },
  {
    key: "gin-summary",
    label: "Summary",
    when: isGin,
    phase: "summary",
    finalHotZones: ["gin-summary"],
    explain: () =>
      `Key takeaways: (1) GIN = inverted index: value → [rows containing it]. B-tree = sorted index: row → key position. (2) One row with N searchable values creates N GIN entries — writes are heavier. (3) Reads are powerful: find value entry → posting list → heap rows. AND = intersect lists. (4) Fastupdate batches writes into a pending list for cheaper inserts. (5) Use GIN for @>, ?, @@, array contains — use B-tree for =, <, >, range, ORDER BY.`,
  },
  /* ══════════════════════════════════════════════════════
     GiST STEPS — Bounding-Box Tree Evolution
     ══════════════════════════════════════════════════════ */

  {
    key: "gist-overview",
    label: "Overview",
    when: isGist,
    nextButton: "Start Building →",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.profile.label}: we'll build a GiST index from scratch. The key insight: B-tree maps key → sorted position. GIN maps value → posting list. GiST maps bounding box → subtree of geometries that fit inside. Boxes CAN overlap, so queries may descend multiple subtrees.`;
    },
  },
  {
    key: "gist-empty",
    label: "Empty GiST",
    when: isGist,
    phase: "processing",
    processingText: "Creating empty GiST index…",
    nextButtonColor: "#e879f9",
    finalHotZones: ["gist-empty"],
    recalcMetrics: true,
    explain: () =>
      `CREATE INDEX … USING GiST creates an empty bounding-box tree. Unlike a B-tree that stores sorted scalar keys, or a GIN that stores inverted posting lists, GiST stores geometric keys (points, boxes, ranges) and organises them by nesting bounding boxes — Minimum Bounding Rectangles (MBRs).`,
  },
  {
    key: "gist-first-row",
    label: "Insert Row 1",
    when: isGist,
    phase: "processing",
    processingText: "Inserting first point…",
    nextButtonColor: "#e879f9",
    finalHotZones: ["gist-first-row"],
    recalcMetrics: true,
    explain: () =>
      `Row 1: location = POINT(1,5). The leaf entry stores the geometry + TID, just like a B-tree leaf stores key + TID. The root's MBR is the point itself — BOX((1,5),(1,5)). With only one entry, there's nothing to bound yet.`,
  },
  {
    key: "gist-second-row",
    label: "Insert Row 2",
    when: isGist,
    phase: "processing",
    processingText: "Growing bounding box…",
    nextButtonColor: "#e879f9",
    finalHotZones: ["gist-second-row"],
    recalcMetrics: true,
    explain: () =>
      `Row 2: POINT(4,3). The root's MBR enlarges to BOX((1,3),(4,5)) — the smallest rectangle that covers BOTH points. This is the core GiST mechanism: every internal entry's MBR must cover all entries in its subtree. Each insert may enlarge the MBR. This never happens in a B-tree — sorted keys don't need bounding boxes.`,
  },
  {
    key: "gist-third-row",
    label: "Insert Row 3",
    when: isGist,
    phase: "processing",
    processingText: "MBR enlarging…",
    nextButtonColor: "#e879f9",
    finalHotZones: ["gist-third-row"],
    recalcMetrics: true,
    explain: () =>
      `Row 3: POINT(7,2). The MBR grows from (1,3)–(4,5) = 6 sq to (1,2)–(7,5) = 18 sq — 3× the area. This "dead space" (area inside the MBR but containing no points) is what GiST tries to minimise. The penalty function measures how much a subtree's MBR would grow to accommodate a new entry — lower penalty = better fit.`,
  },
  {
    key: "gist-many-rows",
    label: "Grow to 10 Rows",
    when: isGist,
    phase: "comparison",
    processingText: "Building spatial tree…",
    nextButtonColor: "#e879f9",
    finalHotZones: ["gist-many-rows"],
    recalcMetrics: true,
    explain: () =>
      `10 points, split into 2 leaf pages by spatial clustering. The root internal page holds 2 MBR entries: MBR-A covers the left cluster (0,3)–(4,9) → Leaf 1, MBR-B covers the right cluster (5,0)–(9,6) → Leaf 2. Key difference from B-tree: the MBRs CAN overlap. If a query window intersects both MBRs, PostgreSQL must check both subtrees. B-tree always follows exactly one path.`,
  },
  {
    key: "gist-overlap-query",
    label: "Overlap Query (&&)",
    when: isGist,
    phase: "comparison",
    processingText: "Running overlap query…",
    nextButtonColor: "#f59e0b",
    finalHotZones: ["gist-overlap-query"],
    recalcMetrics: true,
    explain: () =>
      `Query: WHERE location && BOX((3,2),(6,6)). PostgreSQL checks which root MBRs overlap the query box. MBR-A (0,3)–(4,9) overlaps ✓. MBR-B (5,0)–(9,6) overlaps ✓. Both subtrees must be visited — this is the overlap cost unique to GiST. In each leaf, only entries actually inside the query box are returned: (3,4) from Leaf 1 and (5,6) from Leaf 2. Two results from scanning both subtrees.`,
  },
  {
    key: "gist-knn",
    label: "KNN (ORDER BY <->)",
    when: isGist,
    phase: "comparison",
    processingText: "Finding nearest neighbours…",
    nextButtonColor: "#f59e0b",
    finalHotZones: ["gist-knn"],
    recalcMetrics: true,
    explain: () =>
      `Query: ORDER BY location <-> POINT(5,5) LIMIT 3. GiST computes the distance from (5,5) to each root MBR. MBR-B is closer (dist=0, the point is inside), so Leaf 2 is visited first. Best candidate: (5,6) at d=1.0. Then Leaf 1 is checked — MBR-A's distance is 1.0, so it might contain something closer. It doesn't: best from Leaf 1 is (3,4) at d=2.2. Final 3-NN: (5,6) d=1.0, (3,4) d=2.2, (8,5) d=3.0. B-tree cannot do KNN on spatial data at all.`,
  },
  {
    key: "gist-penalty-split",
    label: "Penalty & Split",
    when: isGist,
    phase: "comparison",
    processingText: "Showing penalty and split…",
    nextButtonColor: "#f59e0b",
    finalHotZones: ["gist-penalty-split"],
    recalcMetrics: true,
    explain: () =>
      `New point POINT(4,6) arrives. GiST penalty function: inserting into Leaf 1 (MBR-A) costs 0 (point is already inside the box). Inserting into Leaf 2 (MBR-B) costs 6 sq units of enlargement. Leaf 1 wins — lower penalty = less dead space. But Leaf 1 is full! PostgreSQL runs the picksplit function: it divides the entries into two groups that minimise total MBR area. This is analogous to B-tree page splits, but optimised for spatial locality instead of sorted order.`,
  },
  {
    key: "gist-summary",
    label: "Summary",
    when: isGist,
    phase: "summary",
    finalHotZones: ["gist-summary"],
    explain: () =>
      `Key takeaways: (1) GiST = bounding-box tree. Internal entries store MBR + child pointer. Leaf entries store geometry + TID. (2) MBRs CAN overlap — unlike B-tree's non-overlapping sorted ranges. (3) Overlap means queries may visit MULTIPLE subtrees. (4) Penalty function chooses the subtree with least MBR enlargement. Picksplit divides full pages to minimise total area. (5) GiST uniquely supports KNN via ORDER BY <->. (6) Use GiST for spatial (PostGIS), range types, and full-text search (<->). Use B-tree for scalar comparisons. Use GIN for multi-value containment.`,
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: StructuresState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
