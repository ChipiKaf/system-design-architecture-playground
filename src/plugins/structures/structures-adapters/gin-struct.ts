import type { StructuresState } from "../structuresSlice";
import type {
  StructuresAdapter,
  StructureNotes,
  SidebarTable,
  TableRow,
} from "./types";

/* ══════════════════════════════════════════════════════════
   GIN Structure — Evolution Adapter

   Visualises a GIN (Generalized Inverted Index) growing
   from an empty state as rows with JSONB/array data are
   inserted.  Shows how the inverted index maps each
   distinct value to a posting list of row TIDs.

   Key insight:  B-tree = row → sorted key position
                 GIN    = value → list of rows containing it

   The scene is driven by hotZone markers that indicate
   the current evolution step.
   ══════════════════════════════════════════════════════════ */

const accent = "#22c55e";
const muted = "#475569";
const amber = "#f59e0b";
const green = "#86efac";
const teal = "#14b8a6";

/* ──────────────────────────────────────────────────────── */
/* Drawing helpers                                         */
/* ──────────────────────────────────────────────────────── */

function drawBox(
  builder: any,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  header: string,
  body: string,
  footer: string,
  active: boolean,
  highlight: string,
  opts?: { dimmed?: boolean; highlight?: boolean },
) {
  builder
    .node(id)
    .at(x, y)
    .rect(w, h, 10)
    .fill(
      opts?.dimmed
        ? "rgba(15, 23, 42, 0.45)"
        : opts?.highlight
          ? "rgba(6, 78, 59, 0.35)"
          : "rgba(6, 42, 34, 0.92)",
    )
    .stroke(
      opts?.dimmed ? muted : active ? highlight : muted,
      opts?.dimmed ? 1.5 : 2,
    )
    .richLabel(
      (label: any) => {
        label.color(
          header,
          opts?.dimmed ? "#64748b" : active ? "#86efac" : "#94a3b8",
          { fontSize: 8, fontWeight: "bold" },
        );
        label.newline();
        label.color(
          body,
          opts?.dimmed
            ? "#64748b"
            : opts?.highlight
              ? "#fde68a"
              : active
                ? "#d1fae5"
                : "#94a3b8",
          { fontSize: 10 },
        );
        if (footer) {
          label.newline();
          label.color(
            footer,
            opts?.dimmed ? "#475569" : active ? "#34d399" : "#475569",
            { fontSize: 7.5 },
          );
        }
      },
      { fill: "#fff", fontSize: 10, dy: footer ? -10 : -4, lineHeight: 1.3 },
    );
}

/* ──────────────────────────────────────────────────────── */
/* Build Topology                                          */
/* ──────────────────────────────────────────────────────── */

function buildGinTopology(builder: any, state: StructuresState, helpers: any) {
  const hot = (z: string) => helpers.hot(z);

  /* ── Step markers ───────────────────────────────── */
  const showEmpty = hot("gin-empty");
  const showFirstRow = hot("gin-first-row");
  const showSecondRow = hot("gin-second-row");
  const showThirdRow = hot("gin-third-row");
  const showManyRows = hot("gin-many-rows");
  const showLookupSingle = hot("gin-lookup-single");
  const showLookupAnd = hot("gin-lookup-and");
  const showPending = hot("gin-pending");
  const showSummary = hot("gin-summary");

  /* ── Canvas constants ───────────────────────────── */
  const CX = 700;

  /* ── Header overlay ─────────────────────────────── */
  builder.overlay((overlay: any) => {
    overlay.add(
      "text",
      {
        x: CX,
        y: 46,
        text: "GIN Evolution: watch an inverted index grow as JSONB rows are inserted",
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
        text: "Flipped model: value → [row IDs that contain it]  ·  NOT row → sorted position",
        fill: "#94a3b8",
        fontSize: 10,
        fontWeight: "500",
        textAnchor: "middle",
      },
      { key: "subheader-note" },
    );

    /* ── Info box (bottom) ────────────────────────── */
    const infoText = showSummary
      ? "GIN = value → rows  ·  B-tree = row → sorted key  ·  Two fundamentally different mental models"
      : showPending
        ? "Fastupdate: new entries go to a pending list first, then batch-merged into the main index"
        : showLookupAnd
          ? "AND query: intersect posting lists  ·  mobile ∩ priority = only rows that match BOTH"
          : showLookupSingle
            ? "Single lookup: find the value's posting list, then fetch those heap rows"
            : showManyRows
              ? "Each value has its own posting list — one insert can update MULTIPLE lists"
              : showThirdRow
                ? "Row 3 adds 'priority' — a new entry in the inverted index with its own posting list"
                : showSecondRow
                  ? "Row 2 shares 'mobile' with row 1 — its TID is APPENDED to the existing posting list"
                  : showFirstRow
                    ? "One row with tags = ['mobile','urgent'] creates TWO inverted entries — one per value"
                    : "An empty GIN index: no entries, no posting lists — waiting for data";

    overlay.add(
      "rect",
      {
        x: CX - 340,
        y: 590,
        w: 680,
        h: 34,
        rx: 12,
        fill: "rgba(15, 23, 42, 0.5)",
        stroke: showLookupAnd || showLookupSingle ? amber : accent,
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
        fill: showLookupAnd || showLookupSingle ? "#fcd34d" : "#86efac",
        fontSize: 10,
        fontWeight: "600",
        textAnchor: "middle",
      },
      { key: "info-text" },
    );
  });

  /* ════════════════════════════════════════════════════
     STEP 1: Empty GIN
     ════════════════════════════════════════════════════ */
  if (showEmpty) {
    drawBox(
      builder,
      "gin-index",
      CX,
      300,
      360,
      60,
      "GIN INDEX  (inverted)",
      "(empty — no entries, no posting lists)",
      "",
      true,
      accent,
    );
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 2: Insert row 1 — tags = ['mobile', 'urgent']
     Two values → two posting list entries, both with TID 1
     ════════════════════════════════════════════════════ */
  if (showFirstRow) {
    /* Source row */
    drawBox(
      builder,
      "src-row",
      CX,
      140,
      380,
      50,
      "📦 HEAP ROW 1",
      "id=1  tags=['mobile','urgent']  channel='web'",
      "one row → extracts TWO searchable values for the GIN index",
      true,
      teal,
    );

    /* Entry tree / posting lists */
    drawBox(
      builder,
      "entry-mobile",
      CX - 180,
      320,
      260,
      56,
      "📗 GIN ENTRY: 'mobile'",
      "Posting list → [ row 1 ]",
      "value → [rows containing it]",
      true,
      accent,
    );

    drawBox(
      builder,
      "entry-urgent",
      CX + 180,
      320,
      260,
      56,
      "📗 GIN ENTRY: 'urgent'",
      "Posting list → [ row 1 ]",
      "value → [rows containing it]",
      true,
      accent,
    );

    builder.edge("src-row", "entry-mobile", "e-src-m").stroke(accent, 2);
    builder.edge("src-row", "entry-urgent", "e-src-u").stroke(accent, 2);

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 420,
          text: "B-tree: 1 row → 1 index entry   ·   GIN: 1 row → N entries (one per searchable value)",
          fill: "#fcd34d",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "contrast-note" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 3: Insert row 2 — tags = ['mobile', 'email']
     'mobile' posting list grows, 'email' is new
     ════════════════════════════════════════════════════ */
  if (showSecondRow) {
    /* Previous row (dimmed) — still connected to its posting lists */
    drawBox(
      builder,
      "src-row1",
      CX - 260,
      100,
      340,
      40,
      "📦 ROW 1",
      "id=1  tags=['mobile','urgent']",
      "",
      false,
      muted,
      { dimmed: true },
    );

    /* Current row */
    drawBox(
      builder,
      "src-row2",
      CX + 140,
      100,
      340,
      40,
      "📦 HEAP ROW 2  ★ NEW",
      "id=2  tags=['mobile','email']  channel='app'",
      "",
      true,
      teal,
    );

    /* Posting lists */
    drawBox(
      builder,
      "entry-mobile",
      CX - 260,
      310,
      280,
      60,
      "📗 'mobile'",
      "Posting list → [ row 1, row 2 ]",
      "row 2 APPENDED — shared value, growing list",
      true,
      accent,
      { highlight: true },
    );

    drawBox(
      builder,
      "entry-urgent",
      CX,
      310,
      220,
      60,
      "📗 'urgent'",
      "Posting list → [ row 1 ]",
      "unchanged — row 2 has no 'urgent'",
      false,
      muted,
      { dimmed: true },
    );

    drawBox(
      builder,
      "entry-email",
      CX + 260,
      310,
      220,
      60,
      "📗 'email'  ★ NEW",
      "Posting list → [ row 2 ]",
      "brand new value → new posting list",
      true,
      amber,
    );

    /* Row 1 edges (dimmed) */
    builder
      .edge("src-row1", "entry-mobile", "e-r1-m")
      .stroke(muted, 1.2)
      .dashed();
    builder
      .edge("src-row1", "entry-urgent", "e-r1-u")
      .stroke(muted, 1.2)
      .dashed();

    /* Row 2 edges (active) */
    builder.edge("src-row2", "entry-mobile", "e-src2-m").stroke(accent, 2);
    builder.edge("src-row2", "entry-email", "e-src2-e").stroke(amber, 2);

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 414,
          text: "Shared value → posting list GROWS  ·  New value → new entry created",
          fill: "#86efac",
          fontSize: 9.5,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "growth-note" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 4: Insert row 3 — tags = ['mobile', 'priority']
     'mobile' grows to 3, 'priority' is new
     ════════════════════════════════════════════════════ */
  if (showThirdRow) {
    /* Previous rows (dimmed) */
    drawBox(
      builder,
      "src-row1",
      CX - 320,
      100,
      280,
      36,
      "📦 ROW 1",
      "tags=['mobile','urgent']",
      "",
      false,
      muted,
      { dimmed: true },
    );
    drawBox(
      builder,
      "src-row2",
      CX,
      100,
      280,
      36,
      "📦 ROW 2",
      "tags=['mobile','email']",
      "",
      false,
      muted,
      { dimmed: true },
    );

    /* Current row */
    drawBox(
      builder,
      "src-row3",
      CX + 320,
      100,
      290,
      36,
      "📦 HEAP ROW 3  ★ NEW",
      "tags=['mobile','priority']",
      "",
      true,
      teal,
    );

    const entries = [
      {
        id: "e-mobile",
        x: CX - 340,
        val: "'mobile'",
        list: "[ row 1, row 2, row 3 ]",
        note: "3 rows share this",
        hl: accent,
        hi: true,
      },
      {
        id: "e-urgent",
        x: CX - 120,
        val: "'urgent'",
        list: "[ row 1 ]",
        note: "unchanged",
        hl: muted,
        dim: true,
      },
      {
        id: "e-email",
        x: CX + 100,
        val: "'email'",
        list: "[ row 2 ]",
        note: "unchanged",
        hl: muted,
        dim: true,
      },
      {
        id: "e-priority",
        x: CX + 320,
        val: "'priority'  ★ NEW",
        list: "[ row 3 ]",
        note: "new value",
        hl: amber,
        hi: false,
      },
    ];

    entries.forEach((e) => {
      drawBox(
        builder,
        e.id,
        e.x,
        300,
        200,
        58,
        `📗 ${e.val}`,
        `Posting → ${e.list}`,
        e.note,
        !e.dim,
        e.hl,
        { dimmed: e.dim, highlight: e.hi },
      );
    });

    /* Previous row edges (dimmed/dashed) */
    builder.edge("src-row1", "e-mobile", "e-r1-m").stroke(muted, 1.2).dashed();
    builder.edge("src-row1", "e-urgent", "e-r1-u").stroke(muted, 1.2).dashed();
    builder.edge("src-row2", "e-mobile", "e-r2-m").stroke(muted, 1.2).dashed();
    builder.edge("src-row2", "e-email", "e-r2-e").stroke(muted, 1.2).dashed();

    /* Current row edges (active) */
    builder.edge("src-row3", "e-mobile", "e3-m").stroke(accent, 2);
    builder.edge("src-row3", "e-priority", "e3-p").stroke(amber, 2);

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 400,
          text: "4 distinct values so far → 4 posting lists  ·  'mobile' list keeps growing",
          fill: "#86efac",
          fontSize: 9.5,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "count-note" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 5: Many rows (8 rows, 6 distinct values)
     Full inverted index view
     ════════════════════════════════════════════════════ */
  if (showManyRows) {
    /* Heap table summary */
    drawBox(
      builder,
      "heap",
      CX,
      110,
      460,
      46,
      "📦 HEAP TABLE  ·  8 rows with tags[] column",
      "Each row has 2–3 tags  ·  Total tag occurrences: ~20  ·  Distinct values: 6",
      "",
      true,
      teal,
    );

    const postingLists = [
      {
        id: "pl-mobile",
        x: CX - 420,
        val: "'mobile'",
        tids: "[1,2,3,4,5,7,8]",
        count: "7 rows",
      },
      {
        id: "pl-urgent",
        x: CX - 240,
        val: "'urgent'",
        tids: "[1,4,6]",
        count: "3 rows",
      },
      {
        id: "pl-email",
        x: CX - 60,
        val: "'email'",
        tids: "[2,5]",
        count: "2 rows",
      },
      {
        id: "pl-priority",
        x: CX + 120,
        val: "'priority'",
        tids: "[3,6,7]",
        count: "3 rows",
      },
      {
        id: "pl-sms",
        x: CX + 300,
        val: "'sms'",
        tids: "[4,8]",
        count: "2 rows",
      },
      {
        id: "pl-push",
        x: CX + 460,
        val: "'push'",
        tids: "[5,8]",
        count: "2 rows",
      },
    ];

    postingLists.forEach((pl) => {
      drawBox(
        builder,
        pl.id,
        pl.x,
        290,
        160,
        62,
        `📗 ${pl.val}`,
        `→ ${pl.tids}`,
        pl.count,
        true,
        accent,
      );
      builder.edge("heap", pl.id, `e-heap-${pl.id}`).stroke(accent, 1.5);
    });

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 200,
          text: "GIN = one entry per distinct value  ·  each entry has a posting list of matching row IDs",
          fill: "#86efac",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "model-note" },
      );
      overlay.add(
        "text",
        {
          x: CX,
          y: 396,
          text: "1 row insert can touch MULTIPLE posting lists — that's why GIN writes are heavier than B-tree",
          fill: "#fcd34d",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "write-note" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 6: Single value lookup
     WHERE tags @> '{mobile}'
     ════════════════════════════════════════════════════ */
  if (showLookupSingle) {
    /* Query */
    builder.overlay((overlay: any) => {
      overlay.add(
        "rect",
        {
          x: CX - 200,
          y: 98,
          w: 400,
          h: 30,
          rx: 10,
          fill: "rgba(120, 53, 15, 0.3)",
          stroke: amber,
          strokeWidth: 1.5,
        },
        { key: "query-box" },
      );
      overlay.add(
        "text",
        {
          x: CX,
          y: 118,
          text: "SELECT * FROM events WHERE tags @> '{mobile}'",
          fill: "#fde68a",
          fontSize: 11,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "query-text" },
      );
    });

    /* GIN entry found */
    drawBox(
      builder,
      "pl-mobile",
      CX,
      220,
      340,
      66,
      "📗 GIN ENTRY: 'mobile'",
      "Posting list → [1, 2, 3, 4, 5, 7, 8]",
      "7 matching row IDs — fetch these from heap",
      true,
      amber,
      { highlight: true },
    );

    /* Result arrows */
    const heapRows = [
      { id: "hr-1", x: CX - 350, row: "Row 1" },
      { id: "hr-2", x: CX - 230, row: "Row 2" },
      { id: "hr-3", x: CX - 110, row: "Row 3" },
      { id: "hr-4", x: CX + 10, row: "Row 4" },
      { id: "hr-5", x: CX + 130, row: "Row 5" },
      { id: "hr-7", x: CX + 250, row: "Row 7" },
      { id: "hr-8", x: CX + 370, row: "Row 8" },
    ];

    heapRows.forEach((hr) => {
      drawBox(
        builder,
        hr.id,
        hr.x,
        370,
        100,
        36,
        "📦 HEAP",
        hr.row,
        "",
        true,
        teal,
      );
      builder.edge("pl-mobile", hr.id, `e-lk-${hr.id}`).stroke(amber, 1.5);
    });

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 440,
          text: "🔍 1. Find 'mobile' entry  →  2. Read posting list [1,2,3,4,5,7,8]  →  3. Fetch those 7 heap rows",
          fill: "#fcd34d",
          fontSize: 9.5,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "lookup-path" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 7: AND lookup — intersect posting lists
     WHERE tags @> '{mobile}' AND tags @> '{priority}'
     ════════════════════════════════════════════════════ */
  if (showLookupAnd) {
    builder.overlay((overlay: any) => {
      overlay.add(
        "rect",
        {
          x: CX - 260,
          y: 92,
          w: 520,
          h: 30,
          rx: 10,
          fill: "rgba(120, 53, 15, 0.3)",
          stroke: amber,
          strokeWidth: 1.5,
        },
        { key: "query-box" },
      );
      overlay.add(
        "text",
        {
          x: CX,
          y: 112,
          text: "SELECT * FROM events WHERE tags @> '{mobile}' AND tags @> '{priority}'",
          fill: "#fde68a",
          fontSize: 10.5,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "query-text" },
      );
    });

    /* Two posting lists */
    drawBox(
      builder,
      "pl-mobile",
      CX - 220,
      210,
      300,
      56,
      "📗 'mobile'",
      "Posting → [1, 2, 3, 4, 5, 7, 8]",
      "7 matches",
      true,
      accent,
      { highlight: true },
    );

    drawBox(
      builder,
      "pl-priority",
      CX + 220,
      210,
      280,
      56,
      "📗 'priority'",
      "Posting → [3, 6, 7]",
      "3 matches",
      true,
      accent,
      { highlight: true },
    );

    /* Intersection */
    drawBox(
      builder,
      "intersect",
      CX,
      340,
      380,
      56,
      "∩ INTERSECT posting lists  (AND logic)",
      "[1,2,3,4,5,7,8]  ∩  [3,6,7]  =  [ 3, 7 ]",
      "only rows that appear in BOTH lists → 2 results",
      true,
      amber,
      { highlight: true },
    );

    builder.edge("pl-mobile", "intersect", "e-m-int").stroke(accent, 2);
    builder.edge("pl-priority", "intersect", "e-p-int").stroke(accent, 2);

    /* Final heap rows */
    drawBox(
      builder,
      "hr-3",
      CX - 100,
      460,
      140,
      40,
      "📦 HEAP",
      "Row 3",
      "",
      true,
      teal,
    );
    drawBox(
      builder,
      "hr-7",
      CX + 100,
      460,
      140,
      40,
      "📦 HEAP",
      "Row 7",
      "",
      true,
      teal,
    );

    builder.edge("intersect", "hr-3", "e-int-3").stroke(amber, 1.5);
    builder.edge("intersect", "hr-7", "e-int-7").stroke(amber, 1.5);

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 534,
          text: "🔍 1. Fetch 'mobile' list  2. Fetch 'priority' list  3. Intersect → [3, 7]  4. Fetch 2 heap rows",
          fill: "#fcd34d",
          fontSize: 9.5,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "lookup-path" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 8: Pending list / fastupdate
     ════════════════════════════════════════════════════ */
  if (showPending) {
    drawBox(
      builder,
      "main-idx",
      CX - 200,
      200,
      320,
      56,
      "📗 MAIN GIN INDEX  (sorted entries + posting lists)",
      "'email'→[2,5]  'mobile'→[1..5,7,8]  'priority'→[3,6,7]  …",
      "fully merged — binary search on values",
      true,
      accent,
    );

    drawBox(
      builder,
      "pending",
      CX + 220,
      200,
      300,
      56,
      "📋 PENDING LIST  (fastupdate)",
      "Row 9: tags=['mobile','alert']  ← unsorted batch",
      "new inserts land here first — cheaper than updating each entry",
      true,
      amber,
      { highlight: true },
    );

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 142,
          text: "Fastupdate ON (default): inserts go to an unsorted pending list, not directly into the main index",
          fill: "#fcd34d",
          fontSize: 10,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "fu-title" },
      );

      /* Merge arrow */
      overlay.add(
        "text",
        {
          x: CX + 10,
          y: 299,
          text: "───  batch merge  ─→",
          fill: "#f59e0b",
          fontSize: 10,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "merge-arrow" },
      );
    });

    drawBox(
      builder,
      "merged",
      CX,
      360,
      500,
      56,
      "📗 AFTER MERGE: main GIN index absorbs pending entries",
      "'alert'→[9]  'email'→[2,5]  'mobile'→[1..5,7,8,9]  'priority'→[3,6,7]  …",
      "7 distinct values now — 'alert' is new, 'mobile' list grew to 8",
      true,
      green,
      { highlight: true },
    );

    builder.edge("main-idx", "merged", "e-main-merge").stroke(accent, 1.5);
    builder.edge("pending", "merged", "e-pend-merge").stroke(amber, 1.5);

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 450,
          text: "Trade-off: faster inserts (batch) but reads may need to scan pending list too until merge completes",
          fill: "#94a3b8",
          fontSize: 9,
          fontWeight: "600",
          textAnchor: "middle",
        },
        { key: "tradeoff-note" },
      );
    });
    return;
  }

  /* ════════════════════════════════════════════════════
     STEP 9: Summary
     ════════════════════════════════════════════════════ */
  if (showSummary) {
    /* Comparison side-by-side */
    drawBox(
      builder,
      "btree-model",
      CX - 260,
      180,
      340,
      80,
      "B-tree  ·  row → sorted key position",
      "Internal: key → child page pointer (routing)\nLeaf: key → TID (data access)",
      "one row → one index entry",
      true,
      "#3b82f6",
    );

    drawBox(
      builder,
      "gin-model",
      CX + 260,
      180,
      340,
      80,
      "GIN  ·  value → rows containing it",
      "Entry: distinct value → posting list [TID, TID, …]\nLookup: find value → read posting list → fetch rows",
      "one row → N entries (one per searchable value)",
      true,
      accent,
      { highlight: true },
    );

    builder.overlay((overlay: any) => {
      overlay.add(
        "text",
        {
          x: CX,
          y: 140,
          text: "Two fundamentally different indexing models:",
          fill: "#cbd5e1",
          fontSize: 12,
          fontWeight: "700",
          textAnchor: "middle",
        },
        { key: "title" },
      );

      /* Key differences table */
      const tableY = 310;
      const rows = [
        ["", "B-tree", "GIN"],
        ["Direction", "row → sorted position", "value → rows containing it"],
        ["Entry", "key + TID", "value + posting list"],
        ["1 insert touches", "1 index entry", "N entries (1 per value)"],
        ["Best for", "=, <, >, range, ORDER BY", "@>, ?, @@, array contains"],
        ["Write cost", "Low (one path)", "High (multiple posting lists)"],
      ];

      rows.forEach((row, ri) => {
        row.forEach((cell, ci) => {
          overlay.add(
            "text",
            {
              x: CX - 260 + ci * 260,
              y: tableY + ri * 22,
              text: cell,
              fill: ri === 0 ? "#86efac" : ci === 0 ? "#94a3b8" : "#e2e8f0",
              fontSize: ri === 0 ? 10 : 9,
              fontWeight: ri === 0 || ci === 0 ? "700" : "500",
              textAnchor: ci === 0 ? "end" : "middle",
            },
            { key: `table-${ri}-${ci}` },
          );
        });
      });
    });
    return;
  }

  /* ── Default: overview (empty) ──────────────────── */
  drawBox(
    builder,
    "gin-index",
    CX,
    300,
    360,
    60,
    "GIN INDEX",
    "Inverted index starts here",
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
    "GIN flips the B-tree model. Instead of row → sorted key, GIN maps each distinct value to a posting list of row IDs that contain it. One insert can touch multiple posting lists. Reads find the value entry, read its posting list, then fetch heap rows. AND queries intersect posting lists.",
  keyRule:
    "value → [row IDs]. One row with N searchable values creates N GIN entries. Reads look up the value, get the posting list, then fetch heap rows.",
};

/* ── Sidebar table data ──────────────────────────────── */

const GIN_COLUMNS = ["id", "channel", "tags"];

interface GinRow extends TableRow {
  ginStep: number;
}

const ALL_GIN_ROWS: GinRow[] = [
  { ginStep: 1, cells: ["1", "push-svc", "{mobile,urgent}"] },
  { ginStep: 2, cells: ["2", "email-svc", "{mobile,email}"] },
  { ginStep: 3, cells: ["3", "push-svc", "{mobile,priority}"] },
  { ginStep: 4, cells: ["4", "sms-gw", "{mobile,urgent,sms}"] },
  { ginStep: 4, cells: ["5", "push-svc", "{mobile,email,push}"] },
  { ginStep: 4, cells: ["6", "email-svc", "{urgent,priority}"] },
  { ginStep: 4, cells: ["7", "sms-gw", "{mobile,priority}"] },
  { ginStep: 4, cells: ["8", "push-svc", "{mobile,sms,push}"] },
  { ginStep: 7, cells: ["9", "alert-svc", "{mobile,alert}"] },
];

/* rows that match a lookup query — for highlight */
const LOOKUP_SINGLE_IDS = new Set(["1", "2", "3", "4", "5", "7", "8"]); // mobile
const LOOKUP_AND_IDS = new Set(["3", "7"]); // mobile ∩ priority

function ginStepNum(state: StructuresState): number {
  const hz = state.hotZones;
  if (hz.includes("gin-summary")) return 99;
  if (hz.includes("gin-pending")) return 7;
  if (hz.includes("gin-lookup-and")) return 6;
  if (hz.includes("gin-lookup-single")) return 5;
  if (hz.includes("gin-many-rows")) return 4;
  if (hz.includes("gin-third-row")) return 3;
  if (hz.includes("gin-second-row")) return 2;
  if (hz.includes("gin-first-row")) return 1;
  return -1;
}

function getGinTableData(state: StructuresState): SidebarTable | null {
  const step = ginStepNum(state);
  if (step < 0) return null;

  let highlightSet: Set<string> | null = null;
  if (step === 5) highlightSet = LOOKUP_SINGLE_IDS;
  if (step === 6) highlightSet = LOOKUP_AND_IDS;

  const maxStep = step >= 99 ? 7 : step;
  const visible = ALL_GIN_ROWS.filter((r) => r.ginStep <= maxStep);
  const rows: TableRow[] = visible.map((r) => ({
    cells: r.cells,
    isNew: r.ginStep === step,
    isHighlight: highlightSet ? highlightSet.has(r.cells[0]) : false,
  }));
  return { columns: GIN_COLUMNS, rows };
}

export const ginStructAdapter: StructuresAdapter = {
  id: "gin-struct",

  profile: {
    label: "GIN (Inverted)",
    description:
      "Watch a GIN inverted index grow from empty. As rows with array/JSONB data are inserted, each distinct value gets its own posting list of matching row IDs — the opposite direction from a B-tree.",
  },

  colors: { fill: "#052e16", stroke: "#22c55e" },

  notes,

  computeMetrics(state: StructuresState) {
    const step = state.hotZones;
    if (step.includes("gin-summary")) {
      state.pageSize = "8 kB";
      state.entrySize = "varies";
      state.treeDepth = "—";
      state.rowCount = "8+";
    } else if (step.includes("gin-pending")) {
      state.pageSize = "8 kB";
      state.entrySize = "varies";
      state.treeDepth = "—";
      state.rowCount = "9";
    } else if (
      step.includes("gin-lookup-and") ||
      step.includes("gin-lookup-single")
    ) {
      state.pageSize = "8 kB";
      state.entrySize = "varies";
      state.treeDepth = "—";
      state.rowCount = "8";
    } else if (step.includes("gin-many-rows")) {
      state.pageSize = "8 kB";
      state.entrySize = "varies";
      state.treeDepth = "—";
      state.rowCount = "8";
    } else if (step.includes("gin-third-row")) {
      state.pageSize = "8 kB";
      state.entrySize = "varies";
      state.treeDepth = "—";
      state.rowCount = "3";
    } else if (step.includes("gin-second-row")) {
      state.pageSize = "8 kB";
      state.entrySize = "varies";
      state.treeDepth = "—";
      state.rowCount = "2";
    } else if (step.includes("gin-first-row")) {
      state.pageSize = "8 kB";
      state.entrySize = "varies";
      state.treeDepth = "—";
      state.rowCount = "1";
    } else {
      state.pageSize = "8 kB";
      state.entrySize = "varies";
      state.treeDepth = "—";
      state.rowCount = "0";
    }
  },

  expandToken() {
    return null;
  },

  getFlowBeats() {
    return [];
  },

  buildTopology: buildGinTopology,

  getStatBadges(state: StructuresState) {
    return [
      { label: "Page Size", value: state.pageSize, color: accent },
      { label: "Entry Size", value: state.entrySize, color: accent },
      { label: "Depth", value: state.treeDepth, color: accent },
      { label: "Row Count", value: state.rowCount, color: accent },
    ];
  },

  getTableData: getGinTableData,

  softReset(state: StructuresState) {
    state.pageSize = "8 kB";
    state.entrySize = "varies";
    state.treeDepth = "—";
    state.rowCount = "0";
  },
};
