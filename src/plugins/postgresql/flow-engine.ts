import type { PostgresqlState } from "./postgresqlSlice";
import { getAdapter } from "./postgresql-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   Postgresql Lab — Declarative Flow Engine

   Uses the shared lab-engine for build/execute logic.
   Token expansion and flow beats delegate to adapters.
   Steps use `when` guards to show only for the active topic.
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<PostgresqlState>;
export type StepDef = GenericStepDef<PostgresqlState, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<PostgresqlState>;

/* ── Token expansion (delegates to adapter) ──────────── */

export function expandToken(token: string, state: PostgresqlState): string[] {
  const adapter = getAdapter(state.variant);
  const expanded = adapter.expandToken(token, state);
  return expanded ?? [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey =
  | "idx-overview"
  | "idx-query-patterns"
  | "idx-operator-fit"
  | "idx-maintenance"
  | "idx-btree-read-root"
  | "idx-btree-read-internal"
  | "idx-btree-read-leaf"
  | "idx-btree-write-find"
  | "idx-btree-write-insert"
  | "idx-btree-write-wal"
  | "idx-gin-contrast"
  | "idx-gin-read-lookup"
  | "idx-gin-read-postings"
  | "idx-gin-read-intersect"
  | "idx-gin-read-fetch"
  | "idx-gin-write-decompose"
  | "idx-gin-write-fanout"
  | "idx-gin-write-amplify"
  | "idx-gin-write-wal"
  | "idx-composite-design"
  | "idx-summary";

const isIndexingStrategies = (s: PostgresqlState) =>
  s.topic === "indexing-strategies";

const isBtreeVariant = (s: PostgresqlState) =>
  s.topic === "indexing-strategies" && s.variant === "btree";

const isGinVariant = (s: PostgresqlState) =>
  s.topic === "indexing-strategies" && s.variant === "gin";

const accent = (s: PostgresqlState) => getAdapter(s.variant).colors.stroke;

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  {
    key: "idx-overview",
    label: "Overview",
    when: isIndexingStrategies,
    nextButton: "Inspect Queries →",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `I start from actual query patterns, not from the schema. For ${adapter.profile.label}, inspect the columns used in WHERE, JOIN, ORDER BY, and GROUP BY, then weigh selectivity, read/write mix, and whether the table is append-only or frequently updated.`;
    },
  },
  {
    key: "idx-query-patterns",
    label: "Start With Queries",
    when: isIndexingStrategies,
    phase: "processing",
    processingText: "Inspecting workload…",
    nextButtonColor: "#2563eb",
    flow: (s) => [
      { from: "query", to: "operators", duration: 360, color: accent(s) },
    ],
    finalHotZones: ["query", "workload"],
    recalcMetrics: true,
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `The first filter is the query itself. ${adapter.notes.queryPatterns} I only index columns that repeatedly appear in real predicates or sort paths, because indexing low-value columns just increases write cost with little planner benefit.`;
    },
  },
  {
    key: "idx-operator-fit",
    label: "Match Operators",
    when: isIndexingStrategies,
    phase: "processing",
    processingText: "Matching operator class…",
    nextButtonColor: "#8b5cf6",
    flow: (s) => [
      { from: "query", to: "operators", duration: 320, color: accent(s) },
      { from: "operators", to: "index", duration: 360, color: accent(s) },
    ],
    finalHotZones: ["operators", "index"],
    recalcMetrics: true,
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return adapter.notes.operatorFit;
    },
  },
  {
    key: "idx-maintenance",
    label: "Weigh Cost & Shape",
    when: isIndexingStrategies,
    phase: "comparison",
    processingText: "Checking maintenance trade-offs…",
    nextButtonColor: "#14b8a6",
    flow: (s) => [
      { from: "workload", to: "index", duration: 320, color: accent(s) },
      { from: "index", to: "tradeoffs", duration: 400, color: accent(s) },
    ],
    finalHotZones: ["workload", "index", "tradeoffs"],
    recalcMetrics: true,
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.notes.workloadFit} This is also where I check whether the table is append-only, heavily updated, or physically ordered in a useful way. Every extra index increases write amplification, vacuum work, and memory pressure, so the read win needs to justify the maintenance bill.`;
    },
  },
  {
    key: "idx-btree-read-root",
    label: "Read: Root Page",
    when: isBtreeVariant,
    phase: "comparison",
    processingText: "Scanning root page for the right child pointer\u2026",
    nextButtonColor: "#3b82f6",
    flow: () => [
      {
        from: "btree-root",
        to: "btree-branch-left",
        duration: 600,
        color: "#3b82f6",
      },
    ],
    finalHotZones: [
      "btree-root",
      "btree-branch-left",
      "btree-reading",
      "index",
    ],
    explain: () =>
      `The root page contains sorted account_id keys (5, 10, 15, 20, \u2026) and child pointers. PostgreSQL binary searches within this 8 kB page to find the pointer for account_id = 10. This is one page read from disk (or buffer cache). Real root pages hold hundreds of keys, so this single comparison fans out to many possible children.`,
  },
  {
    key: "idx-btree-read-internal",
    label: "Read: Internal Page",
    when: isBtreeVariant,
    phase: "comparison",
    processingText: "Following child pointer to internal page\u2026",
    nextButtonColor: "#3b82f6",
    flow: () => [
      {
        from: "btree-branch-left",
        to: "btree-leaf-paid",
        duration: 600,
        color: "#3b82f6",
      },
    ],
    finalHotZones: [
      "btree-root",
      "btree-branch-left",
      "btree-leaf-paid",
      "btree-reading",
      "index",
    ],
    explain: () =>
      `The internal page for account 10 has sorted status keys (open, paid, void) with child pointers to leaf pages. PostgreSQL binary searches within this page to find the pointer for status = 'paid'. That is page read number two. Together, two page reads narrowed millions of rows down to the exact leaf.`,
  },
  {
    key: "idx-btree-read-leaf",
    label: "Read: Leaf Page + TIDs",
    when: isBtreeVariant,
    phase: "comparison",
    processingText: "Reading leaf page and following TIDs to heap\u2026",
    nextButtonColor: "#3b82f6",
    finalHotZones: [
      "btree-root",
      "btree-branch-left",
      "btree-leaf-paid",
      "btree-reading",
      "index",
    ],
    explain: () =>
      `The leaf page has sorted created_at values (Apr 13, Apr 12, Apr 11, \u2026) each paired with a TID \u2014 a tuple identifier that points directly to the row's physical location in the heap table. Because the composite key stores created_at DESC, the results are already in the right order. PostgreSQL reads TIDs and fetches the actual rows. Two page reads plus TID lookups \u2014 no sequential scan needed.`,
  },
  {
    key: "idx-btree-write-find",
    label: "Write: Find Leaf",
    when: isBtreeVariant,
    phase: "comparison",
    processingText: "Walking the same path to find the right leaf page\u2026",
    nextButtonColor: "#f59e0b",
    flow: () => [
      {
        from: "btree-root",
        to: "btree-branch-left",
        duration: 500,
        color: "#f59e0b",
      },
    ],
    finalHotZones: [
      "btree-root",
      "btree-branch-left",
      "btree-writing",
      "tradeoffs",
    ],
    explain: () =>
      `An INSERT must first walk the same root \u2192 internal path to find which leaf page the new entry belongs in. This is the same traversal as a read \u2014 binary search within each 8 kB page \u2014 but now the goal is to find where to insert, not where to read.`,
  },
  {
    key: "idx-btree-write-insert",
    label: "Write: Insert Entry",
    when: isBtreeVariant,
    phase: "comparison",
    processingText: "Inserting new key into the leaf page\u2026",
    nextButtonColor: "#f59e0b",
    flow: () => [
      {
        from: "btree-branch-left",
        to: "btree-leaf-paid",
        duration: 500,
        color: "#f59e0b",
      },
    ],
    finalHotZones: [
      "btree-root",
      "btree-branch-left",
      "btree-leaf-paid",
      "btree-writing",
      "tradeoffs",
    ],
    explain: () =>
      `PostgreSQL inserts the new key (Apr 13, TID) into the leaf page at the correct sorted position. Existing entries may shift to keep the page sorted. If the page is full, PostgreSQL splits it into two pages and adds a new pointer in the parent \u2014 that is a page split, which is more expensive and requires updating parent pages up the tree.`,
  },
  {
    key: "idx-btree-write-wal",
    label: "Write: WAL + Vacuum",
    when: isBtreeVariant,
    phase: "comparison",
    processingText: "Writing WAL and scheduling vacuum work\u2026",
    nextButtonColor: "#f59e0b",
    finalHotZones: [
      "btree-root",
      "btree-branch-left",
      "btree-leaf-paid",
      "btree-writing",
      "tradeoffs",
    ],
    explain: () =>
      `Every page modification is written to WAL before the actual page is updated \u2014 that is the Write-Ahead Log guarantee. With 5 indexes on the same table, each INSERT repeats this walk-and-insert 5 times, generating 5\u00d7 the WAL volume. Later, vacuum reclaims dead tuples and cleans up index entries from deleted rows. That is why over-indexing directly increases write amplification, WAL pressure, and vacuum work.`,
  },
  {
    key: "idx-gin-contrast",
    label: "Why GIN?",
    when: isGinVariant,
    phase: "comparison",
    processingText: "Comparing B-tree vs GIN on JSONB\u2026",
    nextButtonColor: "#22c55e",
    flow: () => [
      {
        from: "gin-source",
        to: "gin-term-mobile",
        duration: 450,
        color: "#22c55e",
      },
      {
        from: "gin-source",
        to: "gin-term-priority",
        duration: 450,
        color: "#22c55e",
      },
    ],
    finalHotZones: [
      "gin-source",
      "gin-term-mobile",
      "gin-term-priority",
      "gin-contrast",
      "index",
    ],
    explain: () =>
      `A JSONB column like {"channel":"mobile","tag":"priority"} packs multiple searchable values into one row. B-tree indexes sort the entire JSON as one opaque blob, so operators like @> ("does it contain this key?") cannot use the index at all \u2014 PostgreSQL falls back to a sequential scan. GIN solves this by decomposing each row into individual terms (channel=mobile, tag=priority) and recording which rows contain each term. Now @> becomes a fast term-list lookup instead of a full scan. The rule of thumb: need to search inside a structure \u2192 GIN; comparing a single scalar value \u2192 B-tree.`,
  },
  {
    key: "idx-gin-read-lookup",
    label: "Read: Lookup Terms",
    when: isGinVariant,
    phase: "comparison",
    processingText: "Looking up each value in the GIN index\u2026",
    nextButtonColor: "#22c55e",
    flow: () => [
      {
        from: "gin-source",
        to: "gin-term-mobile",
        duration: 400,
        color: "#22c55e",
      },
      {
        from: "gin-source",
        to: "gin-term-priority",
        duration: 400,
        color: "#22c55e",
      },
    ],
    finalHotZones: [
      "gin-source",
      "gin-term-mobile",
      "gin-term-priority",
      "gin-reading",
      "index",
    ],
    explain: () =>
      `The query asks for channel=mobile AND tag=priority. GIN looks up each value as a separate term in the index — just like looking up two words in a book's index.`,
  },
  {
    key: "idx-gin-read-postings",
    label: "Read: Posting Lists",
    when: isGinVariant,
    phase: "comparison",
    processingText: "Fetching posting lists for each term\u2026",
    nextButtonColor: "#22c55e",
    flow: () => [
      {
        from: "gin-term-mobile",
        to: "gin-postings-mobile",
        duration: 400,
        color: "#22c55e",
      },
      {
        from: "gin-term-priority",
        to: "gin-postings-priority",
        duration: 400,
        color: "#22c55e",
      },
    ],
    finalHotZones: [
      "gin-source",
      "gin-term-mobile",
      "gin-term-priority",
      "gin-postings-mobile",
      "gin-postings-priority",
      "gin-reading",
      "index",
    ],
    explain: () =>
      `Each term entry points to a posting list — the row IDs that contain that value. mobile \u2192 [12, 18, 27] and priority \u2192 [7, 18]. These lists are the core data structure that makes GIN reads fast.`,
  },
  {
    key: "idx-gin-read-intersect",
    label: "Read: Intersect",
    when: isGinVariant,
    phase: "comparison",
    processingText: "Intersecting posting lists\u2026",
    nextButtonColor: "#22c55e",
    flow: () => [
      {
        from: "gin-postings-mobile",
        to: "gin-match",
        duration: 380,
        color: "#22c55e",
      },
      {
        from: "gin-postings-priority",
        to: "gin-match",
        duration: 380,
        color: "#22c55e",
      },
    ],
    finalHotZones: [
      "gin-source",
      "gin-term-mobile",
      "gin-term-priority",
      "gin-postings-mobile",
      "gin-postings-priority",
      "gin-match",
      "gin-reading",
      "index",
    ],
    explain: () =>
      `Because the query uses AND, PostgreSQL intersects the two posting lists. [12, 18, 27] \u2229 [7, 18] = [18]. Only row 18 has both channel=mobile and tag=priority.`,
  },
  {
    key: "idx-gin-read-fetch",
    label: "Read: Fetch Row",
    when: isGinVariant,
    phase: "comparison",
    processingText: "Fetching matched row from heap\u2026",
    nextButtonColor: "#22c55e",
    flow: () => [
      {
        from: "gin-match",
        to: "gin-output",
        duration: 380,
        color: "#22c55e",
      },
    ],
    finalHotZones: [
      "gin-source",
      "gin-term-mobile",
      "gin-term-priority",
      "gin-postings-mobile",
      "gin-postings-priority",
      "gin-match",
      "gin-output",
      "gin-reading",
      "index",
    ],
    explain: () =>
      `Finally, PostgreSQL fetches row 18 from the heap table. The entire read was: term lookup \u2192 posting lists \u2192 intersect \u2192 fetch. No sequential scan needed.`,
  },
  {
    key: "idx-gin-write-decompose",
    label: "Write: Decompose",
    when: isGinVariant,
    phase: "comparison",
    processingText: "Breaking new row into searchable values\u2026",
    nextButtonColor: "#f59e0b",
    flow: () => [
      {
        from: "gin-source",
        to: "gin-term-mobile",
        duration: 400,
        color: "#f59e0b",
      },
      {
        from: "gin-source",
        to: "gin-term-priority",
        duration: 400,
        color: "#f59e0b",
      },
    ],
    finalHotZones: [
      "gin-source",
      "gin-term-mobile",
      "gin-term-priority",
      "gin-writing",
      "tradeoffs",
    ],
    explain: () =>
      `New row 31 contains channel=mobile and tag=priority. PostgreSQL must first decompose those values into individual terms that GIN can index \u2014 the same decomposition that makes reads fast now becomes work on the write side.`,
  },
  {
    key: "idx-gin-write-fanout",
    label: "Write: Update Lists",
    when: isGinVariant,
    phase: "comparison",
    processingText: "Appending to each term\u2019s posting list\u2026",
    nextButtonColor: "#f59e0b",
    flow: () => [
      {
        from: "gin-term-mobile",
        to: "gin-postings-mobile",
        duration: 400,
        color: "#f59e0b",
      },
      {
        from: "gin-term-priority",
        to: "gin-postings-priority",
        duration: 400,
        color: "#f59e0b",
      },
    ],
    finalHotZones: [
      "gin-source",
      "gin-term-mobile",
      "gin-term-priority",
      "gin-postings-mobile",
      "gin-postings-priority",
      "gin-writing",
      "tradeoffs",
    ],
    explain: () =>
      `Each term\u2019s posting list must be updated. Row 31 is appended to the mobile list [12, 18, 27 \u2192 12, 18, 27, 31] and the priority list [7, 18 \u2192 7, 18, 31]. One insert, two list updates.`,
  },
  {
    key: "idx-gin-write-amplify",
    label: "Write: Fan Out",
    when: isGinVariant,
    phase: "comparison",
    processingText: "Write amplification across lists\u2026",
    nextButtonColor: "#f59e0b",
    flow: () => [
      {
        from: "gin-postings-mobile",
        to: "gin-match",
        duration: 380,
        color: "#f59e0b",
      },
      {
        from: "gin-postings-priority",
        to: "gin-match",
        duration: 380,
        color: "#f59e0b",
      },
    ],
    finalHotZones: [
      "gin-source",
      "gin-term-mobile",
      "gin-term-priority",
      "gin-postings-mobile",
      "gin-postings-priority",
      "gin-match",
      "gin-writing",
      "tradeoffs",
    ],
    explain: () =>
      `One INSERT fans out to touch multiple posting lists. This is the core write amplification of GIN \u2014 the more searchable values a row contains, the more lists must be updated. Compare this to B-tree, which walks a single path.`,
  },
  {
    key: "idx-gin-write-wal",
    label: "Write: WAL + Pending",
    when: isGinVariant,
    phase: "comparison",
    processingText: "Writing WAL and pending entries\u2026",
    nextButtonColor: "#f59e0b",
    flow: () => [
      {
        from: "gin-match",
        to: "gin-output",
        duration: 380,
        color: "#f59e0b",
      },
    ],
    finalHotZones: [
      "gin-source",
      "gin-term-mobile",
      "gin-term-priority",
      "gin-postings-mobile",
      "gin-postings-priority",
      "gin-match",
      "gin-output",
      "gin-writing",
      "tradeoffs",
    ],
    explain: () =>
      `PostgreSQL writes WAL for each posting list change and may batch entries into a pending list for efficiency. Later, vacuum or auto-cleanup merges pending entries into the main GIN structure. That is why GIN reads can be great while writes are materially heavier than a B-tree.`,
  },
  {
    key: "idx-composite-design",
    label: "Composite Design",
    when: isIndexingStrategies,
    phase: "comparison",
    processingText: "Designing the final index…",
    nextButtonColor: "#f59e0b",
    flow: (s) => [
      { from: "query", to: "composite", duration: 340, color: accent(s) },
      { from: "index", to: "composite", duration: 360, color: accent(s) },
    ],
    finalHotZones: ["query", "index", "composite"],
    recalcMetrics: true,
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `A senior-level decision is often less about a single column and more about the full access path. ${adapter.notes.compositeAdvice}`;
    },
  },
  {
    key: "idx-summary",
    label: "Summary",
    when: isIndexingStrategies,
    phase: "summary",
    finalHotZones: ["index", "tradeoffs", "composite"],
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return `${adapter.notes.summary} The main rule is still the same: start from real workload evidence, not from the schema diagram, and avoid over-indexing just because a column looks important.`;
    },
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: PostgresqlState): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
