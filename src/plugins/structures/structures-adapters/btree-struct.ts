import type { StructuresState } from "../structuresSlice";
import type {
  StructuresAdapter,
  StructureNotes,
  SidebarTable,
  TableRow,
} from "./types";

/* ══════════════════════════════════════════════════════════
   B-tree Structure — Evolution Adapter

   Visualises the B-tree growing from an empty root as rows
   are inserted: page fills, page splits, internal nodes
   appear, and the tree deepens.  The scene is driven by
   hotZone markers that indicate the current evolution step.
   ══════════════════════════════════════════════════════════ */

const accent = "#3b82f6";
const muted = "#475569";
const amber = "#f59e0b";
const green = "#22c55e";

/* ──────────────────────────────────────────────────────── */
/* Drawing helpers                                         */
/* ──────────────────────────────────────────────────────── */

function drawPage(
  builder: any,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  header: string,
  entries: string,
  pointers: string,
  active: boolean,
  highlight: string,
  opts?: { dimmed?: boolean; newEntry?: string },
) {
  builder
    .node(id)
    .at(x, y)
    .rect(w, h, 10)
    .fill(
      opts?.dimmed
        ? "rgba(15, 23, 42, 0.45)"
        : opts?.newEntry
          ? "rgba(120, 53, 15, 0.22)"
          : "rgba(23, 37, 84, 0.92)",
    )
    .stroke(
      opts?.dimmed ? muted : active ? highlight : muted,
      opts?.dimmed ? 1.5 : 2,
    )
    .richLabel(
      (label: any) => {
        label.color(
          header,
          opts?.dimmed ? "#64748b" : active ? "#93c5fd" : "#94a3b8",
          { fontSize: 8, fontWeight: "bold" },
        );
        label.newline();
        label.color(
          opts?.newEntry ?? entries,
          opts?.newEntry
            ? "#fde68a"
            : opts?.dimmed
              ? "#64748b"
              : active
                ? "#dbeafe"
                : "#94a3b8",
          { fontSize: 10 },
        );
        if (pointers) {
          label.newline();
          label.color(
            pointers,
            opts?.dimmed ? "#475569" : active ? "#60a5fa" : "#475569",
            { fontSize: 7.5 },
          );
        }
      },
      { fill: "#fff", fontSize: 10, dy: pointers ? -10 : -4, lineHeight: 1.3 },
    );
}

/* ──────────────────────────────────────────────────────── */
/* Build Topology                                          */
/* ──────────────────────────────────────────────────────── */

function buildBtreeTopology(
  builder: any,
  state: StructuresState,
  helpers: any,
) {
  const hot = (z: string) => helpers.hot(z);

  /* ── Step markers ───────────────────────────────── */
  const showEmpty = hot("step-empty-root");
  const showFirstRows = hot("step-first-rows");
  const showPageFills = hot("step-page-fills");
  const showPageFull = hot("step-page-full");
  const showSplit = hot("step-split");
  const showInternal = hot("step-internal");
  const showMoreInserts = hot("step-more-inserts");
  const showDeepen = hot("step-deepen");
  const showSummary = hot("step-summary");

  /* ── Canvas constants ───────────────────────────── */
  const CX = 700;

  /* ── Header overlay ─────────────────────────────── */
  builder.overlay((overlay: any) => {
    overlay.add(
      "text",
      {
        x: CX,
        y: 46,
        text: "B-tree Evolution: watch the structure grow as rows are inserted",
        fill: "#cbd5e1",
        fontSize: 14,
        fontWeight: "600",
        textAnchor: "middle",
      },
      { key: "header-note" },
    );
    overlay.add(
      "text",
      {
        x: CX,
        y: 70,
        text: "Page size = 8 kB  ·  Leaf entry: key → (heap page, row)  ·  Internal entry: key → child page pointer",
        fill: "#94a3b8",
        fontSize: 10,
        fontWeight: "500",
        textAnchor: "middle",
      },
      { key: "subheader-note" },
    );

    /* ── Info box (bottom) ────────────────────────── */
    const infoText =
      showDeepen || showSummary
        ? "Depth 3 — Internal = routing (key → child page)  ·  Leaf = data (key → heap row)"
        : showMoreInserts
          ? "Routing table: 4 boundary keys → 5 children  ·  #children = #keys + 1"
          : showInternal
            ? "Depth 2 — internal page routes to the right leaf, leaf page holds the actual row location"
            : showSplit
              ? "Two page types: INTERNAL (key → child page) for navigation  ·  LEAF (key → TID) for data"
              : showPageFull
                ? "Page full — next insert splits this into an internal page + two leaf pages"
                : showFirstRows || showPageFills
                  ? "Each entry = key → (heap page, row position) — pointing to an actual table row"
                  : "An empty B-tree starts as a single root page with no entries";

    overlay.add(
      "rect",
      {
        x: CX - 320,
        y: 590,
        w: 640,
        h: 34,
        rx: 12,
        fill: "rgba(15, 23, 42, 0.5)",
        stroke: showSplit || showDeepen ? amber : accent,
        strokeWidth: 1.2,
        strokeDasharray: "6 4",
      },
      { key: "info-box" },
    );
    overlay.add(
      "text",
      {
        x: CX,
        y: 612,
        text: infoText,
        fill: showSplit || showDeepen ? "#fcd34d" : "#93c5fd",
        fontSize: 10,
        fontWeight: "600",
        textAnchor: "middle",
      },
      { key: "info-text" },
    );
  });

  /* ════════════════════════════════════════════════════
     STEP 1: Empty root
     ════════════════════════════════════════════════════ */
  if (showEmpty) {
    drawPage(
      builder,
      "root",
      CX,
      300,
      320,
      60,
      "ROOT PAGE (leaf)",
      "(empty — no entries yet)",
      "",
      true,
      accent,
    );
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 2: First rows (1–3)
     ════════════════════════════════════════════════════ */
  if (showFirstRows) {
    drawPage(
      builder,
      "root",
      CX,
      300,
      420,
      74,
      "ROOT PAGE (leaf)  ·  3 entries",
      "1 → (100,1)    2 → (100,2)    3 → (100,3)",
      "key → (heap page, row)  —  each entry points to an actual table row",
      true,
      accent,
    );
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 3: Page fills (1–6)
     ════════════════════════════════════════════════════ */
  if (showPageFills) {
    drawPage(
      builder,
      "root",
      CX,
      300,
      440,
      74,
      "ROOT PAGE (leaf)  ·  6 / 8 entries",
      "1 → (100,1)   2 → (100,2)   …   6 → (101,2)",
      "key → (heap page, row)  —  75% full, room for 2 more entries",
      true,
      accent,
    );
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 4: Page full (1–8)
     ════════════════════════════════════════════════════ */
  if (showPageFull) {
    drawPage(
      builder,
      "root",
      CX,
      300,
      440,
      60,
      "ROOT PAGE (leaf)  ·  8 / 8  FULL",
      "1 → (100,1)   2 → (100,2)   …   8 → (101,4)",
      "page is full — next insert won't fit, must split!",
      true,
      amber,
    );

    builder.overlay((overlay: any) => {
      overlay.add(
        "rect",
        {
          x: CX - 50,
          y: 265,
          w: 100,
          h: 22,
          rx: 8,
          fill: "rgba(120, 53, 15, 0.4)",
          stroke: amber,
          strokeWidth: 1.5,
        },
        { key: "full-badge-box" },
      );
      overlay.add(
        "text",
        {
          x: CX,
          y: 280,
          text: "⚠ PAGE FULL",
          fill: "#fcd34d",
          fontSize: 9,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "full-badge-text" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 5: Page split — insert key 9 triggers split
     The old page [1–8] splits into [1–4] and [5–9].
     A new root appears with boundary key 5.
     ════════════════════════════════════════════════════ */
  if (showSplit) {
    /* NEW ROOT — internal page (routing only, no TIDs) */
    drawPage(
      builder,
      "root",
      CX,
      165,
      340,
      70,
      "🧭 INTERNAL PAGE  ·  routing only (no TIDs)",
      "[ P₀  |  5  |  P₁ ]",
      "< 5 → Leaf 1   ·   ≥ 5 → Leaf 2",
      true,
      amber,
    );

    /* Left leaf — data access */
    drawPage(
      builder,
      "leaf-left",
      CX - 230,
      350,
      340,
      66,
      "📦 LEAF PAGE 1  ·  4 entries  ·  data access",
      "1 → (100,1)   2 → (100,2)   3 → (100,3)   4 → (100,4)",
      "key → (heap page, row)  —  points to actual table rows",
      true,
      accent,
    );

    /* Right leaf — data access (contains new key 9) */
    drawPage(
      builder,
      "leaf-right",
      CX + 230,
      350,
      340,
      66,
      "📦 LEAF PAGE 2  ·  5 entries  ·  data access",
      "5 → (101,1)   …   8 → (101,4)   ★ 9 → (102,1)",
      "key → (heap page, row)  —  ★9 triggered the split",
      true,
      amber,
      { newEntry: "5 → (101,1)   …   8 → (101,4)   ★ 9 → (102,1)" },
    );

    builder.edge("root", "leaf-left", "edge-root-left").stroke(accent, 2);
    builder.edge("root", "leaf-right", "edge-root-right").stroke(amber, 2);

    /* Split badge + type distinction overlay */
    builder.overlay((overlay: any) => {
      overlay.add(
        "rect",
        {
          x: CX - 60,
          y: 112,
          w: 120,
          h: 22,
          rx: 8,
          fill: "rgba(120, 53, 15, 0.5)",
          stroke: amber,
          strokeWidth: 1.5,
        },
        { key: "split-badge-box" },
      );
      overlay.add(
        "text",
        {
          x: CX,
          y: 127,
          text: "PAGE SPLIT →",
          fill: "#fcd34d",
          fontSize: 9,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "split-badge-text" },
      );
      /* Type distinction annotation */
      overlay.add(
        "text",
        {
          x: CX,
          y: 450,
          text: "🧭 Internal → points to other index pages   ·   📦 Leaf → points to actual data rows",
          fill: "#94a3b8",
          fontSize: 9.5,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "type-distinction" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 6: Internal node established, tree depth = 2
     Rows 1–16 across 2 leaf pages
     ════════════════════════════════════════════════════ */
  if (showInternal) {
    /* Root internal page — routing */
    drawPage(
      builder,
      "root",
      CX,
      165,
      340,
      70,
      "🧭 INTERNAL (root)  ·  1 key, 2 children",
      "[ P₀  |  9  |  P₁ ]",
      "< 9 → Leaf 1   ·   ≥ 9 → Leaf 2",
      true,
      accent,
    );

    /* Leaf page 1 — data access */
    drawPage(
      builder,
      "leaf-left",
      CX - 230,
      350,
      340,
      66,
      "📦 LEAF 1  ·  8 / 8  ·  data access",
      "1 → (100,1)   2 → (100,2)   …   8 → (101,4)",
      "key → (heap page, row)",
      true,
      accent,
    );

    /* Leaf page 2 — data access */
    drawPage(
      builder,
      "leaf-right",
      CX + 230,
      350,
      340,
      66,
      "📦 LEAF 2  ·  8 / 8  ·  data access",
      "9 → (102,1)   10 → (102,2)   …   16 → (103,4)",
      "key → (heap page, row)",
      true,
      accent,
    );

    builder.edge("root", "leaf-left", "edge-root-left").stroke(accent, 2);
    builder.edge("root", "leaf-right", "edge-root-right").stroke(accent, 2);

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 255,
          text: "16 rows  ·  Depth 2  ·  1 boundary key → 2 children  ·  #children = #keys + 1",
          fill: "#93c5fd",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "depth-label" },
      );
      /* Lookup example */
      overlay.add(
        "text",
        {
          x: CX,
          y: 450,
          text: "🔍 Find key 12:  root says 12 ≥ 9 → go to Leaf 2 → 12 → (102,4) → heap page 102, row 4",
          fill: "#fcd34d",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "lookup-example" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 7: More inserts — 36 rows across 5 leaves
     Root has 4 boundary keys, 5 child pointers
     ════════════════════════════════════════════════════ */
  if (showMoreInserts) {
    /* Root internal page — routing table with 4 boundary keys */
    drawPage(
      builder,
      "root",
      CX,
      140,
      520,
      74,
      "🧭 INTERNAL (root)  ·  4 keys, 5 children",
      "[ P₀ | 9 | P₁ | 17 | P₂ | 25 | P₃ | 33 | P₄ ]",
      "<9 → L1  ·  9–16 → L2  ·  17–24 → L3  ·  25–32 → L4  ·  ≥33 → L5",
      true,
      accent,
    );

    const leafData = [
      { id: "leaf-1", x: CX - 440, label: "📦 L1", range: "1–8", count: "8/8" },
      {
        id: "leaf-2",
        x: CX - 220,
        label: "📦 L2",
        range: "9–16",
        count: "8/8",
      },
      { id: "leaf-3", x: CX, label: "📦 L3", range: "17–24", count: "8/8" },
      {
        id: "leaf-4",
        x: CX + 220,
        label: "📦 L4",
        range: "25–32",
        count: "8/8",
      },
      {
        id: "leaf-5",
        x: CX + 440,
        label: "📦 L5",
        range: "33–36",
        count: "4/8",
      },
    ];

    leafData.forEach((ld) => {
      drawPage(
        builder,
        ld.id,
        ld.x,
        340,
        190,
        54,
        `${ld.label}  ·  ${ld.count}`,
        `keys [${ld.range}] → heap rows`,
        "",
        true,
        ld.count === "4/8" ? green : accent,
      );
      builder.edge("root", ld.id, `edge-root-${ld.id}`).stroke(accent, 2);
    });

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 236,
          text: "36 rows  ·  Depth 2  ·  4 boundary keys → 5 child pointers  ·  #children = #keys + 1",
          fill: "#93c5fd",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "depth-label" },
      );
      /* Leaf sibling links */
      for (let i = 0; i < leafData.length - 1; i++) {
        overlay.add(
          "text",
          {
            x: (leafData[i].x + leafData[i + 1].x) / 2,
            y: 390,
            text: "→",
            fill: "#475569",
            fontSize: 12,
            fontWeight: "600",
            textAnchor: "middle",
          },
          { key: `sibling-arrow-${i}` },
        );
      }
      /* Lookup walkthrough */
      overlay.add(
        "rect",
        {
          x: CX - 280,
          y: 424,
          w: 560,
          h: 50,
          rx: 10,
          fill: "rgba(120, 53, 15, 0.18)",
          stroke: "#f59e0b",
          strokeWidth: 1.2,
          strokeDasharray: "6 4",
        },
        { key: "lookup-box" },
      );
      overlay.add(
        "text",
        {
          x: CX,
          y: 443,
          text: "🔍 Lookup key = 18:",
          fill: "#fcd34d",
          fontSize: 10,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "lookup-title" },
      );
      overlay.add(
        "text",
        {
          x: CX,
          y: 462,
          text: "1. Root: 18 ≥ 17, < 25 → follow P₂    2. Leaf 3: 18 → (105,3)    3. Heap: page 105, row 3",
          fill: "#fde68a",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "lookup-path" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 8: Tree deepens — root splits into depth 3
     Many rows, root had too many keys → new root + 2 internals
     ════════════════════════════════════════════════════ */
  if (showDeepen || showSummary) {
    const stepColor = showSummary ? green : amber;

    /* Meta-root — internal */
    drawPage(
      builder,
      "meta-root",
      CX,
      110,
      280,
      62,
      "🧭 ROOT (depth 3)",
      "[ P₀  |  33  |  P₁ ]",
      "< 33 → Internal L   ·   ≥ 33 → Internal R",
      true,
      stepColor,
    );

    /* Internal left */
    drawPage(
      builder,
      "int-left",
      CX - 280,
      250,
      340,
      62,
      "🧭 INTERNAL  ·  3 keys, 4 children",
      "[ P₀ | 9 | P₁ | 17 | P₂ | 25 | P₃ ]",
      "<9→L1  ·  9–16→L2  ·  17–24→L3  ·  ≥25→L4",
      true,
      accent,
    );

    /* Internal right */
    drawPage(
      builder,
      "int-right",
      CX + 280,
      250,
      260,
      62,
      "🧭 INTERNAL  ·  1 key, 2 children",
      "[ P₀  |  41  |  P₁ ]",
      "< 41 → L5   ·   ≥ 41 → L6",
      true,
      accent,
    );

    builder
      .edge("meta-root", "int-left", "edge-meta-left")
      .stroke(stepColor, 2);
    builder
      .edge("meta-root", "int-right", "edge-meta-right")
      .stroke(stepColor, 2);

    /* Leaves under left internal */
    const leftLeaves = [
      { id: "dl-1", x: CX - 420, range: "1–8" },
      { id: "dl-2", x: CX - 280, range: "9–16" },
      { id: "dl-3", x: CX - 140, range: "17–24" },
      { id: "dl-4", x: CX, range: "25–32" },
    ];
    leftLeaves.forEach((ll) => {
      drawPage(
        builder,
        ll.id,
        ll.x,
        400,
        120,
        42,
        "📦 LEAF",
        `[${ll.range}]`,
        "",
        true,
        accent,
      );
      builder.edge("int-left", ll.id, `edge-il-${ll.id}`).stroke(accent, 1.5);
    });

    /* Leaves under right internal */
    const rightLeaves = [
      { id: "dr-5", x: CX + 200, range: "33–40" },
      { id: "dr-6", x: CX + 360, range: "41–48" },
    ];
    rightLeaves.forEach((rl) => {
      drawPage(
        builder,
        rl.id,
        rl.x,
        400,
        120,
        42,
        "📦 LEAF",
        `[${rl.range}]`,
        "",
        true,
        accent,
      );
      builder.edge("int-right", rl.id, `edge-ir-${rl.id}`).stroke(accent, 1.5);
    });

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 88,
          text: showSummary
            ? "~48 rows · Depth 3 · 🧭 Internal = routing (key → child page)  📦 Leaf = data (key → heap row)"
            : "Root split → Depth 3 · 🧭 Internal pages route  ·  📦 Leaf pages hold actual entries",
          fill: showSummary ? "#bbf7d0" : "#fcd34d",
          fontSize: 10,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "deepen-label" },
      );
    });
    return;
  }

  /* ── Default: overview (empty root) ─────────────── */
  drawPage(
    builder,
    "root",
    CX,
    300,
    320,
    60,
    "ROOT PAGE",
    "B-tree starts here",
    "",
    false,
    accent,
  );
}

/* ──────────────────────────────────────────────────────── */
/* Adapter export                                          */
/* ──────────────────────────────────────────────────────── */

const notes: StructureNotes = {
  summary:
    "Internal pages point to more index pages (navigation). Leaf pages point to actual data rows (key → TID). The tree stays balanced: every leaf is at the same depth, so lookup cost is always O(log n) page reads.",
  keyRule:
    "#children = #keys + 1. Internal pages are routing tables: key + child page pointer. Leaf pages hold actual entries: key + TID (heap page, row).",
};

/* ── Sidebar table data ──────────────────────────────── */

const BTREE_COLUMNS = ["id", "name", "amount", "heap (page,row)"];

const ALL_BTREE_ROWS: (TableRow & { step: number })[] = [
  { step: 1, cells: ["1", "Alice", "$120", "(100,1)"] },
  { step: 1, cells: ["2", "Bob", "$85", "(100,2)"] },
  { step: 1, cells: ["3", "Carol", "$210", "(100,3)"] },
  { step: 2, cells: ["4", "Dave", "$55", "(100,4)"] },
  { step: 2, cells: ["5", "Eve", "$300", "(101,1)"] },
  { step: 2, cells: ["6", "Frank", "$175", "(101,2)"] },
  { step: 3, cells: ["7", "Grace", "$92", "(101,3)"] },
  { step: 3, cells: ["8", "Hank", "$140", "(101,4)"] },
  { step: 4, cells: ["9", "Ivy", "$67", "(102,1)"] },
  { step: 5, cells: ["10", "Jack", "$230", "(102,2)"] },
  { step: 5, cells: ["11", "Kim", "$88", "(102,3)"] },
  { step: 5, cells: ["12", "Leo", "$155", "(102,4)"] },
  { step: 5, cells: ["13", "Mia", "$42", "(103,1)"] },
  { step: 5, cells: ["14", "Nia", "$275", "(103,2)"] },
  { step: 5, cells: ["15", "Oscar", "$63", "(103,3)"] },
  { step: 5, cells: ["16", "Pat", "$190", "(103,4)"] },
];

function getStepNumber(state: StructuresState): number {
  const hz = state.hotZones;
  if (hz.includes("step-summary") || hz.includes("step-deepen")) return 99;
  if (hz.includes("step-more-inserts")) return 99;
  if (hz.includes("step-internal")) return 5;
  if (hz.includes("step-split")) return 4;
  if (hz.includes("step-page-full")) return 3;
  if (hz.includes("step-page-fills")) return 2;
  if (hz.includes("step-first-rows")) return 1;
  return -1;
}

function getBtreeTableData(state: StructuresState): SidebarTable | null {
  const stepNum = getStepNumber(state);
  if (stepNum < 0) return null;
  const maxStep = Math.min(stepNum, 5);
  const visible = ALL_BTREE_ROWS.filter((r) => r.step <= maxStep);
  const rows: TableRow[] = visible.map((r) => ({
    cells: r.cells,
    isNew: r.step === stepNum,
  }));
  if (stepNum >= 99) {
    return {
      columns: BTREE_COLUMNS,
      rows: [
        ...rows,
        { cells: ["…", "…", "…", "…"] },
        ...(stepNum === 99 && state.hotZones.includes("step-more-inserts")
          ? [{ cells: ["36", "Zara", "$110", "(108,4)"] }]
          : [{ cells: ["48", "Zoe", "$98", "(111,4)"] }]),
      ],
    };
  }
  return { columns: BTREE_COLUMNS, rows };
}

export const btreeStructAdapter: StructuresAdapter = {
  id: "btree-struct",

  profile: {
    label: "B-tree",
    description:
      "Watch a B-tree grow from a single empty root page. As rows are inserted, pages fill up, split, and the tree deepens — all while staying perfectly balanced.",
  },

  colors: { fill: "#172554", stroke: "#3b82f6" },

  notes,

  computeMetrics(state: StructuresState) {
    const step = state.hotZones;
    if (step.includes("step-deepen") || step.includes("step-summary")) {
      state.pageSize = "8 kB";
      state.entrySize = "~1 kB";
      state.treeDepth = "3";
      state.rowCount = "~48";
    } else if (step.includes("step-more-inserts")) {
      state.pageSize = "8 kB";
      state.entrySize = "~1 kB";
      state.treeDepth = "2";
      state.rowCount = "36";
    } else if (step.includes("step-internal")) {
      state.pageSize = "8 kB";
      state.entrySize = "~1 kB";
      state.treeDepth = "2";
      state.rowCount = "16";
    } else if (step.includes("step-split")) {
      state.pageSize = "8 kB";
      state.entrySize = "~1 kB";
      state.treeDepth = "2";
      state.rowCount = "9";
    } else if (step.includes("step-page-full")) {
      state.pageSize = "8 kB";
      state.entrySize = "~1 kB";
      state.treeDepth = "1";
      state.rowCount = "8";
    } else if (step.includes("step-page-fills")) {
      state.pageSize = "8 kB";
      state.entrySize = "~1 kB";
      state.treeDepth = "1";
      state.rowCount = "6";
    } else if (step.includes("step-first-rows")) {
      state.pageSize = "8 kB";
      state.entrySize = "~1 kB";
      state.treeDepth = "1";
      state.rowCount = "3";
    } else {
      state.pageSize = "8 kB";
      state.entrySize = "~1 kB";
      state.treeDepth = "1";
      state.rowCount = "0";
    }
  },

  expandToken() {
    return null;
  },

  getFlowBeats() {
    return [];
  },

  buildTopology: buildBtreeTopology,

  getStatBadges(state: StructuresState) {
    return [
      { label: "Page Size", value: state.pageSize, color: accent },
      { label: "Entry Size", value: state.entrySize, color: accent },
      { label: "Tree Depth", value: state.treeDepth, color: accent },
      { label: "Row Count", value: state.rowCount, color: accent },
    ];
  },

  getTableData: getBtreeTableData,

  softReset(state: StructuresState) {
    state.pageSize = "8 kB";
    state.entrySize = "~1 kB";
    state.treeDepth = "1";
    state.rowCount = "0";
  },
};
